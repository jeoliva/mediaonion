export abstract class Reader {
    public abstract open(resource: string): void;
    public abstract read(buffer: Buffer, srcOffset: number, dstOffset: number, size?: number): Promise<number>;
    public abstract readBulk(buffer: Buffer, srcOffset: number[], dstOffset: number, size: number[]): Promise<number>;
    public abstract close(): void;
}