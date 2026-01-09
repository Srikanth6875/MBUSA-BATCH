import { Module, Logger, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
        maxPoolSize: 10,
        minPoolSize: 2,
        connectionFactory: (connection) => {
          const logger = new Logger('MongoDB');

          connection.on('connected', () => logger.log('MongoDB connected'));
          connection.on('error', err => logger.error('Mongo error', err));
          connection.on('disconnected', () => logger.warn('Mongo disconnected'));

          return connection;
        },
      }),
    }),
  ],
  exports: [MongooseModule],
})
export class MongoModule {}
