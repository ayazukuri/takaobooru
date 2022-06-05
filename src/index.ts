import { Client, Intents, MessageActionRow, MessageButton, MessageEmbed, TextChannel, ColorResolvable } from "discord.js";
import { MongoClient, Document } from "mongodb";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { XGuild } from "./classes";
import { Context, HandlerFunction, Config, Command, XGuildDoc, XMemberDoc, CPostDoc } from "./interfaces";

const config: Config = JSON.parse(readFileSync(join(__dirname, "../config.json")).toString("utf8"));
const client = new Client({ intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_BANS,
    Intents.FLAGS.GUILD_INVITES,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
] });

const approveRow = new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId("approve")
            .setLabel("Approve")
            .setStyle("SUCCESS"),
        new MessageButton()
            .setCustomId("delete")
            .setLabel("Delete")
            .setStyle("DANGER")
    );

const logRowBuilder = (label: string) => new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId("flag")
            .setLabel(label)
            .setStyle("SECONDARY")
            .setDisabled(true)
    );

function resclass(height: number, width: number): string {
    if (height >= 2400 || width >= 3200) return "absurd";
    else if (height >= 1200 || width >= 1600) return "high";
    else if (height > 500 || width > 500) return "medium";
    return "low";
}

async function main(): Promise<void> {
    let mgclient: MongoClient;
    {
        const { user, pass, hostname, port, options } = config.mongo;
        const cos = ["mongodb://"];
        if (user) cos.push(user);
        if (pass) cos.push(":" + pass + "@");
        cos.push(hostname);
        if (port) cos.push(":" + port);
        if (options) cos.push("/?" + new URLSearchParams(options).toString());
        mgclient = new MongoClient(cos.join(""));
    }

    const context: Context = {
        client,
        mgclient,
        memQ: new Set(),
        startTime: new Date().getTime(),
        config
    };

    const guilds: Map<string, XGuild> = new Map();
    const cooldown: Map<string, number> = new Map();

    console.log(readFileSync(join(__dirname, "..", "titlecard.txt")).toString("utf8"));
    console.log("Preparing cache...");
    await mgclient.connect();
    const db = mgclient.db("takao");
    for await (const doc of db.collection("guilds").find()) {
        const memberDocs = await (await db.collection("members").find({ "_id.guildId": doc._id })).toArray();
        guilds.set(doc._id.toString(), new XGuild(doc as unknown as XGuildDoc, memberDocs as unknown as XMemberDoc[]));
    }
    setInterval(async () => {
        const amount = context.memQ.size;
        if (amount === 0) return;
        await db.collection("members").bulkWrite(Array.from(context.memQ.values()).map((mem) => ({ replaceOne: { filter: { _id: mem._id }, replacement: mem.toDoc(), upsert: true } })));
        context.memQ.clear();
        console.log("Wrote " + amount + " to database.");
        await db.collection("cpost").updateMany({ status: 2, time: { $lt: Math.floor(new Date().getTime() / 1000) - 172800 } }, { $set: { status: 3 } });
    }, 300000);
    const getPending = async (id: string) => (await (await db.collection("cpost").aggregate([{ $match: { "_id.authorId": id, "status": { $in: [0, 2] } } }, { $group: { "_id": "$_id.authorId", "total": { $sum: "$count" } } }]).next()))?.total || 0;

    const commands: Map<string, HandlerFunction> = new Map();
    for (const file of readdirSync(join(__dirname, "commands"))) {
        if (!file.endsWith(".js")) continue;
        const imp = await import(join(__dirname, "commands", file));
        const command: Command = imp.default;
        commands.set(command.data.name, command.handler);
    }

    client.on("messageCreate", async (message) => {
        if (message.author.bot) return;
        const guild = guilds.get(message.guildId!);
        if (guild === undefined) return;
        const moderated = guild.channels.get(message.channelId)?.moderatedPosts || false;
        const member = guild.getMember(message.author.id);

        // Channel content uses approval process.
        if (moderated) {
            if (message.attachments.size === 0 && message.embeds.length === 0) {
                await message.delete();
                return;
            }
            const modch = (await client.channels.fetch(guild.approveChannel!)) as TextChannel | null;
            if (modch === null) return;
            const cnt = message.content.length <= 100 ? message.content : message.content.substring(0, 100) + "...";
            const embeds = [];
            for (const emg of message.embeds) {
                const { thumbnail } = emg;
                if (thumbnail === null) continue;
                const em = new MessageEmbed()
                    .setColor(context.config.defaultColour as ColorResolvable)
                    .setImage(thumbnail.url);
                if (thumbnail.height) em.setFooter({ text: `${thumbnail.height}x${thumbnail.width} (${resclass(thumbnail.height, thumbnail.width!)})` });
                embeds.push(em);
            }
            for (const att of Array.from(message.attachments.values())) {
                const { url, height, width } = att;
                const em = new MessageEmbed()
                    .setColor(context.config.defaultColour as ColorResolvable)
                    .setImage(url);
                if (height) em.setFooter({ text: `${height}x${width} (${resclass(height, width!)})` });
                embeds.push(em);
            }
            if (embeds.length > 10) {
                await message.delete();
                return;
            }
            let cpost: CPostDoc;
            if (Array.from(guild.roles.values()).filter((role) => message.member?.roles.cache.has(role.id)).find((role) => role.curator)) {
                await member.modifyXp(250 * embeds.length, {
                    guild: message.guild!,
                    member: message.member!
                });
                const appMsg = await modch.send({
                    content: "."
                });
                await appMsg.edit({
                    content: "⭐ CURATED: " + new Date().toLocaleString("de") + " by <@" + message.author.id + ">",
                    components: [logRowBuilder(message.id)]
                });
                cpost = {
                    _id: {
                        messageId: message.id,
                        authorId: message.author.id,
                        channelId: message.channelId,
                        approvalId: appMsg.id
                    },
                    count: embeds.length,
                    time: Math.floor(new Date().getTime() / 1000),
                    status: 1
                };
            } else {
                const appMsg = await modch.send({
                    content: `⌛ PENDING: ${message.author.tag} posted in <#${(message.channel as TextChannel).id}>:${cnt.length > 0 ? "\n" + cnt : ""}`,
                    embeds,
                    components: [approveRow]
                });
                if (member.uploadLimit >= await getPending(message.author.id)) {
                    message.member!.roles.add(guild.limitedRole!);
                }
                cpost = {
                    _id: {
                        messageId: message.id,
                        authorId: message.author.id,
                        channelId: message.channelId,
                        approvalId: appMsg.id
                    },
                    count: embeds.length,
                    time: Math.floor(new Date().getTime() / 1000),
                    status: 0
                };
            }
            await db.collection("cpost").insertOne(cpost as Document);
        }

        // Regular message XP.
        if ((cooldown.get(message.author.id) ?? 0) > new Date().getTime() / 1000) return;
        const multiplier = guild.multiplier(message.channelId, Array.from(message.member!.roles.cache.keys()));
        if (multiplier === 0) return;
        cooldown.set(message.author.id, Math.floor(new Date().getTime() / 1000 + 60));

        // Value between 10 and 50.
        const up = Math.floor(Math.random() * 41) + 10;
        member.modifyXp(up * multiplier, {
            guild: message.guild!,
            member: message.member!
        });
        context.memQ.add(member);
        if (up === 50) message.react("🍪");
    });

    client.on("interactionCreate", async (interaction) => {
        if (!interaction.inGuild()) return;
        const guild = guilds.get(interaction.guildId);
        if (guild === undefined) {
            return;
        }
        if (interaction.isCommand()) {
            if (!commands.has(interaction.commandName)) {
                return;
            }
            commands.get(interaction.commandName)!(context, guild)(interaction);
        } else if (interaction.isButton()) {
            const cpost = await db.collection("cpost").findOne({ "_id.approvalId": interaction.message.id, "status": 0 }) as unknown as CPostDoc;
            if (cpost === null) {
                interaction.reply({ content: "Post not found!", ephemeral: true });
                return;
            }
            const member = guild.getMember(cpost._id.authorId);
            const guildMember = await interaction.guild!.members.fetch(cpost._id.authorId);
            let cnt = "";
            switch (interaction.customId) {
            case "approve":
                cnt = "✅ APPROVED";
                await db.collection("cpost").updateOne({ "_id.approvalId": interaction.message.id }, { $set: { "status": 1 } });
                member.modifyXp(250 * cpost.count, {
                    guild: interaction.guild!,
                    member: guildMember
                });
                context.memQ.add(member);
                const pending = await getPending(cpost._id.authorId);
                if (member.uploadLimit > pending && member.uploadLimit <= pending + cpost.count) {
                    await guildMember.roles.remove(guild.limitedRole!);
                }
                break;
            case "delete":
                cnt = "❌ DELETED";
                await db.collection("cpost").updateOne({ "_id.approvalId": interaction.message.id }, { $set: { "status": 2 } });
                const { messageId, channelId } = cpost._id;
                const ch = (await interaction.guild?.channels.fetch(channelId)) as TextChannel;
                await (await ch.messages.fetch(messageId)).delete();
                break;
            }
            interaction.update({ content: cnt + ": " + new Date().toLocaleString("de") + " by <@" + interaction.user.id + ">", embeds: [], components: [logRowBuilder(cpost._id.messageId)] });
        }
    });

    console.log("Done.");
    console.log("Connecting to Discord...");
    await client.login(config.token);
    console.log("Connection established.");
}

main().catch(console.error);
