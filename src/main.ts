import { NestFactory } from '@nestjs/core';
import { MbusaAppModule } from './mbusa.app.module';
import { MbusaAppService } from './mbusa.app.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(MbusaAppModule);
  // app.enableShutdownHooks();
  const processor = app.get(MbusaAppService);
  await processor.run();

  await app.close();
}
bootstrap();
