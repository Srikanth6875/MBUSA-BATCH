import { Global, Module } from '@nestjs/common';
import { DatabaseProvider } from './database.provider';
import { DatabaseService } from './database.service';

@Global()
@Module({
    providers: [DatabaseProvider, DatabaseService],
    exports: ['PG_CONNECTION'],
})
export class PgDatabaseModule { }
