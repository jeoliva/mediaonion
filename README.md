
![Build workflow](https://github.com/jeoliva/mediaonion/actions/workflows/node.js.yml/badge.svg)

# MediaOnion

The Edge Origin Streaming Server. 

## Features

- [x] On the fly packaging of MP4 files to HLS
- [x] Auto extraction of audio tracks
- [x] Adaptive bitrate support
- [x] Track selection management
- [x] H.264, H.265, AAC support
- [x] Container & Kubernetes ready
- [x] Prometheus metrics ready
- [x] Process and serve locally stored files
- [x] Process and server files accessible via HTTP
- [x] Multi app, multi origin, multi site configuration
- [ ] On the fly transcoding
- [ ] AES 128 encryption
- [ ] Clipping
- [ ] fMP4 support


## Why MediaOnion
### How good is MediaOnion compared with dynamic packaging solutions?
Well, MediaOnion is a Node.js app... which I wouldn't say is the most performant technology. Even though I put some love on scalability and performance details, if you are looking for the most efficient media packaging solution you should look into other projects which are based on lower level technologies, like the awesome [nginx-vod-module](https://github.com/kaltura/nginx-vod-module) project.

### Does that mean MediaOnion is not suitable for production environments? 
Well, MediaOnion is still in development and, honestly, I am doing it for fun. I love media, I love coding, I love open source. MediaOnion is a good way to mix some of my passions.

In the tech/product side, I still believe Edge Origin servers should bring more intelligence to our delivery solutions and having something based on Node.js is helping to iterate and experiment new features very quickly. Development efficiency is the most critical point for me right now.

And why not, I also hope MediaOnion to be a good to start project for anyone that would like to get into understanding codec/muxers parsing and still is not "brave" enough to get into [ffmpeg](https://ffmpeg.org) source code. I would like to lower barriers for anyone willing to **experiment new and innovative concepts**: develop quick and try.

#### What's coming
**MediaOnion** in each current status is **just the beginning**. Most of open source media servers are offering similar functionality since 4-5 years ago. Some of the experimental features I am working on will help MediaOnion to exceed the (delivery) eficiency of classical and known media servers:
  - On the fly smart content preparation.
  - Self-managed Multi device/Multi screen delivery.
  - Dynamic and automated A/B (and C, D, etc) testing your video content preparation/delivery service.
  - In general, **data gathering as the key to take optimal decisions**. Data driven autonomous solutions take smarter decisions than us. Yes, I didnd't use the hackneyed *AI* keyword intentionally. Ouch!

## Getting Started
One of the strongest point of MediaOnion is how easy it is to get started with. Two options available:

### Docker
```bash
# Build docker image
$ docker build -t mediaonion .

# Launch it indicating video repository and config locations
$ docker run -p 8080:8080 -v $PWD/media:/app/media -v $PWD/conf:/app/conf mediaonion
```
### Built from source code
```bash
$ npm run install
$ npm run build
$ node dist/index.js --file ./conf/default.json
```

## Configuration

```json
{
    "http": {
        "port": 8080,
        "cors": {
            "allowHeaders": ["*"],
            "exposeHeaders": ["Server" , "range" , "Content-Length", "Content-Range"],
            "allowMethods": ["GET", "HEAD", "OPTIONS"],
            "allowOrigin":["*"]
        },
        "cache": {
            "playlist": {
                "expiresIn": 10000,
                "lastModified": "Wed, 21 Oct 2015 07:28:00 GMT"
            }
        },
        "gzip": true
    },
    "applications": {
        "hls": {
            "originPath": "http://127.0.0.1:8000",
            "hlsMuxer": {
                "segmentLength": 10000,
                "absoluteBaseUrl": "http://localhost:8080",
                "absoluteIndexUrls": true,
                "absoluteSegmentUrls": false
            }
        }
    }
}
```

| Name     | Default value | Description                               |
|----------|---------------|-------------------------------------------|
| http.port                        |     8080      | HTTP listening port        |
| http.cors.allowHeaders           |               | Content of Access-Control-Allow-Headers HTTP header in response to a preflight request            |
| http.cors.exposeHeaders          |      ""         | Content of Access-Control-Expose-Headers HTTP header in response to a preflight request            |
| http.cors.allowMethods           |      ""         | Content of Access-Control-Allow-Methods HTTP header in response to a preflight request            |
| http.cors.allowOrigin            |      ""         | Content of Access-Control-Allow-Origin HTTP header in response to a preflight request             |
| http.cache.playlist.expiresIn    |      ""         | Control max-age field of the Cache-Control header returned as a response of an HTTP request for a playlist            |
| http.cache.playlist.lastModified |      ""         | Value of Last-Modified header returned as a response of an HTTP request for a playlist            |
| http.cache.segments.expiresIn    |      ""         | Control max-age field of the Cache-Control header returned as a response of an HTTP request for a segment           |
| http.cache.segments.lastModified |      ""         | Value of Last-Modified header returned as a response of an HTTP request for a segment             |
| http.gzip                        |               | If enabled playlist responses are delivered gzipped whenever the client is supporting it            |
| parser.cacheTTL                  | 86400 (1 day) | Cache, in seconds, for the metadata of origin files            |
| parser.initialReadSize           |   200 KB      | Whenever metadata for an origin file needs to be constructed, number of bytes to read of the origin file. To minimize number of read operations, and then reduce response time for not previously processed files, it is important initialReadSize is enough big to gather the MP4 required atoms in a first read for most of your files            |
| parser.maxBufferSize             |    16 MB      | Max number of bytes to read of an MP4 origin file to construct its associated metadata            |
| applications[].originPath        |   "./media"     | For any given app, path to look for your MP4 origin files. It could be a remote location (http or https) or a local absolute/relative path            |
| applications[].hlsMuxer.segmentLength                      |     10000         | Length, in milliseconds, of the HLS segments that should be generated by the HLS muxer            |
| applications[].hlsMuxer.extractAudio                       |     false          | If true, MediaOnion automatically generates an only audio rendition and add it to the master playlist           |
| applications[].hlsMuxer.absoluteIndexUrls                  |    false           | If true, index urls declared in the master playlist response will be defined as absolute urls           |
| applications[].hlsMuxer.absoluteSegmentUrls                |    false           | If true, segment urls declared in playlists responses will be defined as absolute urls            |
| applications[].hlsMuxer.absoluteBaseUrl                    |               | In case absolute urls are set up for playlist or segments, this config parameter contains the base of the absolute url to be used            |
| debug                            |      false    | If true, MediaOnion will log debug related info            |


## Accessing your media content
First, place your content (MP4 files) in any of the folders you defined in your configuration (originPath parameter).

The structure of the url's to access your content is:

### Single bitrate
```
http://<hostname>/<appId>/<relativePath>/<filename>/master.m3u8
```

Where:
* hostname. Hostname of the server running MediOnion. 
* appId. Id of the application defined in your configuration. 
* relativePath. In which relative path, below originPath, your content is placed.
* filename. Name of the media file.

Example. Assuming: 
* You are using the default configuration, in which you are defining a single app whose id is "hls"
* You place a file named example.mp4 in ./media/assets/example.mp4

``` bash
curl http://localhost:8080/hls/assets/example.mp4/master.m3u8 
```

### Multiple bitrate
```
http://<hostname>/<appId>/<relativePath>/<prefix>,<middle1>,<middle2>,<postfix>.csmil/master.m3u8
````

Where:
* hostname. Hostname of the server running MediOnion. 
* appId. Id of the application defined in your configuration. 
* relativePath. In which relative path, below originPath, your content is placed.
* prefix, middlex and postfix are used to declare the name of the files representing the renditions (same content, different bitrate/resolution) of your content.

Example. Assuming: 
* You are using the default configuration, in which you are defining a single app whose id is "hls"
* You place the files example_500k.mp4, example_1000k.mp4 and example_1500k.mp4 in ./media/assets/ which represent the same content transcoded at a different bitrate:

``` bash
curl http://localhost:8080/hls/assets/example_,500k,1000k,1500k,.mp4.csmil/master.m3u8 
```

## Prometheus
For monitoring purposes, MediaOnion implements and HTTP endpoint compatible with Prometheus. That endpoint is accessible from ```/api/metrics```