import time
import redis

# 1. Connect to Redis
# Adjust host and port if your Redis instance runs elsewhere
client = redis.Redis(host='localhost', port=6379, decode_responses=True)

QUEUE_NAME = 'task_queue'


def producer_add_tasks():
  """Simulates a producer adding tasks to the Redis list."""
  print('--- Producer: Adding tasks to the queue ---')
  tasks = [
      'Send email to user@example.com',
      'Generate monthly report',
      'Process payment #1042',
      'Resize uploaded image',
      'Backup database',
      'Clean up temporary files',
      'Update user profile',
      'Send notification to admin',
      'Archive old logs',
      'Run security scan'

  ]

  for task in tasks:
    # LPUSH adds the item to the left (head) of the list
    client.lpush(QUEUE_NAME, task)
    print(f'Queued: {task}')
    time.sleep(1)


if __name__ == '__main__':
  # Clear any leftover items for a clean run
  client.delete(QUEUE_NAME)

  # Run producer and consumer workflow
  producer_add_tasks()