
const expect = require('chai').expect;
const RateLimiter = require('./index').RateLimiter;

describe('rate limiter tests', () => {
  describe('test single hit', () => {
    it('should record one hit', () => {
      const rateLimiter = new RateLimiter(2, true);
      rateLimiter.recordHit('abc', Date.now());
      expect(rateLimiter.queryAddress('abc').hitCount).to.equal(1);
    });
  });
  describe('multi-user tests', () => {
    it('should return 0 block time for an unrecognized user', () => {
      const rateLimiter = new RateLimiter(2, true);
      expect(rateLimiter.getBlockTime('untracked user')).to.equal(0);
    });

    it('should only block the high-traffic user', () => {
      const rateLimiter = new RateLimiter(2, true);
      rateLimiter.recordHit('too chatty', 1);
      rateLimiter.recordHit('too chatty', 2);
      rateLimiter.recordHit('too chatty', 3);
      rateLimiter.recordHit('well-behaved', 4);
      rateLimiter.recordHit('well-behaved', 5);
      expect(rateLimiter.getBlockTime('too chatty')).to.be.greaterThan(0);
      expect(rateLimiter.getBlockTime('well-behaved')).to.equal(0);
      expect(rateLimiter.getBlockTime('silent')).to.equal(0);
    });
  });
  describe('scenarios', () => {
    it('should unblock if we wait out the rest of the period before sending more', () => {
      const rateLimiter = new RateLimiter(2, true);
      rateLimiter.recordHit('abc', 1);
      rateLimiter.recordHit('abc', 2);
      rateLimiter.recordHit('abc', 3);
      expect(rateLimiter.getBlockTime('abc')).to.be.greaterThan(0);
      rateLimiter.recordHit('abc', 3601);
      expect(rateLimiter.getBlockTime('abc')).to.equal(0);
    });

    it('should stay blocked if not quite time has elapsed to unblock', () => {
      const rateLimiter = new RateLimiter(2, true);
      rateLimiter.recordHit('abc', 1);
      rateLimiter.recordHit('abc', 2);
      rateLimiter.recordHit('abc', 3);
      expect(rateLimiter.getBlockTime('abc')).to.be.greaterThan(0);
      rateLimiter.recordHit('abc', 3599);
      expect(rateLimiter.getBlockTime('abc')).to.be.greaterThan(0);
    });

    it('should start blocking when a stream of hits flows in', () => {
      const rateLimiter = new RateLimiter(2, true);
      rateLimiter.recordHit('abc', 1);
      rateLimiter.recordHit('abc', 2);
      expect(rateLimiter.getBlockTime('abc')).to.equal(0);

      // after one more hit, it should fail because we've exceeded 2 hits per hour
      rateLimiter.recordHit('abc', 3);
      expect(rateLimiter.getBlockTime('abc')).to.be.greaterThan(0);
    });
  });
});
