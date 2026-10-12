import time
import redis

# 1. Connect to Redis
# Adjust host and port if your Redis instance runs elsewhere
client = redis.Redis(host='localhost', port=6379, decode_responses=True)

QUEUE_NAME = 'task_queue'

def consumer_process_tasks():
  """Simulates a consumer processing tasks from the Redis list."""
  print('\n--- Consumer: Processing tasks from the queue ---')

  # Check how many items are currently in the queue
  queue_length = client.llen(QUEUE_NAME)
  print(f'Total tasks in queue: {queue_length}')

  while True:
    # RPOP removes and returns the item from the right (tail) of the list.
    # This creates a First-In, First-Out (FIFO) queue.
    # Alternatively, use BRPOP for a blocking/waiting pop if you want it to idle.
    task = client.rpop(QUEUE_NAME)

    if not task:
      print('Queue is empty. All tasks processed!')
      break

    print(f'Processing -> {task}')
    # Simulate work
    time.sleep(1)
    print(f'Completed -> {task}\n')


if __name__ == '__main__':
  # Clear any leftover items for a clean run
  # client.delete(QUEUE_NAME)

  consumer_process_tasks()