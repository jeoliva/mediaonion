export interface Frame {
    getDecodingTimeUs(): number;
    getPresentationTimeUs(): number;
    setPresentationTimeOffsetUs(presentationTimeOffsetUs: number): void;
    getPresentationTimestampInSeconds(): number;
    getDecodingTimestampInSeconds(): number;
}

export interface Track {
    id: number;
    type: string;
    mimeType: string;
    duration: number;
    
    getFrames(): Frame[];
    getDuration(): number;
    getDurationInSeconds(): number;
    getMetadata(): {};
    update(): void;
}

export type TracksHash = { [id: number] : Track; };

export interface Atom {
    type: string;
    size: number;
    isCompleted: boolean;
    atoms: Atom[];
}

export interface Mp4Demuxer {
    tracks: TracksHash;
    atoms: Atom[];

    append(data: Uint8Array): void;
    end(): void;
}

export interface Atom {
    type: string;
    size: number;
}

export interface TimeToSampleEntry {
    sampleCount: number;
    sampleDelta: number;
}

export interface CompositionOffsetEntry {
    sampleCount: number;
    compositionOffset: number;
}

export interface SampleToChunkEntry {
    firstChunk: number;
    samplesPerChunk: number;
}

export interface Stts extends Atom {
    version: number;
    flags: Uint8Array;
    timeToSamples: TimeToSampleEntry[];
}

export interface Stss extends Atom {
    version: number;
    flags: Uint8Array;
    sampleNumbers: number[];
}

export interface Stsz extends Atom {
    version: number;
    flags: Uint8Array;
    sampleSize: number;
    entries: number[];
}

export interface Stco extends Atom {
    version: number;
    flags: Uint8Array;
    chunkOffsets: number[];
}

export interface Ctts extends Atom {
    version: number;
    flags: Uint8Array;
    compositionOffsetTable: CompositionOffsetEntry[];
}   

export interface Stsc extends Atom {
    version: number;
    flags: Uint8Array;
    sampleToChunks: SampleToChunkEntry[];
}

export interface Mdhd extends Atom {
    version: number;
    flags: Uint8Array;
    language: string;
    creationTime: Date;
    modificationTime: Date;
    timescale: number;
    duration: number;
}

export interface Tkhd extends Atom {
    version: number;
    flags: Uint8Array;
    creationTime: Date;
    modificationTime: Date;
    trackId: number;
    duration: number;
    layer: number;
    volume: number;
    matrix: Uint32Array;
    alternateGroup: number;
    width: number;
    height: number;
}

export interface EsdsDescriptor {
    type: string;
    payloadSize: number;
    size: number;
    children: EsdsDescriptor[];
}

export interface DecoderConfigDescriptor extends EsdsDescriptor {
    oti: number;
    streamType: number;
    bufferSize: number;
    maxBitrate: number;
    avgBitrate: number;
}

export interface Esds extends Atom {
    version: number;
    flags: Uint8Array;
    descriptors: EsdsDescriptor[]
}


export function createMp4Demuxer(): Mp4Demuxer;

declare module "inspector.js";
