import { UrlUtils } from "../../utils/urlutils";
import { ApplicationParameters } from "../../config/config";
import { MediaUtils } from "../../utils/mediautils";
import { Mp4Info } from "../mp4/mp4parser";
import { SegmentList } from "../segmenter/segmentlist";

export class HlsMuxer {
    public static generateManifest(app: ApplicationParameters, absoluteFolder: string, variants: Mp4Info[]): string {
        const content: string[] = [];

        content.push("#EXTM3U");
        let variantIndex = 0;
        for (const v of variants) {
            const vt = MediaUtils.getTrackByType(v, "video", -1);
            const at = MediaUtils.getTrackByType(v, "audio", -1);

            if (vt) {
                const videoBitrate = vt && vt.bitrate ? vt.bitrate : 0;
                const audioBitrate = at && at.bitrate ? at.bitrate : 0;
                const bitrate = videoBitrate + audioBitrate;
                content.push(`#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=${bitrate.toFixed(0)},RESOLUTION=${vt.width}x${vt.height},FRAME-RATE=${vt.fps.toFixed(2)},CODECS="${MediaUtils.getCodecs(vt, at)}"`);
            } else {
                const bitrate = 0;
                content.push(`#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=${bitrate},CODECS="${MediaUtils.getCodecs(vt, at)}"`);
            }
            let variantName = `index-f${variantIndex}`;
            if (vt) {
                variantName += `-v${1}`;
            }
            if (at) {
                variantName += `-a${1}`;
            }
            variantName += ".m3u8";

            if (app.hlsMuxer.absoluteIndexUrls) {
                variantName = UrlUtils.absoluteUrl(app, absoluteFolder, variantName);
            }

            content.push(variantName);
            variantIndex++;
        }
        content.push("");

        return content.join("\r\n");
    }


    public static generateSegmentList(app: ApplicationParameters, absoluteFolder: string, targetDuration: number, hlsVersion: number, variantIndex: number, videoTrackIdx: number, audioTrackIdx: number, segmentsList: SegmentList): string {
        const content: string[] = [];

        content.push("#EXTM3U");
        content.push(`#EXT-X-TARGETDURATION:${Math.round(targetDuration / 1000)}`);
        content.push("#EXT-X-ALLOW-CACHE:YES");
        content.push("#EXT-X-PLAYLIST-TYPE:VOD");
        content.push(`#EXT-X-VERSION:${hlsVersion}`);
        content.push("#EXT-X-MEDIA-SEQUENCE:1");

        for (let i = 0; i < segmentsList.segments.length; i++) {
            content.push(`#EXTINF:${(segmentsList.segments[i].duration / 1000).toFixed(3)}`);

            let segmentName = `segment-${i + 1}-f${variantIndex}`;
            if (videoTrackIdx) {
                segmentName += `-v${videoTrackIdx}`;
            }
            if (audioTrackIdx) {
                segmentName += `-a${audioTrackIdx}`;
            }
            if (app.hlsMuxer.absoluteSegmentUrls) {
                segmentName = UrlUtils.absoluteUrl(app, absoluteFolder, segmentName);
            }
            content.push(`${segmentName}.ts`);
        }
        content.push("#EXT-X-ENDLIST");
        content.push("");
 
        return content.join("\r\n");
    }
}