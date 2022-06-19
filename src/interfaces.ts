import { XGuild } from "./classes";
import { CommandInteraction, ButtonInteraction, Client } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { Db } from "mongodb";

export type HandlerFunction<T> = (context: Context, guild: XGuild) => (interaction: T) => Promise<void>;
export type CommandFunction = HandlerFunction<CommandInteraction<"cached">>;
export type ButtonFunction = HandlerFunction<ButtonInteraction<"cached">>;
export type ListenerFunction = (context: Context) => (...args: any[]) => Promise<void>;

export interface Command {
    data: SlashCommandBuilder;
    handler: CommandFunction;
}

export interface Button {
    handler: ButtonFunction;
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
    db: Db;
    xGuilds: Map<string, XGuild>;
    startTime: number;
    handlers: {
        commands: Map<string, CommandFunction>;
        buttons: Map<string, ButtonFunction>;
    };
    config: Config;
}

export interface XGuildDoc {
    _id: string;
    logChannel: string;
    actionChannel: string;
    welcomeChannel: string;
}
