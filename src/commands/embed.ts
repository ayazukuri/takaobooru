import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageActionRow, MessageButton } from "discord.js";
import { CommandFunction } from "../interfaces";

export const data = new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Create an embed.")
    .addStringOption((option) =>
        option.setName("embed")
            .setDescription("Embed JSON object.")
            .setRequired(true)
    )
    .addRoleOption((option) =>
        option.setName("role")
            .setDescription("Role button.")
    )
    .setDefaultPermission(false);
export const handler: CommandFunction = (context, guild) => async (interaction) => {
    const roleopt = interaction.options.getRole("role");
    let emJson;
    try {
        emJson = JSON.parse(interaction.options.getString("embed", true));
    } catch (e) {
        interaction.reply({ content: "JSON invalid.", ephemeral: true });
        return;
    }
    if (roleopt) {
        const row = new MessageActionRow()
            .addComponents(new MessageButton()
                .setCustomId("role:" + roleopt.id)
                .setLabel(roleopt.name)
                .setStyle("PRIMARY")
            );
        await interaction.channel?.send({ embeds: emJson instanceof Array ? emJson : [emJson], components: [row] });
    } else {
        await interaction.channel?.send({ embeds: emJson instanceof Array ? emJson : [emJson] });
    }
    interaction.reply({ content: "Success!", ephemeral: true });
};
