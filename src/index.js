/** @module index */

const { Client, Intents } = require('discord.js');
const { MongoClient } = require('mongodb');
const { readFileSync, readdirSync } = require('fs');
const { join } = require('path');
const { XGuild, XMember } = require('./classes/XHelper');

const config = require('../config.json');
const mgclient = new MongoClient((({ user, pass, hostname, port, options }) => {
    const cos = ['mongodb://'];
    if (user) cos.push(user);
    if (pass) cos.push(':' + pass + '@');
    cos.push(hostname);
    if (port) cos.push(':' + port);
    if (options) cos.push('/?' + new URLSearchParams(options).toString());
    return cos.join('');
})(config.mongo));
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
/** @type {Set<XMember>} */
const memQ = new Set();

const commands = new Map();
for (const file of readdirSync(join(__dirname, 'commands'))) {
    const command = require(join(__dirname, 'commands', file));
    commands.set(command.data.name, command.handler);
}

/** @type {Map<string, XGuild>} */
const guilds = new Map();
const cooldown = new Map();

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const guild = guilds.get(message.guildId);
    if (guild === undefined) return;
    const ch = guild.channels.get(message.channelId);
    const multiplier = ch?.multiplier || 1;
    if (multiplier === 0) return;
    if ((cooldown.get(message.author.id) || 0) > new Date().getTime() / 1000) return;
    cooldown.set(message.author.id, parseInt(new Date().getTime() / 1000 + 60));
    let member = guild.members.get(message.author.id);
    if (member === undefined) {
        member = new XMember({
            _id: {
                id: message.author.id,
                guildId: message.guildId
            },
            xp: 0
        });
        guild.members.set(message.author.id, member);
    }
    // Value between 10 and 50.
    const up = Math.floor(Math.random() * 41) + 10;
    const [oldLevel, newLevel] = member.modifyXp(up * multiplier);
    memQ.add(member);
    if (up === 50) message.react('🍪');
    if (oldLevel === newLevel) return;
    const roleIds = guild.getRewardsFor(newLevel);
    message.member.roles.add(roleIds);
});

client.on('interactionCreate', (interaction) => {
    if (interaction.isCommand() && guilds.has(interaction.guildId)) {
        commands.get(interaction.commandName)(client, guilds.get(interaction.guildId))(interaction);
    }
});

(async () => {
    console.log(readFileSync(join(__dirname, '..', 'titlecard.txt')).toString('utf8'));
    console.log('Preparing cache...');
    await mgclient.connect();
    const db = mgclient.db('takao');
    for await (const doc of db.collection('guilds').find()) {
        const memberDocs = await (await db.collection('members').find({ '_id.guildId': doc._id })).toArray();
        guilds.set(doc._id, new XGuild(doc, memberDocs));
    }
    setInterval(async () => {
        const amount = memQ.size;
        if (amount === 0) return;
        await db.collection('members').bulkWrite(Array.from(memQ.values()).map((mem) => ({ replaceOne: { filter: { _id: mem._id }, replacement: mem.toDoc(), upsert: true } })));
        memQ.clear();
        console.log('Wrote ' + amount + ' to database.');
    }, 300000);
    console.log('Done.');
    console.log('Connecting to Discord...');
    await client.login(config.token);
    console.log('Connection established.');
})();
