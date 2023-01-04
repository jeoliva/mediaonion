export enum SampleType {
    Audio = 0,
    Video,
    Data
}
export interface Sample {
    isKeyframe: boolean;
    duration: number;
    dts: number;
    size: number;
    offset: number;
    tdts: number;
    tcomposition: number;
    timescale?: number;
    compositionOffset?: number;
    type?: SampleType;
}	