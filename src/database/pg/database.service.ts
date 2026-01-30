import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  constructor(@Inject('PG_CONNECTION') private readonly db: Knex) {}

  async onModuleDestroy() {
    await this.db.destroy();
    console.log('PostgreSQL connection pool closed');
  }
}
