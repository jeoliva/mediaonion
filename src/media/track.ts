import { Sample } from "./sample";

export enum CodecType {
    Unknown = 0,

    // Video Codecs
    AVC1,
    HEVC,
    VP8,
    VP9,

    // Audio Codecs
    AAC,
    AC3,
    EAC3,
    MP3,
    DTS,
    VORBIS,
    OPUS
}

export class Track {
    public trackId: number;
    public type: string;
    
    public language: string;
    public mimeType: string;
    
    public duration: number;
    public timescale: number;
    public codec: string;
    public codecId: CodecType;

    public samples?: Sample[];

    public codecExtraData?: Uint8Array[];
    public pid?: number;
    public counter?: number;

    public profileObjectType?: number;
    public rateIndex?: number;
    public channelsIndex?: number;
}