
Hi! I'm Jessica and this is my rate limiter npm module.

## Installation
 - install node and npm if that's not yet installed
 - git clone this repo
 - in the repo, `cd rate-limiter`
 - `npm install`

### Running the unit tests
this should work:

 - from the base folder of this repo,
 - `npm install -g mocha`
 - `cd rate-limiter`
 - `npm install`
 - `mocha`

(i'm sure the second step could be skipped, as `mocha` is in the devDependencies so it's being installed locally anyway, but running the tests was fiddly and I couldn't figure out how to make npm happy so I hacked in a global install)

### Running the sample project
 - from the base folder of this repo,
 - `node rate-limiter-sample/index.js`
 - then direct your browser to `http://localhost:3000/`
 - refresh the page about 200 times until you get yourself rate limited

## Design ideas and tradeoffs

### nodejs

I picked node primarily because I knew it's quick in Node to get an HTTP server running. Hehehe. So at least I knew I wouldn't be struggling too much to get a sample project up and running. And I wanted a real live server to allow manual testing. (This turned out to be a great choice -- my last-minute manual testing showed me that I'd mixed up seconds with milliseconds. Oops.)

### DOS attacks

I've made the assumption that a rate limiter is _usually_ intended to protect against unexpected or hostile usage patterns from the general public.

As such, a lot of the design went into trying to make sure the rate limiter itself doesn't become a victim of DOS attacks (intentional or otherwise).

Since there's no information about the specs of the machine that the rate limiter would be running on, I also tried to leave several performance/memory decisions in the hands of the caller, so that it could run on a raspberry pi if it's useful there for some reason.

#### expireHits

I think that the `expireHits` method grants a lot of defense against exhausting our resources without adding much risk of unintentionally misusing them.

Sample use-case: if the rate limiter runs for ten years, with totally new clients appearing each day, we do not want those addresses to accumulate indefinitely -- they need to be cleared away in order to make sure we don't overload our memory.

I'd considered some fairly primitive ways to expire inactive clients -- such as pulling a few off a queue and re-adding them to the queue if they're not expired -- as ultimately this doesn't need to be up-to-the-minute precise and it'd be fine if we let them tarry a little longer than needed. But I was concerned about some kind of degenerate cases that I hadn't considered, so I ended up pulling in a multimap data structure so that we could track this correctly.

### expireOneHit

As a bonus, the TreeMultiMap made it trivially easy to implement another form of protection I'd been wanting -- hard-capping the number of tracked addresses. This one is intended to never actually be used in normal usage but I wanted to protect against a malicious actor who floods our rate limiter with too many unique addresses.

### tracking for each individual address

At first I'd considered recording every single timestamp for an address, but it would add another vulnerability to malicious actors and be difficult to manage total memory usage. So I went through a few iterations until I arrived at the latest design: tracking the time at which each address will reset to zero activity. Once I'd changed to this number, the testing code was vastly simplified and a lot of calculations disappeared from the code, making it much harder to write trivial/silly bugs.

### Scope boundaries

 - The rate limiter module itself doesn't actually return a 429 http status. It's designed to be protocol-agnostic and as such, it's up to the caller to prepare the http response (as seen in the sample project).
 - The caller is also responsible for presenting any hashable javascript object (string, etc) which can uniquely identify a client. Whether an IP address or any other unique identification mode is sufficiently reliable for this is left up to the caller.

## Documentation

In the rate limiter module, in `index.js`, I've added comments above each class and method to describe their intended usage.

The intent of these is approximately like javadoc comments. Actually -- I don't really recall if the nodejs default install comes with a documentation generator tool; I figured it'd be safe to ignore the step of actually commenting in the correct format to generate documentation.

