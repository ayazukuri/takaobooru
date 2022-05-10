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
     * @param {{ _id: string, id: string, guildId: string, xp: number }} member MongoDB member document.
     */
    constructor({ _id, id, guildId, xp }) {
        /** @type {string} */
        this._id = _id;
        /** @type {string} */
        this.id = id;
        /** @type {string} */
        this.guildId = guildId;
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
            id: this.id,
            guildId: this.guildId,
            xp: this.xp
        };
    }
}

/**
 * Helper class for handling guilds.
 */
class XGuild {
    /* eslint-disable-next-line valid-jsdoc */
    /**
     * @param {{ _id: string, logChannel: string, rewards: { id: string, level: number }[], channels: { id: string, multiplier: number, allowCommands: boolean }[] }} doc MongoDB guild document.
     * @param {import('mongodb').WithId<Document>[]} memberDocs Member documents for this guild.
     */
    constructor({ _id, logChannel, rewards, channels }, memberDocs) {
        /** @type {string} */
        this.id = _id;
        /** @type {string} */
        this.logChannel = logChannel;
        /** @type {{ id: string, level: number }[]} */
        this.rewards = rewards;
        /** @type {Map<string, { id: string, multiplier: number, allowCommands: boolean }>} */
        this.channels = new Map();
        this.members = new Map();
        channels.forEach((ch) => this.channels.set(ch.id, ch));
        memberDocs.forEach((m) => this.members.set(m.id, new XMember(m)));
    }

    /**
     * Calculates all roles available to a member.
     * @param {number} newLevel New level of a member.
     * @return {string[]} All role IDs of roles this member is eligible for.
     */
    getRewardsFor(newLevel) {
        return this.rewards.filter(({ level }) => level <= newLevel).map(({ id }) => id);
    }

    /**
     * Calculates the next reward's level.
     * @param {number} currLevel Current level of a member.
     * @return {number} Level at which the member is eligible for a new reward.
     */
    getNextReward(currLevel) {
        return Math.min(...this.rewards.map(({ level }) => level).filter((l) => l > currLevel));
    }

    /**
     * Convert this guild into a MongoDB document.
     * @return {object}
     */
    toDoc() {
        return {
            _id: this.id,
            logChannel: this.logChannel,
            rewards: this.rewards,
            channels: this.channels
        };
    }
}

module.exports = {
    XMember,
    XGuild
};
