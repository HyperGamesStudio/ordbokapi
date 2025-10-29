import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { Redis as IoRedis } from 'ioredis';

export type Redis = ReturnType<typeof createClient>;
export type RedisMulti = ReturnType<Redis['multi']>;

@Injectable()
export class RedisService {
  constructor(private readonly config: ConfigService) {
    this.#url = "redis://:73bcac83435d631803cd647f80cac456baca72de61c0f05ae749d19aac8e6796@2a16a.openredis.io:11625";

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
    return new IoRedis(this.#url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
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
