
const expect = require('chai').expect;
const RateLimiter = require('./index').RateLimiter;

describe('rate limiter tests', () => {
  describe('test single hit', () => {
    it('should record one hit', () => {
      const rateLimiter = new RateLimiter(100, true);
      rateLimiter.recordHit('abc');
      expect(rateLimiter.queryAddress('abc').hitCount).to.equal(1);
    });
  });
});
