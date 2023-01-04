import * as http from "http";
import { UrlUtils } from "../utils/urlutils";
import { Config } from "../config/config";

import compression from "compression";
import { CustomIncomingMessage } from "common";

export declare type middlewareFunc = (request: CustomIncomingMessage, response: http.ServerResponse) => void;

export function cors(request: CustomIncomingMessage, response: http.ServerResponse) {
    const config = Config.getInstance();

    if (config.parameters.http?.cors) {
        if (config.parameters.http.cors.allowHeaders) {
            response.setHeader("Access-Control-Allow-Headers", config.parameters.http.cors.allowHeaders.join(","));
        }
        if (config.parameters.http.cors.exposeHeaders) {
            response.setHeader("Access-Control-Expose-Headers", config.parameters.http.cors.exposeHeaders.join(","));
        }
        if (config.parameters.http.cors.allowMethods) {
            response.setHeader("Access-Control-Allow-Methods", config.parameters.http.cors.allowMethods.join(","));
        }
        if (config.parameters.http.cors.allowOrigin) {
            response.setHeader("Access-Control-Allow-Origin", config.parameters.http.cors.allowOrigin.join(","));
        }
    }
}

export function caching(request: CustomIncomingMessage, response: http.ServerResponse) {
    const config = Config.getInstance();

    if (config.parameters.http?.cache?.playlist && UrlUtils.isPlaylist(request.customParsedUrl.pathname)) {
        if (config.parameters.http?.cache?.playlist.expiresIn) {
            if (config.parameters.http?.cache?.playlist.expiresIn > 0) {
                response.setHeader("Cache-Control", `public, max-age=${config.parameters.http?.cache?.playlist.expiresIn}`);
            } else {
                response.setHeader("Cache-Control", "no-cache");
            }
        }
        if (config.parameters.http?.cache?.playlist.lastModified) {
            response.setHeader("Last-Modified", config.parameters.http?.cache?.playlist.lastModified);
        }
    }

    if (config.parameters.http?.cache?.segments  && UrlUtils.isSegment(request.customParsedUrl.pathname)) {
        if (config.parameters.http?.cache?.segments.expiresIn) {
            if (config.parameters.http?.cache?.segments.expiresIn > 0) {
                response.setHeader("Cache-Control", `public, max-age=${config.parameters.http?.cache?.segments.expiresIn}`);
            } else {
                response.setHeader("Cache-Control", "no-cache");
            }
        }
        if (config.parameters.http?.cache?.segments.lastModified) {
            response.setHeader("Last-Modified", config.parameters.http?.cache?.segments.lastModified);
        }
    }
}

export function gzip(request: CustomIncomingMessage, response: http.ServerResponse) {
    const config = Config.getInstance();
    
    if (UrlUtils.isPlaylist(request.customParsedUrl.pathname)) {
        const noop = function() { 
            // do nothing
        };
        const useDefaultOptions: compression.CompressionOptions = { 
            filter: function (req, next) { return true; }
        };
        compression(useDefaultOptions)(request as any, response as any, noop);
    }
}