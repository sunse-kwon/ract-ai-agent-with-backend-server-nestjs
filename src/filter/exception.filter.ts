import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Injectable, Inject, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { HttpAdapterHost } from '@nestjs/core';
import { Logger } from 'winston';
import { Request, Response } from 'express';



@Injectable()
@Catch()
export class CatchEverythingFilter implements ExceptionFilter {
    constructor(
        private readonly httpAdapterHost: HttpAdapterHost,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    catch(exception: unknown, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();
        
        const httpStatus = this.getHttpStatus(exception);

        // 모든 에러 로그
        this.logError(request, exception, httpStatus);

        let responseBody={}

         if (exception instanceof HttpException) {
            const exceptionResponse = exception["response"];
            // 커스텀 에러일 경우
            const badRequestException = new BadRequestException();
            responseBody = {
                statusCode: exceptionResponse.statusCode ?? badRequestException.getStatus(),
                error: exceptionResponse.error ?? badRequestException.message, 
                message: exceptionResponse.message ?? badRequestException.message,
            } 
        } else {
            const internalServerErrorException = new InternalServerErrorException();
            responseBody = {
                statusCode: internalServerErrorException.getStatus(),
                error: internalServerErrorException.message,
                message: internalServerErrorException.message,
            }
        }
        httpAdapter.reply(response, responseBody, httpStatus);
    }
    private getHttpStatus(exception: unknown): number {
        if (exception instanceof HttpException) {
            return exception.getStatus();
        }
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
     private getErrorMessage(exception: unknown): string {
        if (exception instanceof HttpException) {
            const response = exception.getResponse();

            if (typeof response === 'object' && response !== null) {
                // ValidationPipe 에러나 복잡한 구조의 에러 처리
                return (response as any).message || exception.message;
              }
            if (typeof response === 'string') {
                return response
            }
            return exception.message;
        }
        if (exception instanceof Error) {
            return exception.message;
        }
        return 'Internal server error';
    }

    private logError(request: Request, exception: unknown, statusCode: number): void {
        const errorInfo = {
            statusCode: statusCode,
            method: request.method,
            url: request.url,
            userAgent: request.get('User-Agent'),
            ip: request.ip,
            timestamp: new Date().toISOString(),
            message: this.getErrorMessage(exception),
        }

        if (statusCode >= 500 && exception instanceof Error) {
            Object.assign(errorInfo, {
                stack: exception.stack,
                errorName: exception.name,
            })
        }
        // 모든 exception을 에러로 로그
        this.logger.error('Exception Occurred', errorInfo)
    }

}
