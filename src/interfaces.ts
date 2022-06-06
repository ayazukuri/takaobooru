import { XGuild, XMember } from "./classes";
import { CommandInteraction, ButtonInteraction, Client } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { Db } from "mongodb";

export type CommandFunction = (context: Context, guild: XGuild) => (interaction: CommandInteraction<"cached">) => Promise<void>;
export type ButtonFunction = (context: Context, guild: XGuild) => (interaction: ButtonInteraction<"cached">, ...args: string[]) => Promise<void>;
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
    memQ: Set<XMember>;
    activityCooldown: Map<string, number>;
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
    approveChannel: string;
    limitedRole: string;
    roles: {
        id: string;
        level?: number;
        multiplier?: number;
        curator?: boolean;
        staff?: boolean;
    }[];
    channels: {
        id: string;
        multiplier?: number;
        allowCommands?: boolean;
        moderatedPosts?: boolean;
    }[];
}

export interface XMemberDoc {
    _id: {
        id: string;
        guildId: string;
    };
    xp: number;
    uploadLimit?: number;
}

// 0: PENDING, 1: APPROVED, 2: DELETED/PENDING, 3: DELETED, 4: FLAGGED/PENDING
type PostStatus = 0 | 1 | 2 | 3;

export interface CPostDoc {
    _id: {
        messageId: string;
        approvalId: string;
        authorId: string;
        channelId: string;
    };
    count: number;
    time: number;
    status: PostStatus;
    approver?: string;
}
