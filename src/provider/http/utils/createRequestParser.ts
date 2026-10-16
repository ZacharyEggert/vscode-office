import { RestClientSettings } from "../models/configurationSettings";
import { RequestParser } from "../models/requestParser";
import { CurlRequestParser } from "./curlRequestParser";
import { HttpRequestParser } from "./httpRequestParser";

const curlRegex = /^\s*curl/i;

export function createRequestParser(rawHttpRequest: string): RequestParser {
  const settings = RestClientSettings.Instance;
  if (curlRegex.test(rawHttpRequest)) {
    return new CurlRequestParser(rawHttpRequest, settings);
  }
  return new HttpRequestParser(rawHttpRequest, settings);
}
