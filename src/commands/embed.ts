import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, MessageActionRow, MessageButton } from "discord.js";
import { Context } from "../interfaces";
import { XGuild } from "../classes";

export default {
    data: new SlashCommandBuilder()
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
        .setDefaultPermission(false),
    handler: (context: Context, guild: XGuild) => async (interaction: CommandInteraction) => {
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
                    .setCustomId("role")
                    .setLabel(roleopt.name)
                    .setStyle("PRIMARY")
                );
            await interaction.channel?.send({ embeds: emJson instanceof Array ? emJson : [emJson], components: [row] });
            return;
        }
        await interaction.channel?.send({ embeds: emJson instanceof Array ? emJson : [emJson] });
    }
};
