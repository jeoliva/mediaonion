import { Mp4Info, Mp4Track } from "../media/mp4/mp4parser";

export class MediaUtils {
    public static getTrackByType(info: Mp4Info, type: string, index: number): Mp4Track {
        let idx = 0;
        for (const t of info.tracks) {
            if (t.type === type) {
                if (index == -1 || idx === index) {
                    return t;
                }
                idx++;
            }
        }
    }

    public static getAvcCodecDesc(videoInfo: any): string {
        return `avc1.${videoInfo.profile?.toString(16).padStart(2, "0")}00${videoInfo.level?.toString(16).padStart(2, "0")}`;
    }

    public static flipBits32(n: number): number {
        let res: number = 0;

        for (let i = 0; i < 32; i++) {
            res = res << 1;
            res |= n & 1;
            n = n >> 1;
        }
        return res;
    }

    public static getHevcCodecDesc(videoInfo: any): string {
        const profileSpace = videoInfo.profileSpace > 0 ? `A${videoInfo.profileSpace - 1}` : "";
        const tierFlag = videoInfo.tierFlag ? "H" : "L";
        const compatibility = MediaUtils.flipBits32(videoInfo.profileCompatibility);

        return `hevc1.${profileSpace}${videoInfo.profileIdc}.${compatibility}.${tierFlag}${videoInfo.levelIdc}.${videoInfo.constraintIndicator[0].toString(16).padStart(2, "0")}`;
    }

    public static getCodecs(video: Mp4Track, audio: Mp4Track): string {
        // avc1.64001f,mp4a.40.2
        let vid: string;
        let aid: string;
        if (video) {
            vid = video.codecDescription;
        }

        if (audio) {
            aid = `${audio.codec}`;
        }

        if (video && audio) {
            return `${vid},${aid}`;
        }
        if (audio) {
            return aid;
        }
        return vid;
    }

    public static rescale_time(time: number, currentScale: number, newScale: number): number {
        return (time * newScale + currentScale / 2) / currentScale;
    }
}