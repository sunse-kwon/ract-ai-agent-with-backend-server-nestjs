import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WinstonModule } from 'nest-winston';
import { WinstonLoggerService } from './logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(WinstonLoggerService.WinstonLoggerConfigs())
  }
);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
