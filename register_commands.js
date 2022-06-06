const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { argv } = require('process');
const { readdirSync } = require('fs');
const { join } = require('path');
const { token, clientId } = require('./config.json');

const commands = [];
for (const file of readdirSync(join(__dirname, 'dist/commands'))) {
    if (!file.endsWith(".js")) continue;
    const command = require(join(__dirname, 'dist/commands', file));
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            //                                        guildId
            Routes.applicationGuildCommands(clientId, argv[2]),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
