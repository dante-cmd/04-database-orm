# Redis Explained — with Docker & Python Exercises

## Part 1: What Redis Actually Is

**Redis** (REmote DIctionary Server) is an **in-memory data structure store**. Think of it as a giant, networked, persistent Python dict — but with much richer value types than plain strings.

Key characteristics:

| Property | What it means |
|---|---|
| **In-memory** | Data lives in RAM → ~microsecond reads/writes. Speed is the whole point. |
| **Single-threaded (commands)** | One command executes at a time → operations are atomic, no locks needed. |
| **Persistent (optional)** | Can snapshot (RDB) or log (AOF) to disk — it's not *just* a cache. |
| **Networked** | Runs as a server; many clients/processes/machines share the same data. |
| **Data structures, not just strings** | Strings, Hashes, Lists, Sets, Sorted Sets, Streams, etc. |

**Typical use cases:** caching, session storage, rate limiting, leaderboards, job queues, pub/sub messaging, distributed locks, counters.

---

## Part 2: Setup with Docker

### Run Redis

```bash
# Start a Redis container, name it "redis-lab", map port 6379
docker run -d --name redis-lab -p 6379:6379 redis:7-alpine

# Check it's running
docker ps

# (Optional) hop into the built-in CLI to poke around directly
docker exec -it redis-lab redis-cli
```

Try in `redis-cli`:

```
SET name "Ada"
GET name
INCR visits
INCR visits
GET visits
```

### Python client

```bash
pip install redis
```

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)
# decode_responses=True → get str back instead of bytes

r.set("greeting", "hello redis")
print(r.get("greeting"))   # 'hello redis'
```

**📝 Exercise 0 (warm-up):** Start the container, connect from Python, and verify with `r.ping()` (returns `True`). Then write a key, read it back, and confirm it also exists via `redis-cli GET` inside Docker — proving Python and the CLI see the *same* data.

---

## Part 3: The Core Data Types (with exercises for each)

### 1. Strings — counters, flags, simple values

```python
r.set("page:home:views", 0)
r.incr("page:home:views")        # atomic increment — safe under concurrency
r.incrby("page:home:views", 10)
r.set("token:abc", "user42", ex=3600)   # auto-expire in 1 hour
r.ttl("token:abc")                      # return seconds until expiry
                                        # "What is the Time-To-Live (TTL)—the remaining lifespan in seconds—for the key named token:abc?"
                                        # posible values: > 0 (token is valid for another x seconds),-1 (Token exists, but has no expiration time set.), else -2 (Token is invalid or expired (does not exist).)
```


Key idea: `INCR` is **atomic**. Two processes incrementing simultaneously can never lose an update — no race conditions. This is Redis's superpower.

**📝 Exercise 1 — Page view counter:** Simulate 5 "requests" that each increment a view counter, then read the total. Then give a session key `session:xyz` a TTL of 5 seconds, `time.sleep(6)`, and show it disappeared.

### 2. Hashes — objects/records

A hash is a mini-dict stored under one key. Perfect for user records.

```python
r.hset("user:1001", mapping={"name": "Ada", "email": "ada@example.com", "plan": "pro"})
r.hget("user:1001", "name")       # 'Ada'
r.hgetall("user:1001")            # {'name': 'Ada', 'email': ..., 'plan': 'pro'}
r.hincrby("user:1001", "login_count", 1)
```

> Convention: keys use `entity:id` naming (`user:1001`, `order:55`). Redis has no tables — *you* define the structure via key names.

**📝 Exercise 2 — User profile store:** Write `create_user(id, data)`, `get_user(id)`, and `update_user(id, field, value)` functions using hashes. Add a `visits` field that increments atomically with `HINCRBY`.

### 3. Lists — queues and timelines

Ordered, push/pop from either end. `LPUSH`/`RPOP` = queue (FIFO); `LPUSH`/`LPOP` = stack.

```python
r.rpush("jobs", "job1", "job2", "job3")   # enqueue
job = r.lpop("jobs")                       # dequeue → 'job1'

# Blocking pop — worker waits until a job appears (no polling!)
job = r.blpop("jobs", timeout=30)          # returns (key, value) or None
```

**📝 Exercise 3 — Task queue:** Build a producer that pushes 10 task names onto `queue:tasks`, and a worker that uses `BLPOP` to consume them one by one, printing each. Run the worker first in one script, the producer in another — see the worker unblock in real time.

### 4. Sets — uniqueness and membership

```python
r.sadd("user:1001:tags", "python", "redis", "docker")
r.sadd("user:1002:tags", "redis", "go")
r.smembers("user:1001:tags")
r.sinter("user:1001:tags", "user:1002:tags")   # {'redis'} — shared tags
r.sismember("user:1001:tags", "docker")        # True
```

**📝 Exercise 4 — Unique visitors:** Track unique visitors per article with `SADD article:1:visitors <user_id>`. Add duplicate IDs — show the count (`SCARD`) only counts each user once. Bonus: find users who visited *both* article 1 and article 2 with `SINTER`.

### 5. Sorted Sets — leaderboards

Every member has a numeric **score**; Redis keeps everything sorted automatically. O(log n) inserts.

```python
r.zadd("leaderboard", {"alice": 120, "bob": 95, "carol": 200})
r.zincrby("leaderboard", 30, "alice")            # alice: 150
r.zrevrange("leaderboard", 0, 2, withscores=True)  # top 3, highest first
r.zrank("leaderboard", "bob")                     # rank position
```

**📝 Exercise 5 — Game leaderboard:** Add 8 players with random scores. Implement `top_n(n)`, `player_rank(name)`, and `add_score(name, points)` (atomic increment). Then query "players with scores between 100 and 300" using `ZRANGEBYSCORE`.

---

## Part 4: The #1 Use Case — Caching

The **cache-aside** pattern is the most common Redis usage in the real world:

```python
import json, time

def get_product(product_id):
    key = f"product:{product_id}"

    # 1. Try cache
    cached = r.get(key)
    if cached:
        print("CACHE HIT")
        return json.loads(cached)

    # 2. Miss → go to the "database" (slow!)
    print("CACHE MISS — hitting DB")
    product = slow_db_query(product_id)     # imagine 200ms

    # 3. Store in cache with TTL, then return
    r.set(key, json.dumps(product), ex=60)  # expire after 60s
    return product

def slow_db_query(pid):
    time.sleep(0.2)
    return {"id": pid, "name": "Keyboard", "price": 79.99}
```

Why TTL matters: without expiry, stale data lives forever. TTL = your staleness budget.

**📝 Exercise 6 — Cache with metrics:** Extend the cache-aside code to track hits and misses in Redis itself (`INCR stats:hits` / `stats:misses`). Call `get_product` for IDs [1, 1, 2, 2, 1, 3] and print the final hit ratio.

---

## Part 5: Pub/Sub — Real-Time Messaging

Redis can broadcast messages to subscribers (fire-and-forget — no persistence):

```python
# subscriber.py
pubsub = r.pubsub()
pubsub.subscribe("notifications")
for message in pubsub.listen():
    if message["type"] == "message":
        print("Received:", message["data"])

# publisher.py (run in another process/terminal)
r.publish("notifications", "New order arrived!")
```

**📝 Exercise 7 — Chat broadcast:** Run two subscriber scripts listening on channel `chat`, then publish messages from a third script. Observe: if a subscriber starts *after* a message is published, it never sees it (unlike a queue). When would you choose a List-queue vs Pub/Sub?

---

## Part 6: Atomicity — Transactions & Pipelines

```python
# Pipeline: batch commands, one network round-trip (huge perf win)
pipe = r.pipeline()
for i in range(1000):
    pipe.set(f"key:{i}", i)
pipe.execute()

# MULTI transaction: all commands execute atomically (or use WATCH for optimistic locking)
pipe = r.pipeline(transaction=True)   # transaction=True is the default
pipe.incr("account:a:balance", -50)
pipe.incr("account:b:balance", 50)
pipe.execute()
```

**📝 Exercise 8 — Money transfer:** Implement `transfer(from_acct, to_acct, amount)` using a transaction so both balance updates happen atomically. Before writing the atomic version, deliberately do two separate `INCRBY` calls and discuss: what happens if the server crashes between them?

---

## Part 7: Capstone Exercises

**Exercise 9 — Rate limiter.** Limit an API to 5 requests per user per 60 seconds. Hints: key like `rate:<user_id>`; `INCR` it, and set `EX 60` only on the *first* increment (when count == 1). Reject when count > 5.

**Exercise 10 — Session store.** Build login/logout: `login(user_id)` creates a session token (`uuid4().hex`) stored as `session:<token> → user_id` with 30-min TTL; `get_current_user(token)` returns the user or None; `logout(token)` deletes the key. Bonus: `GETDEL` or refresh TTL on activity.

**Exercise 11 — Distributed lock.** Two workers fight over a shared resource. Use `r.set("lock:resource", worker_id, nx=True, ex=10)` — `nx` means "only set if not exists" (the lock acquire), `ex` prevents deadlocks if a worker crashes. Delete the key to release. Explain why `nx` is essential.

**Exercise 12 — Mini URL shortener (capstone).** Combine everything:
- `shorten(long_url)` → generate a short code, store `url:<code> → long_url` (string), and per-code stats (hash: clicks, created_at)
- `resolve(code)` → look up the URL, atomically increment its click counter, return the URL
- `top_urls(n)` → sorted set `url:clicks` tracking the most-clicked links
- Cache hot resolutions with a short TTL

---

## Quick Reference

| Data type | Commands | Use for |
|---|---|---|
| String | `SET GET INCR EXPIRE TTL` | Counters, cache, tokens |
| Hash | `HSET HGET HGETALL HINCRBY` | Records/objects |
| List | `LPUSH RPUSH LPOP BLPOP` | Queues, recent items |
| Set | `SADD SMEMBERS SINTER SISMEMBER` | Tags, unique membership |
| Sorted Set | `ZADD ZINCRBY ZREVRANGE` | Leaderboards, rankings |
| Pub/Sub | `PUBLISH SUBSCRIBE` | Live events |
| Pipeline/Tx | `pipeline()`, `WATCH`/`MULTI` | Batching, atomicity |

**Key-naming cheat sheet:** `object:id:field` → `user:42:sessions`, `article:7:visitors`. Colons are pure convention but universally used.

Want worked solutions for any exercise, or the capstone built out as a complete runnable project (docker-compose + Python files)?