
import { register, Registry, collectDefaultMetrics, Counter, Gauge, Histogram } from "prom-client";
import { Cache } from "../utils/cache";


export class Prometheus {
    private static _instance: Prometheus;
    
    private cache: Cache;
    private cacheHits: Counter;
    private cacheMisses: Counter;
    private cacheKeys: Counter;
    private cacheKsize: Gauge;
    private cacheVsize: Gauge;
    private httpMetric: Histogram;

    private constructor() {
        collectDefaultMetrics({
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // These are the default buckets.
        });

        this.cache = Cache.getInstance();
        this.cacheHits = new Counter({
            name: "metadata_cache_hits",
            help: "Metadata cache hits"
        });

        this.cacheMisses = new Counter({
            name: "metadata_cache_misses",
            help: "Metadata cache misses"
        });

        this.cacheKeys = new Counter({
            name: "metadata_cache_keys",
            help: "Metadata cache keys"
        });

        this.cacheKsize = new Gauge({
            name: "metadata_cache_ksize",
            help: "Metadata cache keys size"
        });

        this.cacheVsize = new Gauge({
            name: "metadata_cache_vsize",
            help: "Metadata cache values size"
        });

        const labels = ["status_code", "appId", "type"];
        this.httpMetric = new Histogram({
            name: "http_request_duration_seconds",
            help: "duration histogram of http responses",
            labelNames: labels,
            buckets: [0.001, 0.01, 0.1, 1, 2, 5]
          });
    }  
    
    public startHttpRequest(labels: any) {
        return this.httpMetric.startTimer(labels);
    }

    public register(): Registry {
        this.reset();

        const cacheStats = this.cache.stats();
        this.cacheHits.inc(cacheStats.hits);
        this.cacheMisses.inc(cacheStats.misses);
        this.cacheKeys.inc(cacheStats.keys);
        this.cacheKsize.set(cacheStats.ksize);
        this.cacheVsize.set(cacheStats.vsize);

        return register;
    }

    public reset() {
        this.cacheHits.reset();
        this.cacheMisses.reset();
        this.cacheKeys.reset();
    }

    static getInstance() {
        if (this._instance) {
            return this._instance;
        }

        this._instance = new Prometheus();
        return this._instance;
    }
}