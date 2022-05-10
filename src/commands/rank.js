const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { XMember } = require('../classes/XHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('View experience and level information.')
        .addUserOption((option) =>
            option.setName('user')
                .setDescription('User to view.')
        ),
    /* eslint-disable-next-line valid-jsdoc */
    /**
     * Command handler.
     * @param {Client} client Discord client.
     * @param {import('../classes/XHelper').XGuild} guild XGuild.
     * @return {function(import('discord.js').CommandInteraction): Promise<void>}
     */
    handler: (client, guild) => async (interaction) => {
        if (guild === undefined) {
            interaction.reply({ content: 'This guild is not configured yet!', ephemeral: true });
            return;
        }
        const user = interaction.options.getUser('user') || interaction.user;
        const id = user.id;
        const member = guild.members.get(id);
        if (member === undefined) {
            interaction.reply({ content: 'I don\'t seem to have anything on file for you! Keep talking and check back later!~', ephemeral: true });
            return;
        }
        const level = member.getLevel();
        const nextReward = guild.getNextReward(level);
        const ch = guild.channels.get(interaction.channelId);
        const allowCommands = !!(ch?.allowCommands);
        const currXp = member.xp - XMember.formula(level);
        const needXp = XMember.formula(level + 1) - XMember.formula(level);
        // TODO: Redo ranking!
        const ranking = '?';
        const embed = new MessageEmbed();
        embed
            .setAuthor({
                name: user.tag,
                iconURL: user.displayAvatarURL()
            })
            .setColor(client.config.defaultColour)
            .addField('Level', level.toLocaleString(), true)
            .addField('XP', `${currXp.toLocaleString()} / ${needXp.toLocaleString()}`, true)
            .addField('Progress', Math.floor((currXp/needXp) * 100) + '%', true)
            .addField('Next Reward', nextReward !== Infinity ? `Level \`${nextReward.toLocaleString()}\`` : '`None`', true)
            .addField('Rank', '#' + ranking.toLocaleString(), true)
            .addField('Total XP', member.xp.toLocaleString(), true)
            .setFooter({ text: `Rank info (${id})` });
        await interaction.reply({ embeds: [embed], ephemeral: !allowCommands });
    }
};
