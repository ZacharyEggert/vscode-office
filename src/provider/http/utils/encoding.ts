export function encodeUrl(uri: string): string {
  try {
    return new URL(uri).href;
  } catch {
    return uri.replace(/[^\w\-._~:/?#[\]@!$&'()*+,;=%]/g, encodeURIComponent);
  }
}

export function base64(text: string | Buffer): string {
  const buffer = Buffer.isBuffer(text) ? text : Buffer.from(text);
  return buffer.toString("base64");
}

export function isJSONString(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}
