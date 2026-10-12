import json, time
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def get_product(product_id):
    key = f"product:{product_id}"

    # 1. Try cache
    cached = r.hgetall(key)
    if cached:
        r.hincrby(key, "hit", 1)
        print("CACHE HIT")
        product = cached['product']
        return json.loads(product)

    # 2. Miss → go to the "database" (slow!)
    print("CACHE MISS — hitting DB")
    r.hincrby(key, "miss", 1)
    product = slow_db_query(product_id)     # imagine 200ms

    # 3. Store in cache with TTL, then return
    r.hset(key, mapping={"product": json.dumps(product)})  # expire after 6s
    return product

def slow_db_query(pid):
    time.sleep(0.2)
    return {"id": pid, "name": "Keyboard", "price": 79.99}


if __name__ == "__main__":
    for product_id in [1, 1 , 2, 2, 1, 3]:
        product = get_product(product_id)
        # print(product)
        # time.sleep(1)
    for product_id in [1, 2, 3]:
        key = f"product:{product_id}"
        print(f"Stats for {key}: {r.hgetall(key)}")
        hit = int(r.hget(key, 'hit')) if r.hget(key, 'hit') is not None else 0
        miss = int(r.hget(key, 'miss')) if r.hget(key, 'miss') is not None else 0
        if miss != 0:
            print(f"Hit/Miss Ratio for {key}: {hit/miss}")
        else:
            print(f"Hit/Miss Ratio for {key}: 0")
        r.delete(key)  # cleanup

    # print(get_product(42))  # CACHE MISS
    # print(get_product(42))  # CACHE HIT
    # time.sleep(7)
    # print(get_product(42))  # CACHE MISS (expired)
