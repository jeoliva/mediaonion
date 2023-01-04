import { MediaUtils } from "../../utils/mediautils";
import { Sample, SampleType } from "../sample";
import { Track } from "../track";
import { Segment } from "./segment";

export class SegmentList {
    public constructor(public segments: Segment[]) {
    }

    public loadSamples(index: number, tracks: Track[]): Segment {
        let segment: Segment;

        if (this.segments.length > index) {
            segment = this.segments[index];

            const startMs = segment.startMs;
            const endMs = index + 1 < this.segments.length ? 
                this.segments[index + 1].startMs : -1;
            
            tracks.forEach((t: Track) => {
                const filteredSamples: Sample[] = [];
                for (const s of t.samples) {
                    switch (t.type) {
                        case "video":
                            s.type = SampleType.Video;
                            break;
                        case "audio":
                            s.type = SampleType.Audio;
                            break;
                    }
                    s.timescale = t.timescale;
                    s.tdts = MediaUtils.rescale_time(s.dts, t.timescale, 1000);
                    
                    if ((index === 0 || s.tdts >= startMs) && (s.tdts < endMs || endMs == -1)) {
                        if (s.compositionOffset) {
                            s.tcomposition = MediaUtils.rescale_time(s.compositionOffset, t.timescale, 1000);
                        } 
                        filteredSamples.push(s);
                    }
                }
                t.samples = filteredSamples;
            });

            segment.tracks = tracks;
        }

        return segment;
    }
}