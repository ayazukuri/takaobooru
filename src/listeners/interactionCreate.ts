import { Interaction } from "discord.js";
import { ListenerFunction } from "../interfaces";

export const handler: ListenerFunction = (context) => async (interaction: Interaction) => {
    if (!interaction.inCachedGuild()) return;
    const xGuild = context.xGuilds.get(interaction.guildId);
    if (!xGuild) return;

    if (interaction.isCommand()) {
        const fn = context.handlers.commands.get(interaction.commandName);
        if (!fn) return;
        await fn(context, xGuild)(interaction);
    } else if (interaction.isButton()) {
        const fn = context.handlers.buttons.get(interaction.customId);
        if (!fn) return;
        await fn(context, xGuild)(interaction);
    }
};
