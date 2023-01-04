import { MediaUtils } from "../../utils/mediautils";
import logger from "../../utils/logger";
import { Track } from "../track";
import { SegmentList } from "./segmentlist";
import { Segment } from "./segment";


export class Segmenter {
    public lengthTolerance = 0.05;
    public constructor(public segmentLength: number, public clipStart: number, public clipEnd: number) {
    }

    public segment(tracks: Track[]): SegmentList {
        let segments: Segment[] = [];

        let track = tracks.find( (t) => t.type === "video");
        if (!track) {
            track = tracks.find( (t) => t.type === "audio");
        }
        if (track) {
            segments = this.segmentTrack(track);
        }

        return new SegmentList(segments);
    }

    private segmentTrack(track: Track): Segment[] {
        const segments: Segment[] = [];    

        const samples = track.samples;
        const hrstart = process.hrtime();
        const adjustedSegmentLength = track.type === "video" ? this.segmentLength * (1 - this.lengthTolerance) : this.segmentLength;
        const durationTb = MediaUtils.rescale_time(adjustedSegmentLength, 1000, track.timescale);
        const segmentLimit = durationTb;
        let partialDuration = 0;
        let idx = 0;
        let nextStartDts = samples[0].dts;
        let nextOffset = samples[0].offset;

        while (idx < samples.length) {
            if (samples[idx].isKeyframe && partialDuration >= segmentLimit) {
                segments.push(new Segment(
                    nextStartDts,
                    MediaUtils.rescale_time(nextStartDts, track.timescale, 1000),
                    MediaUtils.rescale_time(partialDuration, track.timescale, 1000),
                    nextOffset));
                partialDuration = 0;
                nextStartDts = samples[idx].dts;
                nextOffset = samples[idx].offset;
            } 

            partialDuration += samples[idx].duration;
            idx++;
        }

        if (partialDuration > 0) {
            segments.push(new Segment(
                nextStartDts,
                MediaUtils.rescale_time(nextStartDts, track.timescale, 1000),
                MediaUtils.rescale_time(partialDuration, track.timescale, 1000),
                nextOffset));   
        }

        const hrend = process.hrtime(hrstart);
        logger.debug(`profiling,segmentation,${hrend[1] / 1000000},track #${track.trackId}:${track.type}`);
    
        return segments;
    }

}