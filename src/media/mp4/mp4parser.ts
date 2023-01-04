import logger from "../../utils/logger";

import * as inspectorjs from "inspector.js";
import { MediaUtils } from "../../utils/mediautils";
import { Sample } from "../sample";
import { CodecType, Track } from "../track";
import { Config } from "../../config/config";
import { Reader } from "../../readers/reader";
import { ReaderFactory } from "../../readers/reader-factory";


export class Mp4Track extends Track {
    public bitrate: number;
    public totalSize: number;

    // video
    public fps: number;

    public width: number;
    public height: number;
    public codecDescription: string;

    // audio
    public channels: number;
    public sampleRate: number;
    public sampleSize: number;

    // atoms
    public mdhd: inspectorjs.Mdhd;
    public tkhd: inspectorjs.Tkhd;
    public stts: inspectorjs.Stts;
    public stss: inspectorjs.Stss;
    public stsz: inspectorjs.Stsz;
    public stco: inspectorjs.Stco;
    public ctts: inspectorjs.Ctts;
    public stsc: inspectorjs.Stsc;
}

export class Mp4Info {
    public tracks: Mp4Track[];
}

export class Mp4Parser {

    public static async parse(file: string): Promise<Mp4Info> {
        const config = Config.getInstance();

        return new Promise<Mp4Info>(async (resolve, reject) => {
            try {
                const reader = ReaderFactory.create(file);
                if (reader) {
                    let buffSize = config.parameters.parser.initialReadSize;
                    do {
                        const b = Buffer.alloc(buffSize);
                        const demuxer = inspectorjs.createMp4Demuxer();
                        await reader.read(b, 0, 0, b.byteLength);
                        
                        const ui8 = new Uint8Array(b.buffer, b.byteOffset, b.byteLength / Uint8Array.BYTES_PER_ELEMENT);
                        demuxer.append(ui8);
                        demuxer.end();

                        if (this.isMoovCompleted(demuxer.atoms)) {
                            reader.close();
                            logger.debug(`Read metadata of ${file}`);

                            const info = Mp4Parser.parseEssentialAtoms(demuxer.tracks, demuxer.atoms);
                            resolve(info);
                            return;
                        }

                        buffSize *= 2;

                    } while (buffSize < config.parameters.parser.maxBufferSize);

                    logger.error(`Moov atom not found after reading up to ${config.parameters.parser.maxBufferSize} bytes`);
                    reject(`Moov atom not found after reading up to ${config.parameters.parser.maxBufferSize} bytes`);
                }
            } catch (err: any) {
                logger.error('MP4Parser', err.message);
                reject(err.message);
            }
        });
    }


    private static parseEssentialAtoms(tracks: inspectorjs.TracksHash, atoms: inspectorjs.Atom[]): Mp4Info {
        const info: Mp4Info = new Mp4Info();
        info.tracks = [];

        const moov: inspectorjs.Atom = Mp4Parser.findAtom(atoms, "moov");

        // Add info to tracks
        if (moov && moov.atoms && moov.atoms.length > 0) {
            for (const a of moov.atoms) {
                if (a.type === "trak") {
                    const tkhd = Mp4Parser.findAtom(a.atoms, "tkhd");

                    const trackId: number = (tkhd as any).trackId;
                    const track = tracks[trackId];
                    if (track) {
                        const newTrack = new Mp4Track();
                        newTrack.tkhd = tkhd as inspectorjs.Tkhd;
                        newTrack.trackId = trackId;
                        newTrack.type = track.type;
                        newTrack.mimeType = track.mimeType;
                        newTrack.mdhd = Mp4Parser.findAtom(a.atoms, "mdhd") as inspectorjs.Mdhd;
                        if (newTrack.mdhd) {
                            newTrack.timescale = (newTrack.mdhd as any).timescale;
                            newTrack.duration = newTrack.timescale > 0 ? MediaUtils.rescale_time(newTrack.mdhd.duration, newTrack.timescale, 1000) : newTrack.mdhd.duration;
                            newTrack.language = (newTrack.mdhd as any).language;
                        }

                        newTrack.stts = Mp4Parser.findAtom(a.atoms, "stts") as inspectorjs.Stts;
                        let delta = 0;
                        let totalDuration = 0;
                        if (newTrack.stts) {
                            // Find min time between samples
                            if (newTrack.stts.timeToSamples && newTrack.stts.timeToSamples.length > 0) {
                                for (const t of newTrack.stts.timeToSamples) {
                                    if (delta === 0 || t.sampleDelta < delta) {
                                        delta = t.sampleDelta as number;
                                    }
                                    totalDuration += t.sampleDelta * t.sampleCount;
                                }
                            }
                        }
                        if (delta > 0) {
                            newTrack.fps = newTrack.timescale / delta;
                        }

                        if (newTrack.duration <= 0) {
                            newTrack.duration = MediaUtils.rescale_time(totalDuration, newTrack.timescale, 1000);
                        }

                        // calculate size
                        newTrack.stsz = Mp4Parser.findAtom(a.atoms, "stsz") as inspectorjs.Stsz;
                        let totalSize = 0;
                        if (newTrack.stsz) {
                            if (newTrack.stsz.sampleSize > 0 && newTrack.stsz.entries && newTrack.stsz.entries.length > 0) {
                                totalSize = newTrack.stsz.sampleSize * newTrack.stsz.entries.length;
                            } else if (newTrack.stsz.entries && newTrack.stsz.entries.length > 0) {
                                for (const e of newTrack.stsz.entries) {
                                    totalSize += e;
                                }
                            }
                        }
                        newTrack.totalSize = totalSize;
                        if (newTrack.duration > 0) {
                            newTrack.bitrate = 8 * newTrack.totalSize / newTrack.duration;
                        }

                        // track type specific info
                        switch (newTrack.type) {
                            case "video":
                                if ((track as any).referenceAtom) {
                                    const vInfo: any = (track as any).referenceAtom;
                                    newTrack.codec = vInfo.type;
                                    newTrack.codecId = Mp4Parser.getCodecId(newTrack, a.atoms);

                                    switch (newTrack.codecId) {
                                        case CodecType.AVC1:
                                            newTrack.codecDescription = MediaUtils.getAvcCodecDesc(vInfo);
                                            const avcAtom = Mp4Parser.findAtom(a.atoms, "avc1");
                                            newTrack.width = (avcAtom as any)?.width;
                                            newTrack.height = (avcAtom as any)?.height;
                                            break;
                                        case CodecType.HEVC:
                                            newTrack.codecDescription = MediaUtils.getHevcCodecDesc(vInfo);
                                            const hevcAtom = Mp4Parser.findAtom(a.atoms, "hvc1");
                                            newTrack.width = (hevcAtom as any)?.width;
                                            newTrack.height = (hevcAtom as any)?.height;
                                            break;
                                        default:
                                            newTrack.codecDescription = "avc1";
                                            break;

                                    }

                                    newTrack.codecExtraData = [];

                                    if (newTrack.codecId === CodecType.AVC1) {
                                        if (vInfo.sps) {
                                            for (const sps of vInfo.sps) {
                                                newTrack.codecExtraData.push(sps);
                                            }
                                        }
                                        if (vInfo.pps) {
                                            for (const pps of vInfo.pps) {
                                                newTrack.codecExtraData.push(pps);
                                            }
                                        }
                                    } else if (newTrack.codecId === CodecType.HEVC) {
                                        for (const n of (track as any).referenceAtom.nalUnitsArrays) {
                                            if (n.nalUnits) {
                                                for (const u of n.nalUnits) {
                                                    if (u.data) {
                                                        newTrack.codecExtraData.push(u.data);
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    if (vInfo.spsParsed) {
                                        for (const sps of vInfo.spsParsed) {
                                            const res = sps.presentSize ? sps.presentSize : sps.codecSize ? sps.codecSize : sps.sar;
                                            if (res) {
                                                newTrack.width = res.width;
                                                newTrack.height = res.height;
                                            }
                                        }
                                    }
                                }
                                break;

                            case "audio":
                                if ((track as any).referenceAtom) {
                                    const aInfo: any = (track as any).referenceAtom;
                                    newTrack.codec = aInfo.type;
                                    newTrack.codecId = Mp4Parser.getCodecId(newTrack, a.atoms);

                                    newTrack.channels = aInfo.channelCount;
                                    newTrack.sampleRate = aInfo.sampleRate;
                                    newTrack.sampleSize = aInfo.sampleSize;
                                    newTrack.codecExtraData = [];
                                    if (newTrack.codec === "mp4a") {
                                        const esds = Mp4Parser.findAtom(a.atoms, "esds") as inspectorjs.Esds;
                                        if (esds) {
                                            const dsi = Mp4Parser.findDescriptor(esds.descriptors, "DecoderSpecificInfo");
                                            if (dsi && (dsi as any).data) {
                                                newTrack.codecExtraData.push((dsi as any).data);

                                                if (newTrack.codecExtraData[0].length >= 2) {
                                                    newTrack.profileObjectType = (newTrack.codecExtraData[0][0] & 0xf8) >> 3;
                                                    newTrack.rateIndex = ((newTrack.codecExtraData[0][0] & 7) << 1) +
                                                        ((newTrack.codecExtraData[0][1] & 0x80) >> 7 & 1);
                                                    newTrack.channelsIndex = (newTrack.codecExtraData[0][1] & 0x7f) >> 3;

                                                }
                                            }
                                        }
                                    }
                                }
                                break;
                        }

                        // Prepare atoms required for segmentation process
                        newTrack.stss = Mp4Parser.findAtom(a.atoms, "stss") as inspectorjs.Stss;
                        newTrack.stco = Mp4Parser.findAtom(a.atoms, "stco") as inspectorjs.Stco;
                        newTrack.ctts = Mp4Parser.findAtom(a.atoms, "ctts") as inspectorjs.Ctts;
                        newTrack.stsc = Mp4Parser.findAtom(a.atoms, "stsc") as inspectorjs.Stsc;

                        info.tracks.push(newTrack);
                    }
                }
            }
        }

        return info;
    }


    public static buildSamples(track: Mp4Track): Array<Sample> {
        const samples = new Array<Sample>();

        let index = 0;
        let currentTimestamp = 0;
        let indexKeyframe = 0;
        let currentChunk = 0;
        let currentChunkOffset = 0;
        let currentChunkNumber = 0;
        let currentCompositionIndex = 0;
        let currentCompositionCount = 0;

        let currentSampleChunk = 0;
        let samplesPerChunk = 0;
        if (track.stsc.sampleToChunks.length > 0) {
            currentSampleChunk = track.stsc.sampleToChunks[0].firstChunk;
            samplesPerChunk = track.stsc.sampleToChunks[0].samplesPerChunk;
        }

        if (track.stts && track.stts.timeToSamples) {
            for (const tts of track.stts.timeToSamples) {
                for (let i = 0; i < tts.sampleCount; i++) {
                    const sample: any = {};
                    sample.isKeyframe = !track.stss;
                    sample.dts = currentTimestamp;
                    sample.duration = tts.sampleDelta;
                    sample.size = track.stsz.entries[index];
                    sample.offset = track.stco.chunkOffsets[currentChunk] + currentChunkOffset;

                    if (track.type === "video") {
                        let compositionOffset = 0;

                        if (track.ctts && currentCompositionIndex < track.ctts.compositionOffsetTable.length) {
                            compositionOffset = track.ctts.compositionOffsetTable[currentCompositionIndex].compositionOffset || 0;
                            currentCompositionCount++;
                            if (currentCompositionCount >= track.ctts.compositionOffsetTable[currentCompositionIndex].sampleCount) {
                                currentCompositionIndex++;
                                currentCompositionCount = 0;
                            }
                        }
                        sample.compositionOffset = compositionOffset;
                        if (indexKeyframe < track.stss.sampleNumbers.length && track.stss.sampleNumbers[indexKeyframe] === index + 1) {
                            sample.isKeyframe = true;
                            indexKeyframe++;
                        } else {
                            sample.isKeyframe = false;
                        }
                    }

                    if (sample.size > 0) {
                        samples.push(sample);
                    }

                    currentChunkNumber++;
                    if (currentChunkNumber < samplesPerChunk) {
                        currentChunkOffset += track.stsz.entries[index];
                    } else {
                        currentChunkNumber = 0;
                        currentChunkOffset = 0;
                        currentChunk++;
                        if (currentSampleChunk < track.stsc.sampleToChunks.length) {
                            if (currentChunk + 1 >= track.stsc.sampleToChunks[currentSampleChunk].firstChunk) {
                                samplesPerChunk = track.stsc.sampleToChunks[currentSampleChunk].samplesPerChunk;
                                currentSampleChunk++;
                            }
                        }
                    }

                    currentTimestamp += tts.sampleDelta;
                    index++;
                }
            }
        }

        return samples;
    }


    public static findAtom(atoms: inspectorjs.Atom[], type: string): inspectorjs.Atom {
        if (atoms) {
            for (const a of atoms) {
                if (a.type === type) {
                    return a;
                }

                if (a.atoms && a.atoms.length > 0) {
                    const t = Mp4Parser.findAtom(a.atoms, type);
                    if (t) {
                        return t;
                    }
                }
            }
        }
        return undefined;
    }


    private static isMoovCompleted(atoms: inspectorjs.Atom[]): boolean {
        for (const atom of atoms) {
            if (atom.type === "moov") {
                return atom.isCompleted;
            }
        }

        return false;
    }

    private static getCodecId(track: Mp4Track, atoms: inspectorjs.Atom[]): CodecType {
        let codecId = CodecType.Unknown;

        if (track.type === "video") {
            switch (track.codec) {
                case "h264":
                case "H264":
                case "avc1":
                case "avcC":
                    codecId = CodecType.AVC1;
                    break;

                case "hev1":
                case "hvc1":
                case "hevC":
                case "hvcC":
                    codecId = CodecType.HEVC;
                    break;
            }
        } else if (track.type === "audio") {
            switch (track.codec) {
                case "mp4a":
                    const aoi = Mp4Parser.getAudioObjectTypeId(atoms);
                    switch (aoi) {
                        case 0x40:
                        case 0x66:
                        case 0x67:
                        case 0x68:
                            codecId = CodecType.AAC;
                            break;

                        case 0x69:
                        case 0x6B:
                            codecId = CodecType.MP3;
                            break;

                        case 0xa9:
                            codecId = CodecType.DTS;
                            break;
                    }
                    break;
                case "ac-3":
                    codecId = CodecType.AC3;
                    break;
                case "ec-3":
                    codecId = CodecType.EAC3;
                    break;
                case "Opus":
                    codecId = CodecType.OPUS;
                    break;
            }
        }

        return codecId;
    }


    public static findDescriptor(descriptors: inspectorjs.EsdsDescriptor[], type: string): inspectorjs.EsdsDescriptor {
        if (descriptors) {
            for (const d of descriptors) {
                if (d.type === type) {
                    return d;
                }

                if (d.children && d.children.length > 0) {
                    const t = Mp4Parser.findDescriptor(d.children, type);
                    if (t) {
                        return t;
                    }
                }
            }
        }
        return undefined;
    }


    private static getAudioObjectTypeId(atoms: inspectorjs.Atom[]): number {
        const res = 0;
        const esds = Mp4Parser.findAtom(atoms, "esds") as inspectorjs.Esds;

        if (esds) {
            const descriptor = Mp4Parser.findDescriptor(esds.descriptors, "DecoderConfigDescriptor") as inspectorjs.DecoderConfigDescriptor;
            if (descriptor) {
                return descriptor.oti;
            }
        }


        return res;
    }
}