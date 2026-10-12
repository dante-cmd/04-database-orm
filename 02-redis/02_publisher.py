import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)



# publisher.py (run in another process/terminal)
r.publish("chat", "Hello from publisher!")
