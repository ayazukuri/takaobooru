import { XGuild, XMember } from "./classes";
import { CommandInteraction, Client } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { MongoClient } from "mongodb";

export type HandlerFunction = (context: Context, guild: XGuild) => (interaction: CommandInteraction) => Promise<void>;

export interface Command {
    data: SlashCommandBuilder;
    handler: HandlerFunction;
}

export interface Config {
    mongo: {
        user?: string;
        pass?: string;
        hostname: string;
        port?: number;
        options?: string;
    };
    owner: string;
    token: string;
    clientId: string;
    defaultColour: string;
}

export interface Context {
    client: Client;
    mgclient: MongoClient;
    memQ: Set<XMember>;
    startTime: number;
    config: Config;
}

export interface XGuildDoc {
    _id: string;
    logChannel?: string;
    roles: {
        id: string;
        level?: number;
        multiplier?: number;
    }[];
    channels: {
        id: string;
        multiplier?: number;
        allowCommands?: boolean;
    }[];
}

export interface XMemberDoc {
    _id: {
        id: string;
        guildId: string;
    };
    xp: number;
}
