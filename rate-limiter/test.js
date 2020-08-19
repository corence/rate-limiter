
const expect = require('chai').expect;
const RateLimiter = require('./index').RateLimiter;

describe('rate limiter tests', () => {
  describe('test single hit', () => {
    it('should record one hit', () => {
      const rateLimiter = new RateLimiter(100, true);
      rateLimiter.recordHit('abc', Date.now());
      expect(rateLimiter.queryAddress('abc').hitCount).to.equal(1);
    });
  });
  describe('test other hit', () => {
    it('should record one thingie', () => {
      const rateLimiter = new RateLimiter(2, true);
      rateLimiter.recordHit('abc', 1);
      expect(rateLimiter.getBlockTime('abc')).to.equal(0);
      rateLimiter.recordHit('abc', 2);
      expect(rateLimiter.getBlockTime('abc')).to.equal(0);
      rateLimiter.recordHit('abc', 3);
      expect(rateLimiter.getBlockTime('abc')).to.equal(0);
      rateLimiter.recordHit('abc', 4);
      expect(rateLimiter.getBlockTime('abc')).to.equal(0);
      rateLimiter.recordHit('abc', 5);
      expect(rateLimiter.getBlockTime('abc')).to.equal(0);
      rateLimiter.recordHit('abc', 6);
      expect(rateLimiter.getBlockTime('abc')).to.equal(0);
    });
  });
});
