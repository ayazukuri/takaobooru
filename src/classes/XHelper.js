/**
 * Helper class for handling guild members.
 */
class XMember {
    /**
     * Formula (level) => total XP needed.
     * @param {number} x
     * @return {number}
     */
    static formula(x) {
        return 100 * x ** 2;
    }

    /**
     * Inverse of formula.
     * @param {number} x
     * @return {number}
     */
    static inverseFormula(x) {
        return Math.sqrt(x) / 10;
    }

    /**
     * @param {{ _id: { id: string, guildId: string }, xp: number }} member MongoDB member document.
     */
    constructor({ _id, xp }) {
        /** @type {{ id: string, guildId: string }} */
        this._id = _id;
        /** @type {string} */
        this.id = _id.id;
        /** @type {string} */
        this.guildId = _id.guildId;
        /** @type {number} */
        this.xp = xp;
    }

    /**
     * Modify XP of this member.
     * @param {number} xp XP to add (negative numbers allowed).
     * @return {[number, number]} Whether level was affected.
     */
    modifyXp(xp) {
        const old = this.getLevel();
        this.xp += xp;
        return [old, this.getLevel()];
    }

    /**
     * Returns level of this store.
     * @return {number} Level.
     */
    getLevel() {
        return Math.floor(XMember.inverseFormula(this.xp));
    }

    /**
     * Convert this member into a MongoDB document.
     * @return {object}
     */
    toDoc() {
        return {
            _id: this._id,
            xp: this.xp
        };
    }
}

/**
 * Helper class for handling guilds.
 */
class XGuild {
    /**
     * @param {{ _id: string, logChannel: string, roles: { id: string, level: ?number, multiplier: ?number }[], channels: { id: string, multiplier: number, allowCommands: boolean }[] }} doc MongoDB guild document.
     * @param {import('mongodb').WithId<Document>[]} memberDocs Member documents for this guild.
     */
    constructor({ _id, logChannel, roles = [], channels = [] }, memberDocs) {
        /** @type {string} */
        this.id = _id;
        /** @type {?string} */
        this.logChannel = logChannel;
        /** @type {Map<string, { id: string, level: ?number, multiplier: ?number }>} */
        this.roles = new Map();
        /** @type {Map<string, { id: string, multiplier: ?number, allowCommands: ?boolean }>} */
        this.channels = new Map();
        /** @type {Map<string, XMember>} */
        this.members = new Map();
        channels.forEach((ch) => this.channels.set(ch.id, ch));
        roles.forEach((r) => this.roles.set(r.id, r));
        memberDocs.forEach((m) => this.members.set(m._id.id, new XMember(m)));
    }

    /**
     * Calculates all applicable multipliers given by roles and channels
     * @param {string} channelId ID of the channel this was posted in.
     * @param {string[]} roles Role IDs.
     * @return {number} Calculated multiplier.
     */
    multiplier(channelId, roles) {
        const ch = this.channels.get(channelId);
        const chm = ch?.multiplier ?? 1;
        const rm = Array.from(this.roles.values()).filter(({ id }) => roles.includes(id)).reduce((prev, { multiplier }) => (multiplier ?? 1) * prev, 1);
        return chm * rm;
    }

    /**
     * Calculates all roles available to a member.
     * @param {number} newLevel New level of a member.
     * @return {string[]} All role IDs of roles this member is eligible for.
     */
    getRewardsFor(newLevel) {
        return Array.from(this.roles.values()).filter(({ level }) => (level ?? Infinity) <= newLevel).map(({ id }) => id);
    }

    /**
     * Calculates the next reward's level.
     * @param {number} currLevel Current level of a member.
     * @return {number} Level at which the member is eligible for a new reward.
     */
    getNextReward(currLevel) {
        return Math.min(...Array.from(this.roles.values()).map(({ level }) => level ?? -1).filter((l) => l > currLevel));
    }

    /**
     * Calculates the rank of the specified member.
     * @param {string} id Member id.
     * @return {number} Rank.
     */
    calculateRank(id) {
        const m = this.members.get(id);
        return Array.from(this.members.values()).sort((m1, m2) => m2.xp - m1.xp).indexOf(m) + 1;
    }

    /**
     * Convert this guild into a MongoDB document.
     * @return {object}
     */
    toDoc() {
        return {
            _id: this.id,
            logChannel: this.logChannel,
            roles: Array.from(this.roles.values()),
            channels: Array.from(this.channels.values())
        };
    }
}

module.exports = {
    XMember,
    XGuild
};
