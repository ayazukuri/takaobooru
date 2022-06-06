import { Message, TextChannel } from "discord.js";
import { CPostDoc, ListenerFunction } from "../interfaces";

export const handler: ListenerFunction = (context) => async (message: Message) => {
    if (message.author.bot) return;
    if (!message.inGuild()) return;
    if (!message.member) return;
    const xGuild = context.xGuilds.get(message.guildId);
    if (!xGuild) return;

    if (!xGuild.channels.get(message.channelId)?.moderatedPosts) return;
    const cpost = <CPostDoc> <unknown> await context.db.collection("cpost").findOne({ "_id.messageId": message.id });
    await (<TextChannel> await message.guild!.channels.fetch(xGuild.approveChannel)).messages.delete(cpost._id.approvalId);
    await context.db.collection("cpost").deleteOne({ "_id.messageId": message.id });
};
