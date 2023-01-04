import * as http from "http";
import { Mp4Track, Mp4Info, Mp4Parser } from "../media/mp4/mp4parser";
import { SourceMedia, UrlUtils } from "../utils/urlutils";
import logger from "../utils/logger";
import { HlsMuxer } from "../media/hls/hlsmuxer";
import { Cache } from "../utils/cache";
import { Segmenter } from "../media/segmenter/segmenter";
import { MediaUtils } from "../utils/mediautils";
import { MpegTsMuxer } from "../media/mpegts/tsmuxer";
import { Track } from "../media/track";
import { ApplicationParameters, Config } from "../config/config";
import { CustomIncomingMessage } from "common";


export class MediaRequestController {
    private config: Config = Config.getInstance();
    private cache: Cache = Cache.getInstance();

    public async getHLSManifest(request: CustomIncomingMessage, response: http.ServerResponse) {
        logger.debug(`Request to manifest received ${request.customUrl}`);

        const u = UrlUtils.parseMediaUrl(request);
        if (!u || !u.sources || u.sources.length === 0) {
            response.writeHead(404);
            response.end();
            return;
        }

        const mediaFiles: Mp4Info[] = [];

        for (const s of u.sources) {
            const src = this.getSourcePath(request.customApp, u, s);
            try {
                const info = await this.getSourceMetadata(src);
                mediaFiles.push(info);
            } catch (e: any) {
                response.writeHead(404);
                response.write(`Source file ${src} not found`);
                response.end();
                return;
            }
        }

        if (mediaFiles.length > 0) {
            const manifest = HlsMuxer.generateManifest(request.customApp, u.fullFolderPath, mediaFiles);
            response.setHeader("Content-Type", "application/x-mpegURL");
            response.end(manifest);
        } else {
            response.writeHead(404);
            response.end();
        }
    }


    public getSourcePath(app: ApplicationParameters, media: SourceMedia, file: string): string {
        return `${app.originPath}${media.baseFolderPath}/${file}`;
    }

    public async getHLSVariant(request: CustomIncomingMessage, response: http.ServerResponse) {
        logger.debug(`Request to variant m3u8 received ${request.customUrl}`);

        const u = UrlUtils.parseMediaUrl(request);
        const r = /index-f(\d+)(-v(\d+))?(-a(\d+))?.m3u8/;
        const params = r.exec(u.filename);
        if (params) {
            const fileIdx = parseInt(params[1], 10);
            const videoTrackIdx = parseInt(params[3], 10);
            const audioTrackIdx = parseInt(params[5], 10);

            if (fileIdx >= u.sources.length || (isNaN(videoTrackIdx) && isNaN(audioTrackIdx))) {
                response.writeHead(501);
                response.end();
                return;
            }

            const file = u.sources[fileIdx];
            const src = this.getSourcePath(request.customApp, u, file);
            try {
                const tracks = await this.getSourceTracks(src, videoTrackIdx, audioTrackIdx);
                if (!tracks) {
                    response.writeHead(501);
                    response.end();
                    return;
                }

                const segmentLength = request.customApp.hlsMuxer.segmentLength;
                const segmenter: Segmenter = new Segmenter(segmentLength, 0, 0);
                const segmentsList = segmenter.segment(tracks);

                if (segmentsList.segments.length > 0) {
                    const variantPlaylist = HlsMuxer.generateSegmentList(request.customApp, u.fullFolderPath, segmentLength, 3, fileIdx, videoTrackIdx, audioTrackIdx, segmentsList);
                    response.setHeader("Content-Type", "application/x-mpegURL");
                    response.end(variantPlaylist);
                } else {
                    response.writeHead(501);
                    response.end();
                }
            } catch (e: any) {
                response.writeHead(501);
                logger.error('media-request-controller: ' + e);
                response.end(`Source file ${src} not found`);
                return;
            }
        }
    }


    public async getSegment(request: CustomIncomingMessage, response: http.ServerResponse) {
        logger.debug(`Request to segment received ${request.customUrl}`);

        const u = UrlUtils.parseMediaUrl(request);

        // segment-1-f0-v1-a1.ts
        const r = /segment-(\d+)-f(\d+)(-v(\d+))?(-a(\d+))?.ts/;
        const params = r.exec(u.filename);
        if (params) {
            const segmentIdx = parseInt(params[1], 10) - 1;
            const fileIdx = parseInt(params[2], 10);
            const videoTrackIdx = parseInt(params[4], 10);
            const audioTrackIdx = parseInt(params[6], 10);

            if (fileIdx >= u.sources.length || (isNaN(videoTrackIdx) && isNaN(audioTrackIdx))) {
                response.writeHead(501);
                response.end();
                return;
            }

            logger.debug(`Segment ${segmentIdx}, file ${fileIdx}, video track ${videoTrackIdx}, audio track ${audioTrackIdx}`);
            const file = u.sources[fileIdx];
            const src = this.getSourcePath(request.customApp, u, file);
            try {
                const tracks = await this.getSourceTracks(src, videoTrackIdx, audioTrackIdx);
                if (!tracks) {
                    response.writeHead(501);
                    response.end();
                    return;
                }
                
                const segmentLength = request.customApp.hlsMuxer.segmentLength;
                const segmenter: Segmenter = new Segmenter(segmentLength, 0, 0);
                const segmentsList = segmenter.segment(tracks);

                logger.debug(`Packetizing segment ${segmentIdx}`);                
                const segment = segmentsList.loadSamples(segmentIdx, tracks);

                if (segment) {
                    MpegTsMuxer.packetize(src, segmentIdx, segment).then((buff: Buffer) => {
                        response.setHeader("Content-Type", "video/MP2T");
                        response.end(buff);
                    });
                } else {
                    response.writeHead(404);
                    response.end();
                }
            } catch (e: any) {
                logger.error('media-request-controller: ' + e);
                response.writeHead(501);
                response.end(`Source file ${src} not found`);
                return;
            }
        } else {
            response.writeHead(404);
            response.end();
        }
    }

    public getMetadataInfo(request: CustomIncomingMessage, response: http.ServerResponse) {
        logger.debug(`Request to metadata received ${request.customUrl}`);

        const u = UrlUtils.parseMediaUrl(request);
        if (!u || !u.sources || u.sources.length === 0) {
            response.writeHead(404);
            response.end();
            return;
        }

        for (const s of u.sources) {
            const src = this.getSourcePath(request.customApp, u, s);

            this.getSourceMetadata(src)
                .then((value: Mp4Info) => {
                    response.setHeader("Content-Type", "application/json");
                    response.end(JSON.stringify({
                        tracks: value.tracks
                    }));
                })
                .catch((e: any) => {
                    logger.error('media-request-controller: ' + e);
                    response.writeHead(404);
                    response.write(`Source file ${src} not found`);
                    response.end();
                });

        }
    }

    private async getSourceTracks(sourceFile: string, videoTrackIdx: number, audioTrackIdx: number): Promise<Track[]> {
        const info = await this.getSourceMetadata(sourceFile);

        const tracks: Mp4Track[] = [];
        if (info) {
            if (videoTrackIdx) {
                const track = MediaUtils.getTrackByType(info, "video", videoTrackIdx - 1);
                if (track) {
                    tracks.push(track);
                } else {
                    logger.error(`Requested a video track that does not exist. Track #${videoTrackIdx}`);
                    return;
                }
            }

            if (audioTrackIdx) {
                const track = MediaUtils.getTrackByType(info, "audio", audioTrackIdx - 1);
                if (track) {
                    tracks.push(track);
                } else {
                    logger.error(`Requested an audio track that does not exist. Track #${audioTrackIdx}`);
                    return;
                }
            }
        }

        const outputTracks: Track[] = [];
        tracks.forEach( (t: Mp4Track) => {
            const newTrack: Track = {
                trackId: t.trackId,
                type: t.type,
                timescale: t.timescale,
                duration: t.duration,
                codec: t.codec,
                codecId: t.codecId,
                language: t.language,
                mimeType: t.mimeType,
                codecExtraData: t.codecExtraData
            };
            if (t.type === "audio") {
                newTrack.profileObjectType = t.profileObjectType;
                newTrack.rateIndex = t.rateIndex;
                newTrack.channelsIndex = t.channelsIndex;
            }

            const hrstart = process.hrtime();
            newTrack.samples = Mp4Parser.buildSamples(t);
            const hrend = process.hrtime(hrstart);
            logger.debug(`profiling,frames_table,${hrend[1] / 1000000},track #${t.trackId}:${t.type},ts: ${t.timescale}`);

            outputTracks.push(newTrack);
        });

        return outputTracks;
    }


    private async getSourceMetadata(src: string): Promise<Mp4Info | undefined> {
        const cached = this.cache.get(src) as Mp4Info;
        if (cached) {
            return cached;
        }

        // metadata was not in cache. Retrieving it directly from the file
        const hrstart = process.hrtime();
        const info = await Mp4Parser.parse(src);
        const hrend = process.hrtime(hrstart);
        logger.debug(`profiling,metadata_retrieval,${hrend[1] / 1000000}`);

        // store the result in the cache so it is available for subsequent requests
        this.cache.set(src, info);

        return info;
    }

}