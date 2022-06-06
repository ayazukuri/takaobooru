import { Guild, GuildMember } from "discord.js";
import { XGuildDoc, XMemberDoc } from "./interfaces";

export class XGuild {
    id: string;
    logChannel: string;
    approveChannel: string;
    limitedRole: string;
    roles: Map<string, {
        id: string;
        level?: number;
        multiplier?: number;
        curator?: boolean;
        staff?: boolean;
    }>;
    channels: Map<string, {
        id: string;
        multiplier?: number;
        allowCommands?: boolean;
        moderatedPosts?: boolean;
    }>;
    members: Map<string, XMember>;

    constructor({ _id, logChannel, approveChannel, limitedRole, roles = [], channels = [] }: XGuildDoc, memberDocs: XMemberDoc[]) {
        this.id = _id;
        this.logChannel = logChannel;
        this.approveChannel = approveChannel;
        this.limitedRole = limitedRole;
        this.roles = new Map();
        this.channels = new Map();
        this.members = new Map();
        channels.forEach((ch) => this.channels.set(ch.id, ch));
        roles.forEach((r) => this.roles.set(r.id, r));
        memberDocs.forEach((m) => this.members.set(m._id.id, new XMember(m, this)));
    }

    multiplier(channelId: string, roles: string[]): number {
        const ch = this.channels.get(channelId);
        const chm = ch?.multiplier ?? 1;
        const rm = Array.from(this.roles.values()).filter(({ id }) => roles.includes(id)).reduce((prev, { multiplier }) => (multiplier ?? 1) * prev, 1);
        return chm * rm;
    }

    getRewardsFor(newLevel: number): string[] {
        return Array.from(this.roles.values()).filter(({ level }) => (level ?? Infinity) <= newLevel).map(({ id }) => id);
    }

    getNextReward(currLevel: number): number {
        return Math.min(...Array.from(this.roles.values()).map(({ level }) => level ?? -1).filter((l) => l > currLevel));
    }

    calculateRank(id: string): number {
        const m = this.members.get(id);
        if (!m) return 0;
        return Array.from(this.members.values()).sort((m1, m2) => m2.xp - m1.xp).indexOf(m) + 1;
    }

    getMember(id: string): XMember {
        let member = this.members.get(id);
        if (!member) {
            member = new XMember({
                _id: {
                    id: id,
                    guildId: this.id
                },
                xp: 0,
                uploadLimit: 10
            }, this);
            this.members.set(id, member);
        }
        return member;
    }

    toDoc(): XGuildDoc {
        return {
            _id: this.id,
            logChannel: this.logChannel,
            approveChannel: this.approveChannel,
            limitedRole: this.limitedRole,
            roles: Array.from(this.roles.values()),
            channels: Array.from(this.channels.values())
        };
    }
}

export class XMember {
    _id: { id: string, guildId: string };
    id: string;
    guildId: string;
    xp: number;
    uploadLimit: number;
    xguild: XGuild;

    static formula(x: number): number {
        return 100 * x ** 2;
    }

    static inverseFormula(x: number): number {
        return Math.sqrt(x) / 10;
    }

    constructor({ _id, xp, uploadLimit }: XMemberDoc, xguild: XGuild) {
        this._id = _id;
        this.id = _id.id;
        this.guildId = _id.guildId;
        this.xp = xp;
        this.uploadLimit = uploadLimit || 10;
        this.xguild = xguild;
    }

    modifyXp(xp: number, { guild, member }: { guild: Guild, member: GuildMember }): void {
        const oldLevel = this.getLevel();
        this.xp += xp;
        const newLevel = this.getLevel();
        if (oldLevel === newLevel) return;
        const roleIds = this.xguild.getRewardsFor(newLevel);
        if (!member.roles.cache.hasAll(...roleIds)) member.roles.add(roleIds);
    }

    getLevel(): number {
        return Math.floor(XMember.inverseFormula(this.xp));
    }

    toDoc(): XMemberDoc {
        return {
            _id: this._id,
            xp: this.xp,
            uploadLimit: this.uploadLimit
        };
    }
}
