import { Message } from "discord.js";
import { XGuild } from "../../classes";
import { Context } from "../../interfaces";

export const exec = (context: Context, xGuild: XGuild) => async (message: Message) => {
    context.activityCooldown.set(message.author.id, Math.floor(new Date().getTime() / 1000 + 60));
    if ((context.activityCooldown.get(message.author.id) ?? 0) > new Date().getTime() / 1000) return;
    const multiplier = xGuild.multiplier(message.channelId, Array.from(message.member!.roles.cache.keys()));
    if (multiplier === 0) return;

    // Value between 10 and 50.
    const up = Math.floor(Math.random() * 41) + 10;
    const xMember = xGuild.getMember(message.author.id);
    await xMember.modifyXp(up * multiplier, {
        guild: message.guild!,
        member: message.member!
    });
    context.memQ.add(xMember);
    if (up === 50) await message.react("🍪");
};
