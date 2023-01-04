import { FileReader } from "./file-reader";
import { HttpReader } from "./http-reader";
import { Reader } from "./reader";

export class ReaderFactory{
    static create(src: string): Reader {
        let reader: Reader;
        if (src.startsWith('http://') || src.startsWith('https://')) {
            reader = new HttpReader();
        } else {
            reader = new FileReader();
        }

        reader.open(src);
        return reader;
    }
}
