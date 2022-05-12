const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { totalmem, freemem } = require('os');
const packf = require('../../package.json');

/**
 * Format a timeframe given in milliseconds.
 * @param {number} duration Duration in milliseconds.
 * @return {string} Formatted string.
 */
function msToTime(duration) {
    let seconds = Math.floor((duration / 1000) % 60);
    let minutes = Math.floor((duration / (1000 * 60)) % 60);
    let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    hours = (hours < 10) ? '0' + hours : hours;
    minutes = (minutes < 10) ? '0' + minutes : minutes;
    seconds = (seconds < 10) ? '0' + seconds : seconds;
    return hours + ':' + minutes + ':' + seconds;
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Display statistics.'),
    /* eslint-disable-next-line valid-jsdoc */
    /**
     * Command handler.
     * @param {Client} client Discord client.
     * @param {import('../classes/XHelper').XGuild} guild XGuild.
     * @return {function(import('discord.js').CommandInteraction): Promise<void>}
     */
    handler: (client, guild) => async (interaction) => {
        const embed = new MessageEmbed();
        embed
            .setColor(client.config.defaultColour)
            .addField('Version', `${packf.version}: ${packf.description}`, true)
            .addField('Cached Users', client.users.cache.size.toString(), true)
            .addField('Ping', client.ws.ping.toFixed(0) + 'ms', true)
            .addField('System Time', new Date().toLocaleTimeString(), true)
            .addField('RAM Usage', `${Math.floor((totalmem() - freemem()) / 1000000)}MB / ${Math.floor(totalmem() / 1000000)}MB`, true)
            .addField('Uptime', msToTime(new Date().getTime() - client.startTime), true)
            .setFooter({
                text: 'Takao.booru: created by ayasaku#1871 using discord.js and MongoDB'
            });
        const ch = guild.channels.get(interaction.channelId);
        const allowCommands = !!(ch?.allowCommands);
        interaction.reply({ embeds: [embed], ephemeral: !allowCommands });
    }
};
