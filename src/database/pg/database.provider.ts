import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import knex, { Knex } from 'knex';

export const DatabaseProvider: Provider = {
  provide: 'PG_CONNECTION',
  inject: [ConfigService],
  useFactory: async (config: ConfigService): Promise<Knex> => {
    const logger = new Logger('Database');

    const db = knex({
      client: 'pg',
      connection: {
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        user: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
      },
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 10000,
      },
    });

    try {
      await db.raw('select 1');
      logger.log('PostgreSQL database connected successfully');
    } catch (err) {
      logger.error('Database connection failed', err);
      process.exit(1);
    }
    return db;
  },
};
