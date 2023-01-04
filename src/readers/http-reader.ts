import got from "got-cjs";
import {Agent as HttpAgent} from 'http';
import { Reader } from "./reader";

export class HttpReader extends Reader {
    private url: string;
    private agent = new HttpAgent({keepAlive: true});

    public open(resource: string): void {
        this.url = resource;
    }
    
    public async read(buffer: Buffer, srcOffset: number, dstOffset: number, size?: number): Promise<number> {
        if (!size) {
            size = buffer.length - dstOffset;
        }
        
        let res;
        try {
            res = await got.get(this.url, {
                agent: {
                    http: this.agent
                },
                headers: {
                    connection: "keep-alive",
                    range: `bytes=${srcOffset}-${srcOffset + size - 1}`
                },
                resolveBodyOnly: true,
                responseType: 'buffer',
                timeout: {
                    request: 5000
                }
            });
        } catch(e: any) {
            return 0;
        }
        
        if (res && res.length > 0) {
            return res.copy(buffer, dstOffset);
        }
        return 0;
    }

    public async readBulk(buffer: Buffer, srcOffset: number[], dstOffset: number, size: number[]): Promise<number> {
        let res;
        try {
            const ranges = [];
            for (let i = 0; i < srcOffset.length; i++) {
                ranges.push(`${srcOffset[i]}-${srcOffset[i] + size[i] - 1}`);
            }
            res = await got.get(this.url, {
                agent: {
                    http: this.agent
                },
                headers: {
                    connection: "keep-alive",
                    range: `bytes=${ranges.join(',')}`
                },
                resolveBodyOnly: true,
                responseType: 'buffer',
                timeout: {
                    request: 5000
                }
            });
        } catch(e: any) {
            console.log('error', e);
            return 0;
        }
        
        if (res && res.length > 0) {
            return res.copy(buffer, dstOffset);
        }
        console.log('oh oh');
        return 0;
    }

    public close(): void {
        // do nothing
        this.agent.destroy();
    }
}