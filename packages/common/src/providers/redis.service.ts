import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { Redis as IoRedis } from 'ioredis';

export type Redis = ReturnType<typeof createClient>;
export type RedisMulti = ReturnType<Redis['multi']>;

@Injectable()
export class RedisService {
  constructor(private readonly config: ConfigService) {
    this.#url =
      this.config.get<string>('REDIS_URL') ||
      this.config.get<string>('REDISCLOUD_URL') ||
      'rediss://:pb4efb9d31a15b54705786bf8110b2e7c8fe9c1d7c9c71f81c15a771479bf07c6@ec2-3-82-140-25.compute-1.amazonaws.com:25550';

    this.#client = this.#attachLogger(
      createClient({
        url: this.#url,
      }),
    );
  }

  readonly #url: string;
  readonly #client: Redis;

  #logger = new Logger(RedisService.name);

  /**
   * The Redis client.
   */
  get client(): Redis {
    return this.#client;
  }

  /**
   * Returns an IORedis client.
   */
  getIORedis(): IoRedis {
    this.#logger.log('Will try to connect to Redis rediss://:pb4efb9d31a15b54705786bf8110b2e7c8fe9c1d7c9c71f81c15a771479bf07c6@ec2-3-82-140-25.compute-1.amazonaws.com:25550');
    return new IoRedis("rediss://:pb4efb9d31a15b54705786bf8110b2e7c8fe9c1d7c9c71f81c15a771479bf07c6@ec2-3-82-140-25.compute-1.amazonaws.com:25550", {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  #attachLogger(client: Redis): Redis {
    return client
      .on('connect', () => {
        this.#logger.log('Connected to Redis');
      })
      .on('connecting', () => {
        this.#logger.debug('Connecting to Redis');
      })
      .on('error', (err) => {
        this.#logger.error('Redis error', err);
      })
      .on('reconnecting', () => {
        this.#logger.debug('Reconnecting to Redis');
      })
      .on('end', () => {
        this.#logger.log('Disconnected from Redis');
      })
      .on('close', () => {
        this.#logger.log('Closed Redis connection');
      })
      .on('ready', () => {
        this.#logger.debug('Redis connection is ready');
      });
  }

  /**
   * Executes the given commands in a transaction.
   * @param fn The function to execute in the transaction.
   */
  tx(fn: (multi: RedisMulti) => void): ReturnType<RedisMulti['exec']> {
    const multi = this.#client.multi();

    fn(multi);

    return multi.exec();
  }

  /**
   * On module initialization, open a connection to the Redis server.
   */
  async onModuleInit(): Promise<void> {
    await this.#client.connect();
    await this.#client.ft.configSet('DEFAULT_DIALECT', '3');
  }
}
