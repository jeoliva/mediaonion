import { UrlUtils } from "../src/utils/urlutils";
import { expect } from "chai";

function createRequest(url: string): any {
   return {
        customUrl: url
    };
}

describe("Single Source", () => {
    it("Basic request", (done) => {
        const r = UrlUtils.parseMediaUrl(createRequest("/dir1/dir2/file.mp4/master.m3u8"));
        expect(r.baseFolderPath).equal("/dir1/dir2");
        expect(r.sources).to.eql(["file.mp4"]);
        expect(r.filename).equal("master.m3u8");
        done();
    });

    it("Query string", (done) => {
        const r = UrlUtils.parseMediaUrl(createRequest("/dir1/dir2/file.mp4/master.m3u8?var1=2&var4"));
        expect(r.baseFolderPath).equal("/dir1/dir2");
        expect(r.sources).to.eql(["file.mp4"]);
        expect(r.filename).equal("master.m3u8");
        expect(r.params.var1).equal("2");
        expect(r.params.var4).equal("");
        done();
    });

    it("No Path, no Source", (done) => {
        const r = UrlUtils.parseMediaUrl(createRequest("/master.m3u8"));
        expect(r.baseFolderPath).equal("");
        expect(r.sources.length).equal(0);
        expect(r.filename).equal("master.m3u8");
        
        done();
    });

    it("No Path", (done) => {
        const r = UrlUtils.parseMediaUrl(createRequest("/file.mp4/master.m3u8"));
        expect(r.baseFolderPath).equal("");
        expect(r.sources).to.eql(["file.mp4"]);
        expect(r.filename).equal("master.m3u8");
        
        done();
    });

    it("Nothing", (done) => {
        const r = UrlUtils.parseMediaUrl(createRequest("/"));
        expect(r.baseFolderPath).equal("");
        expect(r.sources.length).equal(0);
        expect(r.filename).equal("");
        
        done();
    });

    it("Nothing but query string", (done) => {
        const r = UrlUtils.parseMediaUrl(createRequest("/?var1=2"));
        expect(r.baseFolderPath).equal("");
        expect(r.sources.length).equal(0);
        expect(r.filename).equal("");
        expect(r.params.var1).equal("2");
        
        done();
    });
});


describe("Multiple Sources", () => {
    it("Basic request", (done) => {
        const r = UrlUtils.parseMediaUrl(createRequest("/dir1/dir2/file,400,600,.mp4.csmil/master.m3u8"));
        expect(r.baseFolderPath).equal("/dir1/dir2");
        expect(r.sources).to.eql(["file400.mp4", "file600.mp4"]);
        expect(r.filename).equal("master.m3u8");
        done();
    });

    it("Empty files", (done) => {
        const r = UrlUtils.parseMediaUrl(createRequest("/dir1/dir2/file,,.mp4.csmil/master.m3u8"));
        expect(r.baseFolderPath).equal("/dir1/dir2");
        expect(r.sources).to.eql(["file.mp4"]);
        expect(r.filename).equal("master.m3u8");
        done();
    });
});