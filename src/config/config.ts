import * as fs from "fs";
import logger from "../utils/logger";


interface HlsMuxerParameters {
    segmentLength: number;
    extractAudio?: boolean;
    absoluteBaseUrl?: string;
    absoluteIndexUrls?: boolean;
    absoluteSegmentUrls?: boolean;
}

export interface ApplicationParameters {
    originPath: string,
    hlsMuxer?: HlsMuxerParameters;
}

export interface ConfigParameters {
    http: {
        port: number;
        cors?: {
            allowHeaders?: string[];
            exposeHeaders?: string[];
            allowMethods?: string[];
            allowOrigin?: string[];
        },
        gzip?: boolean,
        cache?: {
            playlist: {
                expiresIn?: number;
                lastModified?: string;
            },
            segments: {
                expiresIn?: number;
                lastModified?: string;
            }
        }
    },
    parser: {
        cacheTTL: number;
        initialReadSize: number;
        maxBufferSize: number;
    },
    applications: { [id: string]: ApplicationParameters; },
    hlsMuxer: HlsMuxerParameters,
    debug: boolean;
}

const DEFAULT_CONFIG = {
    http: {
        port: 8080
    },
    hlsMuxer: {
        segmentLength: 10000
    },
    parser: {
        cacheTTL: 86400,
        initialReadSize: 1024 * 200, // 200 KB
        maxBufferSize: 1024 * 16 * 1024 // 16 MB 
    },
    applications: {
        hls: {
            originPath: "./media",
            hlsMuxer: {
                segmentLength: 10000
            }
        }
    },
    debug: false
};


export class Config {
    private static _instance: Config;

    public parameters: ConfigParameters = DEFAULT_CONFIG;

    private constructor() {
        // private constructor. Do nothing
    }

    static getInstance() {
        if (this._instance) {
            return this._instance;
        }

        this._instance = new Config();
        return this._instance;
    }

    public load(path: string) {
        const data = fs.readFileSync(path, "utf8");
        this.parameters = { ...this.parameters, ...JSON.parse(data) };

        for (const appId in this.parameters.applications) {
            this.parameters.applications[appId].hlsMuxer = {...this.parameters.hlsMuxer, ...this.parameters.applications[appId].hlsMuxer};
        }
    }

    public print() {
        logger.info(JSON.stringify(this.parameters));
    }
}