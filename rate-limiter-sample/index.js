const http = require('http');
const RateLimiter = require('../rate-limiter').RateLimiter;

const hostname = '127.0.0.1';
const port = 3000;
const rateLimiter = new RateLimiter(3, 10 * 1000, false);

const server = http.createServer((req, res) => {
  // This should get the IP address of the requester. It's grabbed from StackOverflow and might not work in all situations!
  const ipAddress = req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null);

  const now = Date.now();

  // We expire hits in the database which are no longer relevant. Doing it on every recorded hit spreads the cost so we expect this to be quite quick.
  rateLimiter.expireHits(now, 8);

  // Record the new hit
  rateLimiter.recordHit(ipAddress, now);

  // Hard limit the number of addresses we're tracking, because having our rate limiter DOS attacked would be simply tragic.
  if(rateLimiter.countTrackedAddresses() > 1000000) { // in this case we've decided to track no more than a million IP addresses
    // This returns the dropped IP address, which should probably be written to a log somewhere
    rateLimiter.expireOneHit();
  }

  // Finally, check if the IP address who raised the request should be blocked or permitted to use the service
  const blockTime = rateLimiter.getBlockTimeRemaining(ipAddress, now);

  if (blockTime > 0) {
    res.statusCode = 429;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Rate limit exceeded. Please try again in ' + (blockTime / 1000) + ' seconds.');
  } else {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    // for debugging, this can be handy:
    res.end('Hello World, ' + ipAddress + ', you have this many milliseconds tracked: ' + (rateLimiter.getClearTime(ipAddress) - now));
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
