import { Queue } from "bullmq";
import IORedis from "ioredis";

let _connection: IORedis | null = null;

function getConnection(): IORedis {
  if (!_connection) {
    _connection = new IORedis({
      host: process.env.REDIS_HOST ?? "localhost",
      port: parseInt(process.env.REDIS_PORT ?? "6379"),
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
  }
  return _connection;
}

let _queues: ReturnType<typeof createQueues> | null = null;

function createQueues() {
  const connection = getConnection();
  return {
    generation: new Queue("generation", { connection }),
    publishing: new Queue("publishing", { connection }),
    analytics: new Queue("analytics", { connection }),
  };
}

export function getQueues() {
  if (!_queues) _queues = createQueues();
  return _queues;
}

// Named export for convenience
export const queues = {
  get generation() { return getQueues().generation; },
  get publishing() { return getQueues().publishing; },
  get analytics() { return getQueues().analytics; },
};

export { getConnection as redisConnection };
