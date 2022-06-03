import { Client, Intents, MessageActionRow, MessageButton, MessageEmbed, TextChannel, ColorResolvable } from "discord.js";
import { MongoClient, Document } from "mongodb";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { XGuild, XMember } from "./classes";
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

const row = new MessageActionRow()
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
    }, 300000);

    const commands: Map<string, HandlerFunction> = new Map();
    for (const file of readdirSync(join(__dirname, "commands"))) {
        if (!file.endsWith(".js")) continue;
        const imp = await import(join(__dirname, "commands", file));
        const command: Command = imp.default;
        commands.set(command.data.name, command.handler);
    }

    client.on("messageCreate", async (message) => {
        if (message.author.bot) return;
        const guild = guilds.get(message.guildId as string);
        if (guild === undefined) return;
        const moderated = guild.channels.get(message.channelId)?.moderatedPosts || false;

        // Channel content uses approval process.
        if (moderated) {
            const modch = client.channels.cache.get(guild.approveChannel as string) as TextChannel;
            if (modch === undefined) return;
            const cnt = message.content.length <= 100 ? message.content : message.content.substring(0, 100) + "...";
            const attachments = Array.from(message.attachments.values());
            const appMsg = await modch.send({
                content: `${message.author.tag} posted in <#${(message.channel as TextChannel).id}>:${cnt.length > 0 ? "\n" + cnt : ""}`,
                embeds: attachments.map(({ url, height, width, size }) =>
                    new MessageEmbed()
                        .setColor(context.config.defaultColour as ColorResolvable)
                        .setFooter({ text: `${(size / 1000000).toFixed(1)}MB` + (height ? `  ${height}x${width}` : "") })
                        .setImage(url)
                ),
                components: [row]
            });
            const cpost: CPostDoc = {
                _id: {
                    message_id: message.id,
                    author_id: message.author.id,
                    channel_id: message.channelId,
                    approval_id: appMsg.id
                },
                count: attachments.length,
                time: new Date().getTime()
            };
            await db.collection("cpost").insertOne(cpost as Document);
            return;
        }

        // Regular message XP.
        if ((cooldown.get(message.author.id) ?? 0) > new Date().getTime() / 1000) return;
        const multiplier = guild.multiplier(message.channelId, Array.from(message.member!.roles.cache.keys()));
        if (multiplier === 0) return;
        cooldown.set(message.author.id, Math.floor(new Date().getTime() / 1000 + 60));
        let member = guild.members.get(message.author.id);
        if (member === undefined) {
            member = new XMember({
                _id: {
                    id: message.author.id,
                    guildId: message.guildId!
                },
                xp: 0,
                uploadLimit: 10,
                uploads: 0,
                deletions: 0
            });
            guild.members.set(message.author.id, member);
        }
        // Value between 10 and 50.
        const up = Math.floor(Math.random() * 41) + 10;
        const [oldLevel, newLevel] = member.modifyXp(up * multiplier);
        context.memQ.add(member);
        if (up === 50) message.react("🍪");
        if (oldLevel === newLevel) return;
        const roleIds = guild.getRewardsFor(newLevel);
        if (!message.member!.roles.cache.hasAll(...roleIds)) message.member!.roles.add(roleIds);
    });

    client.on("interactionCreate", (interaction) => {
        if (interaction.isCommand() && interaction.inGuild()) {
            const guild = guilds.get(interaction.guildId);
            if (guild === undefined) {
                interaction.reply({ content: "This guild has not been configured yet." });
                return;
            }
            if (!commands.has(interaction.commandName)) {
                return;
            }
            commands.get(interaction.commandName)!(context, guild)(interaction);
        } else if (interaction.isButton()) {
        }
    });

    console.log("Done.");
    console.log("Connecting to Discord...");
    await client.login(config.token);
    console.log("Connection established.");
}

main().catch(console.error);
