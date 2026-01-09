import { Module } from '@nestjs/common';
import { DatabaseProvider } from './database.provider';
// import { DatabaseService } from './database.service';

@Module({
    providers: [DatabaseProvider,],
    exports: ['PG_CONNECTION'],
})
export class PgDatabaseModule { }
