import { CustomIncomingMessage } from "common";
import path from "path";
import { ApplicationParameters, Config } from "../config/config";

export class SourceMedia {
    baseFolderPath: string;
    fullFolderPath: string;
    sources: string[];
    filename: string;
    params: {[id: string]: string};
}

export class UrlUtils {
    public static isSegment(url: string): boolean {
        return url.endsWith(".ts");
    }

    public static isPlaylist(url: string): boolean {
        return url.endsWith(".m3u8");
    }

    public static isMasterPlaylist(url: string): boolean {
        return url.endsWith("master.m3u8");
    }

    public static absoluteUrl(app: ApplicationParameters, absoluteFolder: string, url: string): string {
        const config = Config.getInstance();
        let absoluteBaseUrl = app.hlsMuxer.absoluteBaseUrl;
        if (!absoluteBaseUrl) {
            absoluteBaseUrl = `http://localhost:${config.parameters.http.port}/`;
        }
        if (absoluteBaseUrl.endsWith("/")) {
            absoluteBaseUrl = absoluteBaseUrl.substring(0, absoluteBaseUrl.length - 1);
        }

        return `${absoluteBaseUrl}${absoluteFolder}/${url}`;
    }

    public static parseMediaUrl(request: CustomIncomingMessage): SourceMedia {
        const src = new SourceMedia();
        src.sources = [];
        src.params = {};

        // filename
        const basename = path.basename(request.customUrl);
        const parts = basename.split("?");
        src.filename = parts[0];

        // query string
        if (parts.length > 0) {
            const qs = basename.substring(src.filename.length + 1);
            if (qs.length > 0) {
                const params = qs.split("&");
                for (const p of params) {
                    const pair = p.split("=");
                    src.params[pair[0]] = pair.length > 1 ? pair[1] : "";
                }
            }
        }

        // basefolder
        const dir = path.dirname(request.customUrl);
        const lastBackslash = dir.lastIndexOf("/");
        src.baseFolderPath = dir.substring(0, lastBackslash);
        src.fullFolderPath = `/${request.customAppId}${dir}`;

        const media = dir.substring(lastBackslash + 1);

        if (media.endsWith(".csmil")) {
            const mediaParts = media.split(",");
            if (mediaParts.length > 2) {
                const prefix = mediaParts[0];
                const sufix = mediaParts[mediaParts.length - 1].substring(0, mediaParts[mediaParts.length - 1].lastIndexOf("."));
                for (let i = 1; i < mediaParts.length - 1; i++) {
                    src.sources.push(`${prefix}${mediaParts[i]}${sufix}`);
                }
            }
        } else if (media.length > 0) {
            src.sources.push(media);
        }

        return src;
    }
}