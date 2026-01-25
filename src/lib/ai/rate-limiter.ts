const AI_RATE_LIMIT = {
  maxPerMinute: 30,
  windowMs: 60 * 1000,
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterMs?: number
}

class AIRateLimiter {
  private timestamps: number[] = []

  checkLimit(): RateLimitResult {
    const now = Date.now()
    // Remove timestamps older than window
    this.timestamps = this.timestamps.filter(
      (t) => now - t < AI_RATE_LIMIT.windowMs
    )

    if (this.timestamps.length >= AI_RATE_LIMIT.maxPerMinute) {
      const oldestInWindow = this.timestamps[0]
      const retryAfterMs = AI_RATE_LIMIT.windowMs - (now - oldestInWindow)
      return { allowed: false, retryAfterMs }
    }

    this.timestamps.push(now)
    return { allowed: true }
  }
}

// Global singleton
export const aiRateLimiter = new AIRateLimiter()
