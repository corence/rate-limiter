
class RateLimiter {
  constructor(maxHitsPerHour, countBlockedHits) {
    this.maxHitsPerHour = maxHitsPerHour;
    this.countBlockedHits = countBlockedHits;
    this.hitCounts = new Map();
  }

  // number of seconds between "acceptable" requests
  interval() {
    return 3600 / maxHitsPerHour;
  }

  recordHit(address) {
    // find the existing hit time and count for this address
    const now = Date.now();
    const existingRecord = this.hitCounts.get(address);

    if(existingRecord) {
      // decrease the recorded hit count based on elapsed time
      const elapsedTime = now - existingRecord.lastHitTime;
      const expiredHits = elapsedTime / this.interval();
      const newHitCount = Math.max(0, existingRecord.hitCount - expiredHits);

      this.hitCounts.put(address, { lastHitTime: now, hitCount: newHitCount });

      // if it's too high, return a failure indicating the number of seconds before the next request will be accepted
      if(newHitCount > this.maxHitsPerHour) {
        const blockedSecondsRemaining = (newHitCount - this.maxHitsPerHour) * this.interval();
        return blockedSecondsRemaining;
      } else {
        return null;
      }
    } else {
      this.hitCounts.put(address, { lastHitTime: now, hitCount: 1 });
      return null;
    }
  }
}

module.exports = {
  RateLimiter
};
