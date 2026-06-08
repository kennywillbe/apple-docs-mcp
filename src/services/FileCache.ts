import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export interface CacheOptions {
  cacheDir: string;
  defaultTtlSeconds: number;
}

export interface CacheStatus {
  cacheDir: string;
  files: number;
  bytes: number;
  defaultTtlSeconds: number;
}

type CachedValue<T extends object> = T & {
  fetchedAt: number;
};

export class FileCache {
  constructor(private readonly options: CacheOptions) {}

  async get<T extends object>(key: string, ttlSeconds = this.options.defaultTtlSeconds) {
    if (ttlSeconds <= 0) return null;

    try {
      const raw = await fs.readFile(this.cachePathFor(key), "utf8");
      const cached = JSON.parse(raw) as CachedValue<T>;
      const ageSeconds = (Date.now() - cached.fetchedAt) / 1000;
      if (ageSeconds > ttlSeconds) return null;
      return cached;
    } catch {
      return null;
    }
  }

  async set<T extends object>(key: string, value: T): Promise<void> {
    await this.ensureCacheDir();
    await fs.writeFile(
      this.cachePathFor(key),
      JSON.stringify({ ...value, fetchedAt: Date.now() }, null, 2),
      "utf8",
    );
  }

  async status(): Promise<CacheStatus> {
    await this.ensureCacheDir();
    const files = await fs.readdir(this.options.cacheDir);
    let bytes = 0;

    for (const file of files) {
      try {
        const stat = await fs.stat(path.join(this.options.cacheDir, file));
        if (stat.isFile()) bytes += stat.size;
      } catch {
        // File may disappear between readdir and stat.
      }
    }

    return {
      cacheDir: this.options.cacheDir,
      files: files.length,
      bytes,
      defaultTtlSeconds: this.options.defaultTtlSeconds,
    };
  }

  async clear(): Promise<number> {
    await this.ensureCacheDir();
    const files = await fs.readdir(this.options.cacheDir);
    await Promise.all(
      files.map((file) => fs.unlink(path.join(this.options.cacheDir, file)).catch(() => {})),
    );
    return files.length;
  }

  private async ensureCacheDir(): Promise<void> {
    await fs.mkdir(this.options.cacheDir, { recursive: true });
  }

  private cachePathFor(key: string): string {
    const hash = createHash("sha256").update(key).digest("hex");
    return path.join(this.options.cacheDir, `${hash}.json`);
  }
}
