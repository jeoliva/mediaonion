import * as http from "http";
import * as parser from "url";
import * as fs from "fs";
import { program } from "commander";
import { MediaRequestController } from "./routes/media-request-controller";
import { Cache } from "./utils/cache";
import logger from "./utils/logger";
import { Config } from "./config/config";
import { cors, caching, gzip, middlewareFunc} from "./routes/middlewares";
import { UrlUtils } from "./utils/urlutils";
import { Prometheus } from "./metrics/prometheus";
import { CustomIncomingMessage } from "common";



process.on("SIGINT", function() {
    process.exit();
});

program
  .option("-d, --debug", "Enable debug mode (traces)", false)
  .option("-f, --file <string>", "Path to config file");

program.parse();
const options = program.opts();

if (options.file) {
    logger.info(`Loading config from ${options.file}`);
} else {
    logger.info("Using default configuration");
}

const config = Config.getInstance();
if (options.file && fs.existsSync(options.file)) {
    config.load(options.file);
}
config.parameters.debug = config.parameters.debug || options.debug;
config.print();

const middlewares: middlewareFunc[] = [];
if (config.parameters.http?.cors) {
    middlewares.push(cors);
}
if (config.parameters.http?.gzip) {
    middlewares.push(gzip);
}
if (config.parameters.http?.cache) {
    middlewares.push(caching);
}

const cache = Cache.getInstance();
const metrics = Prometheus.getInstance();
const mediaRequestController = new MediaRequestController();

const server = http.createServer( async (request: CustomIncomingMessage, response: http.ServerResponse) => {
    try {
        logger.debug(`request,${request.url}`);
        const appId = request.url.split("/")[1];
        
        const labels: any = {};
        const timer = metrics.startHttpRequest(labels);
        response.on("close", () => {
            labels["status_code"] = response.statusCode;
            timer();
        });

        if (!appId || (appId !== "api" && !config.parameters.applications[appId])) {
            labels["type"] = "app_unknown";
            response.writeHead(404);
            response.end("unknown app");
            return;
        }
        request.customAppId = appId;
        request.customApp = config.parameters.applications[appId];
        request.customUrl = request.url.substring(appId.length + 1);        
        request.customParsedUrl = parser.parse(request.customUrl, true);
        
        for (const m of middlewares) {
            m(request, response);
        }

        if (request.method === "GET") {
            labels["type"] = "api";

            // API
            if (appId === "api") {
                if (request.customParsedUrl.pathname === "/cache/invalidate") {
                    if (request.customParsedUrl.query) {
                        if (request.customParsedUrl.query["key"]) {
                            cache.del(request.customParsedUrl.query["key"] as string);
                        }
                        response.end();
                    } else {
                        cache.clear();
                        response.end();
                    }
                } else if (request.customParsedUrl.pathname === "/cache/stats") {
                    const stats = cache.stats();
                    response.writeHead(200, {"Content-Type": "application/json"});
                    response.end(JSON.stringify(stats));
                } else if (request.customParsedUrl.pathname === "/metrics") {
                    // prometheus
                    response.writeHead(200, {"Content-Type": metrics.register().contentType});
                    response.end(await metrics.register().metrics()); 
                } else {
                    response.writeHead(404);
                    response.end();
                }
            } else { // HLS app
                if (config.parameters.applications[appId])
                if (UrlUtils.isMasterPlaylist(request.customParsedUrl.pathname)) {
                    labels["type"] = "master_playlist";
                    mediaRequestController.getHLSManifest(request, response);
                } else if (UrlUtils.isPlaylist(request.customParsedUrl.pathname)) {
                    labels["type"] = "playlist";
                    mediaRequestController.getHLSVariant(request, response);
                } else if (UrlUtils.isSegment(request.customParsedUrl.pathname)) {
                    labels["type"] = "segment";
                    mediaRequestController.getSegment(request, response);
                } else if (request.customParsedUrl.pathname.endsWith("metadata")) {
                    labels["type"] = "metadata";
                    mediaRequestController.getMetadataInfo(request, response);
                } else {
                    labels["type"] = "media_unknown";
                    response.writeHead(404);
                    response.end("unknown request");
                }
            } 
        } else {
            labels["type"] = "unknown";
            response.end();
        }
    } catch(e: any) {
        response.writeHead(501);
        response.end();
    }
});

logger.info(`HTTP server started and listening at port ${config.parameters.http.port}`);
server.listen(config.parameters.http.port);
