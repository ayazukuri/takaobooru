/**
 * Simple class for storing and fetching information.
 * @property {StoreManager} manager Manager of this store.
 * @property {number} maxAge Max age of cached items.
 * @property {Map} cache Cache used internally.
 * @property {Map<string, function>} methods Functions used as methods.
 * @property {function} standardCallback Standard fetch callback in case none was specified.
 */
class Store {
    /**
     * @param {StoreManager} manager Manager of this store.
     * @param {number} maxAge Max age of cached items.
     * @param {function} standardCallback Standard fetch callback in case none was specified.
     */
    constructor(manager, maxAge, standardCallback) {
        this.manager = manager;
        this.maxAge = maxAge;
        this.standardCallback = standardCallback;
        this.cache = new Map();
    }

    /**
     * Gets a value from cache or fetches it if needed.
     * @param {string|string[]} key Identifier.
     * @param {function?} cb Callback for fetching data if cache fails.
     * @return {Promise<any>} Saved value.
     */
    async get(key, cb = this.standardCallback) {
        const k = typeof key === 'string' ? key : key.join('&');
        if (this.cache.has(k)) {
            return this.cache.get(k).data;
        }
        const con = await this.manager.connect();
        const r = await cb(con)(key);
        con.end();
        this.cache.set(k, {
            data: r,
            expiry: parseInt(new Date().getTime() / 1000 + this.maxAge)
        });
        return r;
    }

    /**
     * Updates internal cache with new value.
     * @param {string|string[]} key Identifier.
     * @param {*} value Value to insert.
     */
    async set(key, value) {
        const k = typeof key === 'string' ? key : key.join('&');
        this.cache.set(k, {
            data: value,
            expiry: parseInt(new Date().getTime() / 1000 + this.maxAge)
        });
    }

    /**
     * Resets the cache to starting conditions.
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Purges cache entries due to be deleted.
     */
    purge() {
        const time = parseInt(new Date().getTime() / 1000);
        for (const [k, { expiry }] of this.cache.entries()) {
            if (expiry < time) {
                this.cache.delete(k);
            }
        }
    }
}

module.exports = Store;
