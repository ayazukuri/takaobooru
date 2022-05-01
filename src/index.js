const { Client, Intents } = require('discord.js');
const mariadb = require('mariadb');
const { readFileSync, readdirSync } = require('fs');
const { join } = require('path');
const { XMember, XChannel, XReward } = require('./classes/XHelper');
const StoreManager = require('./classes/StoreManager');

const config = require('../config.json');

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_BANS,
        Intents.FLAGS.GUILD_INVITES,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
    ]
});
client.config = config;

const pool = mariadb.createPool(config.pool);
const mn = new StoreManager(pool);

client.ranking = new Map();
client.fetchRanking = async () => {
    client.ranking.clear();
    const con = await pool.getConnection();
    const rows = await con.query('SELECT id, guild_id, ROW_NUMBER() OVER (ORDER BY xp DESC) AS row_number FROM member');
    await con.end();
    rows.forEach((row) => client.ranking.set(row.id + '.' + row.guild_id, row.row_number));
};
client.fetchRanking();
setInterval(client.fetchRanking.bind(client), 60000);

const commands = new Map();
for (const file of readdirSync(join(__dirname, 'commands'))) {
    const command = require(join(__dirname, 'commands', file));
    commands.set(command.data.name, command.handler);
}

const channels = mn.store('channels', 10800, (con) => async (channelId) => {
    const rows = await con.query(
        'SELECT * FROM channel WHERE channel_id = ?',
        [channelId]
    );
    if (rows.length === 0) return null;
    return new XChannel(rows[0], pool);
});
const members = mn.store('members', 10800, (con) => async ([guildId, userId]) => {
    const rows = await con.query(
        'SELECT * FROM member WHERE guild_id = ? AND id = ?',
        [guildId, userId]
    );
    if (rows.length === 0) {
        await con.query(
            'INSERT INTO member (guild_id, id) VALUES (?, ?)',
            [guildId, userId]
        );
        return new XMember({
            id: userId,
            guild_id: guildId,
            xp: 0
        }, pool);
    }
    return new XMember(rows[0], pool);
});
const rewards = mn.store('rewards', 10800, (con) => async (guildId) => {
    const rows = await con.query(
        'SELECT * FROM reward WHERE guild_id = ?',
        [guildId]
    );
    return rows.map((row) => new XReward(row, pool));
});

const cooldown = new Map();

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    /** @type {number} */
    const ch = await channels.get(message.channelId);
    const multiplier = ch?.multiplier || 1;
    if (multiplier === 0) return;
    if (cooldown.get(message.author.id) || 0 > new Date().getTime() / 1000) {
        return;
    }
    cooldown.set(message.author.id, parseInt(new Date().getTime() / 1000 + 60));
    /** @type {XMember} */
    const member = await members.get([message.guildId, message.author.id]);
    // Value between 10 and 50.
    const up = Math.floor(Math.random() * 41) + 10;
    const [oldLevel, newLevel] = member.modifyXp(up * multiplier);
    if (up === 50) message.react('🍪');
    if (oldLevel === newLevel) return;
    /* eslint-disable-next-line camelcase */
    const roleIds = (await rewards.get(message.guildId)).filter(({ level }) => level <= newLevel).map(({ roleId }) => roleId);
    message.member.roles.add(roleIds);
});

client.on('interactionCreate', (interaction) => {
    if (interaction.isCommand()) {
        commands.get(interaction.commandName)(client, mn)(interaction);
    }
});

(async () => {
    console.log(readFileSync(join(__dirname, '..', 'titlecard.txt')).toString('utf8'));
    console.log('Preparing database...');
    const con = await pool.getConnection();
    await con.query(
        readFileSync(join(__dirname, 'schema.sql')).toString('utf8')
    );
    await con.end();
    console.log('Done.');
    console.log('Connecting to Discord...');
    client.login(config.token).then(() => console.log('Connection established.'));
})();
