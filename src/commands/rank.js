const { SlashCommandBuilder } = require('@discordjs/builders');
/* eslint-disable no-unused-vars */
const { MessageEmbed, Client, Interaction } = require('discord.js');
const Store = require('../classes/Store');
const StoreManager = require('../classes/StoreManager');
const { XMember, XReward } = require('../classes/XHelper');
/* eslint-enable no-unused-vars */

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('View experience and level information.')
        .addUserOption((option) =>
            option.setName('user')
                .setDescription('User to view.')
        ),
    /**
     * Command handler.
     * @param {Client} client Discord client.
     * @param {StoreManager} mn StoreManager for this application.
     * @return {function(Interaction): Promise<void>}
     */
    handler: (client, mn) => async (interaction) => {
        /** @type {Store} */
        const members = mn.stores.get('members');
        const rewards = mn.stores.get('rewards');
        const channels = mn.stores.get('channels');
        const id = interaction.options.getUser('user')?.id || interaction.user.id;
        const user = await client.users.fetch(id);
        /** @type {XMember} */
        const member = await members.get([interaction.guildId, id]);
        const level = member.getLevel();
        /** @type {XReward[]} */
        const rewardList = await rewards.get(interaction.guildId);
        const nextReward = Math.min(...rewardList.map(({ level }) => level).filter((l) => l > level));
        /** @type {XChannel?} */
        const ch = await channels.get(interaction.channelId);
        const allowCommands = !!ch?.allowCommands || false;
        const currXp = member.xp - XMember.formula(level);
        const needXp = XMember.formula(level + 1) - XMember.formula(level);
        const ranking = client.ranking.get(interaction.guildId)?.get(id)?.toString() || '?';
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
