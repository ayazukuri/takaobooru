/* eslint-disable-next-line no-unused-vars */
const { Pool, PoolConnection } = require('mariadb');
const Store = require('./Store');

/**
 * Class for managing stores created by the application.
 * @property {Pool} pool Mariadb connection pool.
 * @property {Map<string, Store>} stores Stores managed by this manager.
 */
class StoreManager {
    /**
     * @param {Pool} pool Mariadb connection pool.
     */
    constructor(pool) {
        this.stores = new Map();
        this.pool = pool;
        setInterval(() => {
            for (const s of this.stores.values()) {
                if (s.maxAge !== Infinity) s.purge();
            }
        }, 300000);
    }

    /**
     * Creates a store with this manager.
     * @param {string} name Identifier.
     * @param {number} maxAge Max age of cache entries.
     * @param {function(PoolConnection): (function(...any): void)} standardCallback Standard fetch callback in case none was specified.
     * @return {Promise<Store>} Created store.
     */
    store(name, maxAge, standardCallback) {
        const s = new Store(this, maxAge, standardCallback);
        this.stores.set(name, s);
        return s;
    }

    /**
     * Creates a connection to the database.
     * @return {Promise<PoolConnection>}
     */
    connect() {
        return this.pool.getConnection();
    }
}

module.exports = StoreManager;
