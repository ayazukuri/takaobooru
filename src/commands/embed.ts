import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandFunction } from "../interfaces";

export const data = new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Create an embed.")
    .addStringOption((option) =>
        option.setName("embed")
            .setDescription("Embed JSON object.")
            .setRequired(true)
    )
    .setDefaultPermission(false);
export const handler: CommandFunction = (context, xGuild) => async (interaction) => {
    let emJson;
    try {
        emJson = JSON.parse(interaction.options.getString("embed", true));
    } catch (e) {
        interaction.reply({ content: "JSON invalid.", ephemeral: true });
        return;
    }
    await interaction.channel?.send({ embeds: emJson instanceof Array ? emJson : [emJson] });
    interaction.reply({ content: "Success!", ephemeral: true });
};
