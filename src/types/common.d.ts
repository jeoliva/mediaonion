import * as http from "http";
import { UrlWithParsedQuery } from "url";
import { ApplicationParameters } from "../config/config";

export interface CustomIncomingMessage extends http.IncomingMessage {
    customUrl: string;
    customAppId: string;
    customApp: ApplicationParameters;
    customParsedUrl: UrlWithParsedQuery;
}