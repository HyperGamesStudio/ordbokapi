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
      'redis://:qvsk6zm1y2y0j28z2mqtqe31ht24m3c8wdhy1ke24m5mn7f7jjhq@canny-fox-5cac3d4bc3.redisgreen.net:11042';

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
    return new IoRedis("rediss://:p0d4c0299d6fba1ca605e13aec218d058e581d88eba90c4dcf920af1f6a89f094@ec2-52-44-201-59.compute-1.amazonaws.com:32110", {
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
