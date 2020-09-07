
const TreeMultiMap = require('jstreemap').TreeMultiMap;

// Erase a single key/value pair from the TreeMultiMap
// It's a shame this doesn't seem to exist in the class; it seems useful to me
function treeMultiMapErase(collection, key, value) {
  const end = collection.upperBound(key);
  let it = collection.lowerBound(key);
  while(!it.equals(end)) {
    if(value == it.value) {
      collection.erase(it);
      break;
    }
    it.next();
  }
}

// A class to record hits and advise whether a client should be rate limited.
// Each client is identified by an "address", which is any valid hashmap key.
class RateLimiter {
  // Constructor arguments:
  //   hitsPerPeriod: the maximum number of hits that will be tolerated within each period.
  //     If a client exceeds this many hits per period, they'll eventually start being blocked.
  //   period: the time period, in seconds, in which the "hitsPerPeriod" is considered tolerable.
  // Samples:
  //   new RateLimiter(100, 3600);
  //   This constructs a RateLimiter which restricts each client to 100 hits per hour.
  //   A client who sends 200 hits per hour will exceed the acceptable hit rate (and start being blocked) after half an hour.
  //   If that client immediately stops sending traffic, their ability to send hits will resume; their recorded hits will be fully cleared after one hour.
  //
  //   new RateLimiter(10, 360);
  //   This takes hits at the same rate as the previous rate limiter, but it has a lower threshold before it starts blocking, so it's more aggressive.
  //   If a user sends over 10 packets in any six minute timespan, they'll trigger a block. The above rate limiter wouldn't do so.
  //
  //   new RateLimiter(1, 10);
  //   This RateLimiter restricts its clients to one request per second.
  //   If they send less than this, they'll never be blocked.
  //   If they send 100 hits in the first 10 seconds, most of them will be blocked, and they'd need to wait 90 seconds before their hits stop being ignored.
  constructor(hitsPerPeriod, period) {
    this.interval = period / hitsPerPeriod; // the maximum timespan between hits before the client risks getting blocked
    this.period = period; // the time that must elapse for their recorded hits to fully dissipate
    
    // This tracks the "clear time" for each address. That is the time when all recorded activity by the address will dissipate to zero.
    this.addressesToClearTimes = new Map();

    // This tracks all of the addresses associated with a clear time. We need this to keep our memory usage from endlessly growing over time.
    this.clearTimesToAddresses = new TreeMultiMap();
  }

  // Get the timestamp when the accumulated hits from the named address will dissipate to zero, or undefined if it's not a tracked address
  getClearTime(address) {
    return this.addressesToClearTimes.get(address);
  }

  // Get the number of seconds the given address will be blocked from the given timestamp
  // If the address will not blocked at that timestamp, this returns 0
  getBlockTimeRemaining(address, time) {
    const clearTime = this.getClearTime(address);
    
    if(clearTime) {
      return Math.max(0, clearTime - time - this.period);
    } else {
      return 0;
    }
  }

  // Get the number of tracked addresses.
  countTrackedAddresses() {
    return this.addressesToClearTimes.size;
  }

  // Get the number of tracked addresses as a 2-element array. The two values should always be identical.
  // This method is not expected to be useful except when testing this module.
  debugCountTrackedAddresses() {
    return [this.addressesToClearTimes.size, this.clearTimesToAddresses.size];
  }

  // Record a hit against the given address at the given timestamp
  recordHit(address, hitTime) {
    const clearTime = this.addressesToClearTimes.get(address);

    let newClearTime = hitTime + this.interval;
    if(clearTime) {
      treeMultiMapErase(this.clearTimesToAddresses, clearTime, address);
      newClearTime = Math.max(hitTime, clearTime) + this.interval;
    }

    this.addressesToClearTimes.set(address, newClearTime);
    this.clearTimesToAddresses.insertMulti(newClearTime, address);
  }

  // At the given timestamp, erase all records whose clear time is in the past
  // Intended usage: this is generally useful to call just before each call to recordHit.
  // This amortizes the cost of the operation.
  // Worst-case time of this operation could be O(n * log(n)) where n is the number of entries expiring at once, but that would be a strange and degenerate case and it may be quite difficult for a hostile user to craft an attack based on this.
  expireHits(time) {
    let numResults = 0;
    const end = this.clearTimesToAddresses.upperBound(time);
    let it = this.clearTimesToAddresses.begin();
    while(!it.equals(end)) {
      const address = it.value;
      this.addressesToClearTimes.delete(address);
      this.clearTimesToAddresses.erase(it);
      it = this.clearTimesToAddresses.begin();
      ++numResults;
      // TODO: I couldn't find a way with this TreeMultiMap to erase an element and also advance the iterator to the following element.
      // We should be calling it.next(), but I couldn't figure out how, so we're calling it.begin().
      // This might be a mild performance issue but I guess it has the same hypothetical O(log(n)), and it's a red/black tree so
      // it's all going to be cache misses anyway.
    }
    return numResults;
  }

  // Expire the address which will clear soonest.
  // This can be useful if the rate limiter must run with a hard limit of memory usage.
  expireOneHit() {
    if(this.clearTimesToAddresses.size > 0) {
      const it = this.clearTimesToAddresses.begin();
      const address = it.value;
      this.addressesToClearTimes.delete(address);
      this.clearTimesToAddresses.erase(it);
      return address;
    }
  }
}

module.exports = {
  RateLimiter
};
