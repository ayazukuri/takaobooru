import { Client, Intents } from "discord.js";
import { MongoClient } from "mongodb";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { XGuild } from "./classes";
import { Context, Config, Command, XGuildDoc, Button } from "./interfaces";
import * as listeners from "./listeners";

const config: Config = JSON.parse(readFileSync(join(__dirname, "../config.json")).toString("utf8"));
const client = new Client({ intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_BANS,
    Intents.FLAGS.GUILD_INVITES,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    // Intents.FLAGS.DIRECT_MESSAGES,
    // Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
] });

async function main(): Promise<void> {
    let mgclient: MongoClient;
    {
        const { user, pass, hostname, port, options } = config.mongo;
        const cos = ["mongodb://"];
        if (user) cos.push(user);
        if (pass) cos.push(":" + pass + "@");
        cos.push(hostname);
        if (port) cos.push(":" + port);
        if (options) cos.push("/?" + new URLSearchParams(options).toString());
        mgclient = new MongoClient(cos.join(""));
    }

    console.log(readFileSync(join(__dirname, "..", "titlecard.txt")).toString("utf8"));
    console.log("Preparing cache...");
    await mgclient.connect();
    const db = mgclient.db("takao");

    const context: Context = {
        client,
        db,
        xGuilds: new Map(),
        startTime: new Date().getTime(),
        handlers: {
            commands: new Map(),
            buttons: new Map()
        },
        config
    };

    for await (const doc of db.collection<XGuildDoc>("guilds").find()) {
        context.xGuilds.set(doc._id, new XGuild(doc));
    }
    let d = new Date().getDay();
    setInterval(() => {
        const dn = new Date().getDay();
        if (d != dn) {
            d = dn;
            context.xGuilds.forEach((v, k) => v.welcomeCount = 0);
        }
    }, 300000);

    for (const file of readdirSync(join(__dirname, "commands"))) {
        if (!file.endsWith(".js")) continue;
        const command: Command = await import(join(__dirname, "commands", file));
        context.handlers.commands.set(command.data.name, command.handler);
    }

    for (const file of readdirSync(join(__dirname, "buttons"))) {
        if (!file.endsWith(".js")) continue;
        const name = file.split(".").slice(0, -1).join(".");
        const button: Button = await import(join(__dirname, "buttons", file));
        context.handlers.buttons.set(name, button.handler);
    }

    client.on("interactionCreate", listeners.interaction(context));
    client.on("guildMemberAdd", listeners.guildMemberAdd(context));

    console.log("Done.");
    console.log("Connecting to Discord...");
    await client.login(config.token);
    console.log("Connection established.");
}

main().catch(console.error);
