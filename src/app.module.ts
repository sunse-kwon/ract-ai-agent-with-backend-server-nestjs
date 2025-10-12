import { Module, Logger } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConfig } from './config/database.config'
import { LoggerModule } from './logger/logger.module';
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core';
import { CatchEverythingFilter } from './filter/exception.filter';
import { LoggingInterceptor } from './intercepter/logging.intercepter';
import { JwtAuthGuard } from './guards/jwt-auth.guard';


@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.APP_PLATFORM}.${process.env.NODE_ENV}`,
      isGlobal: true
    }),
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig
    }),
    AuthModule, 
    UsersModule, 
    ChatbotModule,
    LoggerModule
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: CatchEverythingFilter,
    },
     {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor
    },
     {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    AppService, 
    Logger
  ],
})
export class AppModule {}
