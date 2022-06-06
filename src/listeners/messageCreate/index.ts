import { Message } from "discord.js";
import { ListenerFunction } from "../../interfaces";

import { exec as execActivity } from "./activity";
import { exec as execModerated } from "./moderated";

export const handler: ListenerFunction = (context) => async (message: Message) => {
    if (message.author.bot) return;
    if (!message.inGuild()) return;
    if (!message.member) return;
    const xGuild = context.xGuilds.get(message.guildId);
    if (!xGuild) return;

    if (xGuild.channels.get(message.channelId)?.moderatedPosts) {
        await execModerated(context, xGuild)(message);
    } else {
        await execActivity(context, xGuild)(message);
    }
};
