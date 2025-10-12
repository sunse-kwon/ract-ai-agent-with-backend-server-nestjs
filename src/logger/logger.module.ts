import { Module, Global } from '@nestjs/common';
import { WinstonLoggerService } from './logger.service';
import { LoggerController } from './logger.controller';
import { WinstonModule } from 'nest-winston';


@Global()
@Module({
  imports: [WinstonModule.forRoot(WinstonLoggerService.WinstonLoggerConfigs())], // 윈스톤 모듈에 config 사용
  controllers: [LoggerController],
  providers: [WinstonLoggerService],
  exports: [WinstonLoggerService] // 다른모듈서 사용할수 있도록 
})
export class LoggerModule {}
