import { ColorResolvable, GuildMember, TextChannel } from "discord.js";
import { ListenerFunction } from "../interfaces";

export const handler: ListenerFunction = (context) => async (member: GuildMember) => {
    const xGuild = context.xGuilds.get(member.guild.id);
    if (!xGuild) return;

    const ch = <TextChannel>member.guild.channels.cache.get(xGuild.welcomeChannel);
    if (!ch) return;
    const msg = await ch.send({
        content: "<:keqParty:988108293354426408> **Welcome to the server** <@" + member.user.id + "> <:keqPat:988108294579163197>\n" +
                 "<:keqSparkle:988108298307928155> Have a nice stay! | *" + xGuild.welcome() + " user(s) have been welcomed today.*"
    });
    await msg.react(context.client.emojis.cache.get("988134796297392209") ?? "🎉");
    const logc = <TextChannel>member.guild.channels.cache.get(xGuild.logChannel);
    if (!logc) return;
    logc.send({
        embeds: [{
            description: "**" + member.user.tag + "** has joined the server.",
            footer: {
                iconURL: member.user.avatarURL() ?? undefined,
                text: "User welcomed (" + xGuild.welcomeCount + " today)"
            },
            timestamp: new Date(),
            color: <ColorResolvable>context.config.defaultColour
        }]
    });
};
