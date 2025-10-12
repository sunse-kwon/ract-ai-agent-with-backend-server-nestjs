import { Injectable } from "@nestjs/common";
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { join } from "path";
import { User } from '../core/entities/users/users.entity'


@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
    constructor(private configService: ConfigService) {}
    createTypeOrmOptions(): Promise<TypeOrmModuleOptions> | TypeOrmModuleOptions {
        const host = this.configService.get<string>('DATABASE_HOST')
        if(!host) {
            throw new Error('DATABASE_HOST is not defined in environment variables')
        }
        return {
            type: 'mysql',
            host: this.configService.get<string>('DATABASE_HOST'),
            port: this.configService.get<number>('DATABASE_PORT', 3306),
            username: this.configService.get<string>('DATABASE_USER'),
            password: this.configService.get<string>('DATABASE_PASSWORD'),
            database: this.configService.get<string>('DATABASE_NAME'),
            entities: [User],
            synchronize: false,
            logging: process.env.NODE_ENV === "development" ? true : false, // 로깅
            logger:"file", // 로깅저장형태
            extra: {
                connectionLimit: this.configService.get<number>('DB_CONNECTION_LIMIT',10)
            },
            migrations: [join(__dirname, '..', 'migrations', '*.{js,ts}')]
        }
    }
}