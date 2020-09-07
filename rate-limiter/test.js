
const expect = require('chai').expect;
const RateLimiter = require('./index').RateLimiter;

// Note that for a lot of these unit tests, we're providing absolute times (1, 2, 3).
// In real-world usage we'd probably be providing epoch timestamps (such as Date.now()) in place of these.
describe('rate limiter tests', () => {
  it('should record one hit', () => {
    const rateLimiter = new RateLimiter(2, 10); // 5 seconds between hits
    rateLimiter.recordHit('abc', 3);
    expect(rateLimiter.getClearTime('abc')).to.equal(8);
  });

  it('should return 0 block time for an unrecognized user', () => {
    const rateLimiter = new RateLimiter(2, 10);
    expect(rateLimiter.getBlockTimeRemaining('untracked user', 1)).to.equal(0);
  });

  it('should block a high-traffic user, while allowing the quieter user to proceed', () => {
    const rateLimiter = new RateLimiter(2, 10);
    rateLimiter.recordHit('too chatty', 1);
    rateLimiter.recordHit('well-behaved', 1);
    rateLimiter.recordHit('too chatty', 2);
    rateLimiter.recordHit('too chatty', 3);
    rateLimiter.recordHit('well-behaved', 3);
    rateLimiter.recordHit('too chatty', 4);

    expect(rateLimiter.getClearTime('too chatty')).to.equal(21);
    expect(rateLimiter.getBlockTimeRemaining('too chatty', 5)).to.equal(6);

    expect(rateLimiter.getClearTime('well-behaved')).to.equal(11);
    expect(rateLimiter.getBlockTimeRemaining('well-behaved', 5)).to.equal(0);
  });

  it('should unblock a high-traffic user once they have calmed down', () => {
    const rateLimiter = new RateLimiter(2, 10);
    rateLimiter.recordHit('abc', 1);
    rateLimiter.recordHit('abc', 2);
    rateLimiter.recordHit('abc', 3);
    rateLimiter.recordHit('abc', 4);
    rateLimiter.recordHit('abc', 5);
    rateLimiter.recordHit('abc', 6);

    expect(rateLimiter.getBlockTimeRemaining('abc', 5)).to.equal(16);
    expect(rateLimiter.getBlockTimeRemaining('abc', 5 + 15)).to.equal(1);
    expect(rateLimiter.getBlockTimeRemaining('abc', 5 + 16)).to.equal(0);
    expect(rateLimiter.getBlockTimeRemaining('abc', 5 + 17)).to.equal(0);
  });

  it('should ignore previous recorded hits if they were so long ago that they could be cleared away', () => {
    const rateLimiter = new RateLimiter(2, 10);
    rateLimiter.recordHit('abc', 1);
    rateLimiter.recordHit('abc', 2);
    rateLimiter.recordHit('abc', 3);
    rateLimiter.recordHit('abc', 4);
    rateLimiter.recordHit('abc', 5);
    rateLimiter.recordHit('abc', 6);
    rateLimiter.recordHit('abc', 65);

    expect(rateLimiter.getBlockTimeRemaining('abc', 65)).to.equal(0);
    expect(rateLimiter.getClearTime('abc')).to.equal(70);
  });

  it('should block for a multiple of the period if the user floods us with hits', () => {
    const rateLimiter = new RateLimiter(2, 10);
    rateLimiter.recordHit('abc', 1);
    rateLimiter.recordHit('abc', 2);
    rateLimiter.recordHit('abc', 3);
    rateLimiter.recordHit('abc', 4);
    rateLimiter.recordHit('abc', 5);
    rateLimiter.recordHit('abc', 6);

    expect(rateLimiter.getBlockTimeRemaining('abc', 6)).to.equal(15);
  });

  it('should expire records that are so old they cannot affect the results anymore', () => {
    const rateLimiter = new RateLimiter(2, 10);
    // it's important for us to test this with multiple addresses sharing a timestamp, because our multimap data structure is probably needed here to prevent lost records

    rateLimiter.recordHit('early bird', 1);
    rateLimiter.recordHit('partner in crime', 1);
    rateLimiter.recordHit('early bird', 2);
    rateLimiter.recordHit('partner in crime', 2);
    rateLimiter.recordHit('latecomer', 8);
    rateLimiter.recordHit('latecomer', 9);

    expect(rateLimiter.getClearTime('early bird')).to.equal(11);
    expect(rateLimiter.getClearTime('partner in crime')).to.equal(11);
    expect(rateLimiter.getClearTime('latecomer')).to.equal(18);

    rateLimiter.expireHits(10);
    expect(rateLimiter.debugCountTrackedAddresses()).to.deep.equal([3, 3]);

    rateLimiter.expireHits(12);
    expect(rateLimiter.debugCountTrackedAddresses()).to.deep.equal([1, 1]);

    rateLimiter.expireHits(19);
    expect(rateLimiter.debugCountTrackedAddresses()).to.deep.equal([0, 0]);
  });

  it('should keep its data structure sizes in sync, in the presence of identical timestamps', () => {
    // I noticed a bug in the tree multimap code so I realized we really need tests around it because the edge cases are obscure and perilous

    const rateLimiter = new RateLimiter(2, 10);
    expect(rateLimiter.debugCountTrackedAddresses()).to.deep.equal([0, 0]);

    rateLimiter.recordHit('first', 1);
    expect(rateLimiter.debugCountTrackedAddresses()).to.deep.equal([1, 1]);

    rateLimiter.recordHit('second', 1);
    expect(rateLimiter.debugCountTrackedAddresses()).to.deep.equal([2, 2]);

    rateLimiter.recordHit('third', 1);
    expect(rateLimiter.debugCountTrackedAddresses()).to.deep.equal([3, 3]);

    rateLimiter.recordHit('third', 2);
    expect(rateLimiter.debugCountTrackedAddresses()).to.deep.equal([3, 3]);

    rateLimiter.recordHit('first', 2);
    expect(rateLimiter.debugCountTrackedAddresses()).to.deep.equal([3, 3]);

    rateLimiter.recordHit('second', 2);
    expect(rateLimiter.debugCountTrackedAddresses()).to.deep.equal([3, 3]);
  });

  describe('expireOneHit', () => {
    it('should not cause problems when called on an empty rateLimiter', () => {
      const rateLimiter = new RateLimiter(2, 10);
      expect(rateLimiter.debugCountTrackedAddresses()).to.deep.equal([0, 0]);

      const result = rateLimiter.expireOneHit();
      expect(result).to.be.undefined;
      expect(rateLimiter.debugCountTrackedAddresses()).to.deep.equal([0, 0]);
    });

    it('should erase the record that will expire soonest', () => {
      const rateLimiter = new RateLimiter(2, 10);
      rateLimiter.recordHit('first', 1);
      rateLimiter.recordHit('second', 2);
      rateLimiter.recordHit('third', 3);

      expect(rateLimiter.getClearTime('first')).to.equal(6);
      expect(rateLimiter.getClearTime('second')).to.equal(7);
      expect(rateLimiter.getClearTime('third')).to.equal(8);

      let result = rateLimiter.expireOneHit();

      expect(result).to.equal('first');
      expect(rateLimiter.getClearTime('first')).to.be.undefined;
      expect(rateLimiter.getClearTime('second')).to.equal(7);
      expect(rateLimiter.getClearTime('third')).to.equal(8);

      result = rateLimiter.expireOneHit();

      expect(result).to.equal('second');
      expect(rateLimiter.getClearTime('first')).to.be.undefined;
      expect(rateLimiter.getClearTime('second')).to.be.undefined;
      expect(rateLimiter.getClearTime('third')).to.equal(8);

      result = rateLimiter.expireOneHit();

      expect(result).to.equal('third');
      expect(rateLimiter.getClearTime('first')).to.be.undefined;
      expect(rateLimiter.getClearTime('second')).to.be.undefined;
      expect(rateLimiter.getClearTime('third')).to.be.undefined;
    });
  });
});
