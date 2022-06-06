import { Message, MessageActionRow, MessageButton, MessageEmbed, ColorResolvable } from "discord.js";
import { XGuild } from "../../classes";
import { Context, CPostDoc } from "../../interfaces";
import { getPending } from "../../util";

function resclass(height: number, width: number): string {
    if (height >= 2400 || width >= 3200) return "absurd";
    else if (height >= 1200 || width >= 1600) return "high";
    else if (height > 500 || width > 500) return "medium";
    return "low";
}

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

export const exec = (context: Context, xGuild: XGuild) => async (message: Message) => {
    if (message.attachments.size === 0 && message.embeds.length === 0) {
        await message.delete();
        return;
    }
    const cnt = message.content.length <= 100 ? message.content : message.content.substring(0, 100) + "...";
    const embeds = [];
    for (const emg of message.embeds) {
        const { thumbnail } = emg;
        if (!thumbnail) continue;
        const em = new MessageEmbed()
            .setColor(<ColorResolvable> context.config.defaultColour)
            .setImage(thumbnail.url);
        if (thumbnail.height) em.setFooter({ text: `${thumbnail.height}x${thumbnail.width} (${resclass(thumbnail.height, thumbnail.width!)})` });
        embeds.push(em);
    }
    for (const att of Array.from(message.attachments.values())) {
        const { url, height, width } = att;
        const em = new MessageEmbed()
            .setColor(<ColorResolvable> context.config.defaultColour)
            .setImage(url);
        if (height) em.setFooter({ text: `${height}x${width} (${resclass(height, width!)})` });
        embeds.push(em);
    }
    if (embeds.length > 10) {
        await message.delete();
        return;
    }
    let cpost: CPostDoc;
    const xMember = xGuild.getMember(message.author.id);
    if (Array.from(xGuild.roles.values()).filter((role) => message.member!.roles.cache.has(role.id)).find((role) => role.curator)) {
        const logch = await message.guild!.channels.fetch(xGuild.logChannel);
        if (!logch || !logch.isText()) return;
        await xMember.modifyXp(100 * embeds.length, {
            guild: message.guild!,
            member: message.member!
        });
        const appMsg = await logch.send({
            embeds: [{
                title: "⭐ Curated",
                description: "By <@" + message.author.id + ">",
                timestamp: new Date(),
                color: <ColorResolvable>context.config.defaultColour
            }]
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
        const modch = await message.guild!.channels.fetch(xGuild.approveChannel);
        if (!modch || !modch.isText()) return;
        const appMsg = await modch.send({
            content: `⌛ PENDING: ${message.author.tag} posted in <#${message.channel.id}>:${cnt.length > 0 ? "\n" + cnt : ""}`,
            embeds,
            components: [approveRow]
        });
        const pending = await getPending(context.db, message.author.id);
        if (xMember.uploadLimit > pending && xMember.uploadLimit <= pending + embeds.length) {
            message.member!.roles.add(xGuild.limitedRole);
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
    await context.db.collection("cpost").insertOne(<Document> <unknown> cpost);
};
