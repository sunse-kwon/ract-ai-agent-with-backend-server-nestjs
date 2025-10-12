import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common'
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Observable, tap } from 'rxjs'



@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
        const ctx =  context.switchToHttp();
        const request = ctx.getRequest();
        const startTime = Date.now();

        this.logger.info('HTTP Request Started', {
            type: 'HTTP_REQUEST',
            method: request.method,
            url: request.url,
            query: Object.keys(request.query).length > 0 ? request.query : undefined,
            params:Object.keys(request.params).length > 0 ? request.params : undefined,
            body: request.body,
            userAgent: request.get('User-Agent'),
            referer: request.referer,
            ip:request.ip,
            timestamp: new Date().toISOString(),
          });
        
        return next.handle().pipe(
            tap((response) => {
                const responseTime = Date.now() - startTime;
                this.logger.info('HTTP Request Completed Successfully', {
                    type:'HTTP_RESPONSE_SUCCESS',
                    method: request.method,
                    url: request.url,
                    statusCode: response.statusCode,
                    responseTime: `${responseTime}ms`,
                    timestamp: new Date().toISOString(),
                    data: response.data
                })
            })
        )
    }
}
