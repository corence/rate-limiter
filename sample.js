const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World');
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

const maxHitsPerHour = 100;
const interval = 3600 / maxHitsPerHour; // number of seconds between "acceptable" requests
const hitCounts = NEWHASHMAP; // for each address, 
const countBlockedHits = true; // whether we should be counting hits that were blocked by the rate limiter

function doRateLimit(address) {
  // find the existing hit time and count for this address
  const (lastHitTime, lastHitCount) = hitCounts.get(address);
  const now = SOMETHING();

  if(SOMETHING) {
    // decrease the hit count based on elapsed time
    const elapsedTime = now - lastHitTime;
    const expiredHits = elapsedTime / interval;
    const newHitCount = Math::max(0, lastHitCount - expiredHits);

    hitCounts.put(address, (now, newHitCount));

    // if it's too high, return a failure indicating the number of seconds before the next request will be accepted
    if(newHitCount > maxHitsPerHour) {
      const blockedSecondsRemaining = (newHitCount - maxHitsPerHour) * interval;
      return blockedSecondsRemaining;
    } else {
      return null;
    }
  } else {
    hitCounts.put(address, (now, 1));
    return null;
  }
}
