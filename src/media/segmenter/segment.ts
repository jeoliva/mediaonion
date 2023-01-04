import { Track } from "../track";

export class Segment {
    public tracks?: Track[];

    public constructor(public start: number, 
        public startMs: number, 
        public duration: number, 
        public offset: number) {
    }
}