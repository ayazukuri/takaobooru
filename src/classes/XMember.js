/* eslint-disable-next-line no-unused-vars */
const { Pool } = require('mariadb');

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

    /* eslint-disable camelcase */
    /**
     * @param {object} member Member row from database.
     * @param {Pool} pool Database connection pool.
     */
    constructor({ id, guild_id, xp }, pool) {
        this.id = id;
        this.guildId = guild_id;
        this.xp = xp;
        this.pool = pool;
    }

    /**
     * Modify XP of this member.
     * @param {number} xp XP to add (negative numbers allowed).
     * @return {boolean} Whether level was affected.
     */
    modifyXp(xp) {
        const old = this.getLevel();
        this.xp += xp;
        this.updateXp();
        return [old, this.getLevel()];
    }

    /**
     * Update database entry of this member.
     */
    async updateXp() {
        const con = await this.pool.getConnection();
        await con.query(
            'UPDATE member SET xp = ? WHERE guild_id = ? AND id = ?',
            [this.xp, this.guildId, this.id]
        );
        await con.end();
    }

    /**
     * Returns level of this store.
     * @return {number} Level.
     */
    getLevel() {
        return Math.floor(XMember.inverseFormula(this.xp));
    }
}

module.exports = XMember;
