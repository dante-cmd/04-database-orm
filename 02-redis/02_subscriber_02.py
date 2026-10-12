import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

pubsub = r.pubsub()
pubsub.subscribe("chat")
for message in pubsub.listen():
    if message["type"] == "message":
        print("Received:", message["data"])