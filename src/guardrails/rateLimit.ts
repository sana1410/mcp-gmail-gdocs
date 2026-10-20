interface RateBucket {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private buckets = new Map<string, RateBucket>();

  check(key: string, maxPerHour: number): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + 3600_000 });
      return { allowed: true };
    }

    if (bucket.count >= maxPerHour) {
      const minutesLeft = Math.ceil((bucket.resetAt - now) / 60_000);
      return {
        allowed: false,
        reason: `Rate limit exceeded for "${key}": ${maxPerHour}/hour. Try again in ~${minutesLeft} minutes.`,
      };
    }

    bucket.count++;
    return { allowed: true };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  resetAll(): void {
    this.buckets.clear();
  }
}
