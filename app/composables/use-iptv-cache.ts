import type { IDBPDatabase } from "idb";

import { openDB } from "idb";

const DB_NAME = "iptv-cache";
const STORE_NAME = "cache";
const DB_VERSION = 2;
const TTL_1WEEK = 604_800_000;

type CacheEntry = {
  key: string;
  data: unknown;
  expiresAt: number;
  createdAt: number;
};

let dbInstance: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance)
    return dbInstance;
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Drop old store if it exists (schema change)
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
      store.createIndex("by-expiry", "expiresAt");
    },
  });
  return dbInstance;
}

export function useIptvCache() {
  async function get<T = unknown>(key: string): Promise<T | null> {
    try {
      const db = await getDB();
      const entry = await db.get(STORE_NAME, key) as CacheEntry | undefined;
      if (!entry)
        return null;
      if (entry.expiresAt < Date.now()) {
        await db.delete(STORE_NAME, key);
        return null;
      }
      return entry.data as T;
    }
    catch {
      return null;
    }
  }

  async function set(key: string, data: unknown, ttl: number = TTL_1WEEK): Promise<void> {
    try {
      const db = await getDB();
      const entry: CacheEntry = {
        key,
        data,
        expiresAt: Date.now() + ttl,
        createdAt: Date.now(),
      };
      await db.put(STORE_NAME, entry);
    }
    catch (e) {
      console.warn("[iptv-cache] Failed to write cache:", e);
    }
  }

  async function clearAll(): Promise<void> {
    try {
      const db = await getDB();
      await db.clear(STORE_NAME);
    }
    catch (e) {
      console.warn("[iptv-cache] Failed to clear cache:", e);
    }
  }

  async function clearExpired(): Promise<void> {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const index = tx.store.index("by-expiry");
      const keys = await index.getAllKeys(IDBKeyRange.upperBound(Date.now()));
      await Promise.all(keys.map(key => tx.store.delete(key)));
      await tx.done;
    }
    catch (e) {
      console.warn("[iptv-cache] Failed to clear expired entries:", e);
    }
  }

  async function isCacheValid(): Promise<boolean> {
    const timestamp = await get<number>("cache-timestamp");
    if (!timestamp)
      return false;
    return timestamp > Date.now();
  }

  async function markCacheValid(): Promise<void> {
    await set("cache-timestamp", Date.now() + TTL_1WEEK, TTL_1WEEK);
  }

  return {
    get,
    set,
    clearAll,
    clearExpired,
    isCacheValid,
    markCacheValid,
  };
}
