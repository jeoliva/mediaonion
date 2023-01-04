import * as fs from "fs";
import { Reader } from "./reader";

export class FileReader extends Reader {
    private fd: number;

    public open(resource: string): void {
        this.fd = fs.openSync(resource, "r");
    }
    
    public read(buffer: Buffer, srcOffset: number, dstOffset: number, size?: number): Promise<number> {
        if (!size) {
            size = buffer.length - dstOffset;
        }
        const res = fs.readSync(this.fd, buffer, dstOffset, size, srcOffset);
        return Promise.resolve(res);
    }

    public readBulk(buffer: Buffer, srcOffset: number[], dstOffset: number, size: number[]): Promise<number> {
        let total = 0;
        for (let i = 0; i < srcOffset.length; i++) {
            let offset = (i == 0) ? dstOffset : dstOffset + size[i - 1];
            total += fs.readSync(this.fd, buffer, offset, size[i], srcOffset[i]);
        }
        return Promise.resolve(total);
    }

    public close(): void {
        if (this.fd > 0) {
            fs.close(this.fd);
        }
    }
}