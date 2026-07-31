(function() {
    'use strict';

    const DB_NAME = 'readora-store';
    const DB_VERSION = 1;
    const STORE_NAME = 'keyval';

    let dbPromise = null;

    function openDb() {
        if (dbPromise) return dbPromise;

        dbPromise = new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) {
                reject(new Error('IndexedDB is not available'));
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        return dbPromise;
    }

    async function withStore(mode, callback) {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, mode);
            const store = transaction.objectStore(STORE_NAME);
            const request = callback(store);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function get(key) {
        return withStore('readonly', store => store.get(key));
    }

    async function set(key, value) {
        return withStore('readwrite', store => store.put(value, key));
    }

    async function remove(key) {
        return withStore('readwrite', store => store.delete(key));
    }

    window.ReadoraStorage = { get, set, remove };
})();
