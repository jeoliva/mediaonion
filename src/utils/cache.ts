import logger from "../utils/logger";
import NodeCache from "node-cache";
import { Config } from "../config/config";

type Key = string | number;

export class Cache {
    private static _instance: Cache;

    private cache: NodeCache;

    private constructor() {
        const config = Config.getInstance();

        this.cache = new NodeCache({
            stdTTL: config.parameters.parser.cacheTTL,
            checkperiod: config.parameters.parser.cacheTTL * 0.4,
            useClones: false
        });

        logger.debug("Memory cache created. TTL: " + config.parameters.parser.cacheTTL);
    }

    static getInstance() {
        if (this._instance) {
            return this._instance;
        }

        this._instance = new Cache();
        return this._instance;
    }

    public get<T>(key: Key): T | undefined {
        return this.cache.get<T>(key);
    }

    public set<T>(key: Key, value: T): void {
        this.cache.set(key, value);
    }

    public del(key: Key): void {
        this.cache.del(key);
    }

    public clear(): void {
        this.cache.flushAll();
    }

    public stats(): NodeCache.Stats {
        return this.cache.getStats();
    }
}