import type { FileCache } from "./FileCache.js";

export interface HttpClientOptions {
  cache: FileCache;
  userAgent: string;
  defaultTtlSeconds: number;
}

export interface CachedHttpResponse {
  url: string;
  status: number;
  contentType: string;
  body: string;
  fromCache: boolean;
}

export class HttpClient {
  constructor(private readonly options: HttpClientOptions) {}

  async getText(url: string, ttlSeconds = this.options.defaultTtlSeconds) {
    const key = `GET ${url}`;
    const cached = await this.options.cache.get<Omit<CachedHttpResponse, "fromCache">>(
      key,
      ttlSeconds,
    );
    if (cached) return { ...cached, fromCache: true };

    const response = await fetch(url, {
      headers: {
        Accept: "text/markdown, application/json, text/plain, */*",
        "User-Agent": this.options.userAgent,
      },
    });
    const body = await response.text();

    if (!response.ok) {
      throw new Error(`Apple request failed: ${response.status} ${response.statusText}\n${body}`);
    }

    const payload = {
      url,
      status: response.status,
      contentType: response.headers.get("content-type") ?? "",
      body,
    };
    await this.options.cache.set(key, payload);
    return { ...payload, fromCache: false };
  }

  async postJson(url: string, body: object, ttlSeconds = this.options.defaultTtlSeconds) {
    const key = `POST ${url} ${JSON.stringify(body)}`;
    const cached = await this.options.cache.get<Omit<CachedHttpResponse, "fromCache">>(
      key,
      ttlSeconds,
    );
    if (cached) return { ...cached, fromCache: true };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": this.options.userAgent,
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Apple search failed: ${response.status} ${response.statusText}\n${text}`);
    }

    const payload = {
      url,
      status: response.status,
      contentType: response.headers.get("content-type") ?? "",
      body: text,
    };
    await this.options.cache.set(key, payload);
    return { ...payload, fromCache: false };
  }
}
