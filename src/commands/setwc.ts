import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandFunction } from "../interfaces";

export const data = new SlashCommandBuilder()
    .setName("setwc")
    .setDescription("Set welcome count.")
    .addNumberOption((option) =>
        option.setName("amount")
            .setRequired(true)
    )
    .setDefaultPermission(false);
export const handler: CommandFunction = (context, xGuild) => async (interaction) => {
    const amount = interaction.options.getNumber("amount", true);
    if (amount < 0) {
        await interaction.reply({
            content: "That makes no sense!",
            ephemeral: true
        });
        return;
    }
    xGuild.welcomeCount = amount;
    await interaction.reply({
        content: "Welcome count set for this guild.",
        ephemeral: true
    });
};
