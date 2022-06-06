import { ButtonFunction } from "../interfaces";

export const handler: ButtonFunction = (context, xGuild) => async (interaction, roleId) => {
    if (interaction.member.roles.cache.has(roleId)) {
        await interaction.member.roles.remove(roleId);
        await interaction.reply({ content: "Role removed!", ephemeral: true });
    } else {
        await interaction.member.roles.add(roleId);
        await interaction.reply({ content: "Role added!", ephemeral: true });
    }
};
