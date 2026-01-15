/**
 * Cache Layer for Web Context
 * 
 * Implements LRU cache with fallback to Redis (when available).
 * Used to cache npm package info and security advisories.
 */

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

export class LRUCache<K, V> {
  private cache: Map<K, { value: V; timestamp: number }>;
  private maxSize: number;
  private ttl: number;

  constructor(options?: CacheOptions) {
    this.cache = new Map();
    this.maxSize = options?.maxSize ?? 1000;
    this.ttl = options?.ttl ?? 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  get(key: K): V | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.value;
  }

  set(key: K, value: V): void {
    // If already exists, delete it (will be re-added at end)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // If cache is full, remove least recently used (first entry)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Redis Cache (optional, requires Redis connection)
 * 
 * Usage: Set REDIS_URL env var to enable
 * Example: REDIS_URL=redis://localhost:6379
 */
export class RedisCache<K extends string, V> {
  private client: any;
  private ttl: number;
  private enabled: boolean;

  constructor(options?: CacheOptions) {
    this.ttl = options?.ttl ?? 7 * 24 * 60 * 60; // 7 days in seconds
    this.enabled = false;

    // Try to initialize Redis (optional)
    try {
      if (process.env.REDIS_URL) {
        // Lazy-load redis client to avoid hard dependency
        // In production: const redis = require('redis');
        // const client = redis.createClient({ url: process.env.REDIS_URL });
        // this.client = client;
        // this.enabled = true;
        this.enabled = false; // Disabled until redis is added to deps
      }
    } catch {
      this.enabled = false;
    }
  }

  async get(key: K): Promise<V | null> {
    if (!this.enabled || !this.client) {
      return null;
    }

    try {
      const data = await this.client.get(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch {
      return null;
    }
  }

  async set(key: K, value: V): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      await this.client.setEx(key, this.ttl, JSON.stringify(value));
    } catch {
      // Silently fail - cache is not critical
    }
  }

  async clear(): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      await this.client.flushAll();
    } catch {
      // Silently fail
    }
  }
}

/**
 * Hybrid Cache: tries Redis first, falls back to LRU
 */
export class HybridCache<K extends string, V> {
  private redisCache: RedisCache<K, V>;
  private lruCache: LRUCache<K, V>;

  constructor(options?: CacheOptions) {
    this.redisCache = new RedisCache(options);
    this.lruCache = new LRUCache(options);
  }

  async get(key: K): Promise<V | null> {
    // Try Redis first
    const redisValue = await this.redisCache.get(key);
    if (redisValue) {
      return redisValue;
    }

    // Fall back to LRU
    return this.lruCache.get(key);
  }

  async set(key: K, value: V): Promise<void> {
    // Write to both caches
    await this.redisCache.set(key, value);
    this.lruCache.set(key, value);
  }

  async clear(): Promise<void> {
    await this.redisCache.clear();
    this.lruCache.clear();
  }
}

/**
 * Global cache instance for web context
 */
export const webContextCache = new HybridCache<string, any>({
  ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxSize: 5000, // LRU: max 5000 packages
});
