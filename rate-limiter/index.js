
// A class to record hits and advise whether a client should be rate limited.
// Each client is identified by an "address", which is any valid hashmap key.
//
class RateLimiter {
  constructor(maxHitsPerHour, countBlockedHits) {
    this.maxHitsPerHour = maxHitsPerHour;
    this.countBlockedHits = countBlockedHits;
    this.hitCounts = new Map();
  }

  // number of seconds between "acceptable" requests
  interval() {
    return 3600 / this.maxHitsPerHour;
  }

  // this is a testing method that I'll probably remove, because it gives the caller mutable access to internals
  queryAddress(address) {
    return this.hitCounts.get(address);
  }

  // Get the number of seconds the given address will be blocked
  // If it's not blocked, this returns 0
  getBlockTime(address, time) {
    const record = this.hitCounts.get(address);

    if(record) {
      return Math.max(0, record.hitCount - this.maxHitsPerHour) * this.interval();
    } else {
      return 0;
    }
  }

  // Record a hit against the given address at the given time
  recordHit(address, hitTime) {
    // find the existing hit time and count for this address
    const existingRecord = this.hitCounts.get(address);

    if(existingRecord) {
      // decrease the recorded hit count based on elapsed time
      const elapsedTime = hitTime - existingRecord.lastHitTime;
      const expiredHits = elapsedTime / this.interval();
      const newHitCount = Math.max(1, 1 + existingRecord.hitCount - expiredHits);

      this.hitCounts.set(address, { lastHitTime: hitTime, hitCount: newHitCount });
    } else {
      this.hitCounts.set(address, { lastHitTime: hitTime, hitCount: 1 });
    }
  }
}

module.exports = {
  RateLimiter
};
