import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as path from 'path';

@Injectable()
export class WinstonLoggerService implements LoggerService{
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger){}
  log(message: any, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: any, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, { context });
  }

  static WinstonLoggerConfigs(): any {
    const MODE = process.env.NODE_ENV || '';
    //  const logsDir = `/var/log/sunseLogs/chatbotapi/${MODE}`; 추후에 구현
    const logsDir= '/Volumes/SUNSE/projects/chatbot-chuseok/logs'
    return {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
       format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
          winston.format.errors({ stack: true }),
          winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
                  const contextStr = context ? `[${context}] ` : '';
                  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                  return `${timestamp} ${level.toUpperCase()} ${contextStr}${message}${metaStr}`;
          }),
      ),
      transports: [
        new winston.transports.Console({
          format:winston.format.simple()
        })
        ,
        // all except error
        new winston.transports.DailyRotateFile({
          filename: path.join(logsDir, 'all-%DATE%.log'),
          datePattern:'YYYY-MM-DD',
          maxSize:'20m',
          maxFiles: '3d',
          zippedArchive: true,
        }),
        // error log only
        new winston.transports.DailyRotateFile({
          filename: path.join(logsDir, 'error-%DATE%.log'),
          datePattern:'YYYY-MM-DD',
          level:'error',
          maxSize:'20m',
          maxFiles:'3d',
          zippedArchive: true,
        })
      ]
    }
  }
}
