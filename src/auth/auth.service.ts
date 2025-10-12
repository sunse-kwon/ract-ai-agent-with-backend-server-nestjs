import { Injectable, Inject, BadRequestException, HttpException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../core/entities/users/users.entity'
import { JwtService } from '@nestjs/jwt';
import bcrypt from "bcrypt";
import * as crypto from 'crypto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { SignupDto } from './dto/signup.dto'
import { LoginDto } from './dto/login.dto'
import { Request } from 'express';


@Injectable()
export class AuthService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly dataSource: DataSource,
    private jwtService: JwtService,
) {}

    // 랜덤 JWT ID 생성
    private generateJwtId(): string {
        return crypto.randomBytes(12).toString('base64');
    };

    // 비밀번호 해시화
    async hashPassword(password: string): Promise<string> {
        const saltRound = 10
        const salt = await bcrypt.genSalt(saltRound);
        const hash = await bcrypt.hash(password, salt);
        return hash
    };

    async extractTokenFromHeader(request: Request): Promise<string | undefined> {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    };

   // 회원가입 기능
    async signup(body: SignupDto): Promise<any> {
        try {
            const { email, password, name } = body;
            // 입력 데이터 확인
            if (!email) {
                throw new BadRequestException('이메일을 입력해주세요');
            } else if (!password) {
                throw new BadRequestException('비밀번호를 입력해주세요');
            } else if (!name) {
                throw new BadRequestException('이름를 입력해주세요');
            } 

            // 로깅 시작
            this.logger.info('Creating new user started', {
                context: 'UsersService', 
                email: email,
                name: name
            });

            // 사용자 확인
            const existingUser = await this.dataSource
                .getRepository(User)
                .createQueryBuilder("user")
                .where("user.email = :email", {email})
                .getOne()

            if (existingUser) {
                throw new BadRequestException('이미 존재하는 이메일입니다.');
            };

            //jwt id 생성
            const jti = this.generateJwtId()

            // 비밀번호 암호화
            const hashedPassword = await this.hashPassword(password)

            // 사용자 생성
            const insertResult = await this.dataSource
                .createQueryBuilder()
                .insert()
                .into(User)
                .values([{email, password: hashedPassword, name, jti }])
                .execute()

            const insertemail = insertResult?.raw?.email;
            const insertname = insertResult?.raw?.name;

            // 로깅 완료
            this.logger.info('User created successfully', { 
                context: 'UsersService',
                email: insertemail,
                name: insertname 
            });
            return { message: '회원가입이 완료되었습니다.' };
        } catch (error) {
            this.logger.error('creating user failed', { 
                context: 'UsersService', 
                error: error.message,
                stack: error.stack,
            });
            if (error instanceof HttpException) {
                throw error
            }
            throw new InternalServerErrorException('회원가입 중 문제가 발생했습니다.');
        }
    }
    
     // login 기능
    async login(body: LoginDto):Promise<any> {
        try {
            const {email, password} = body;

            // 사용자 확인
            const existingUseruser = await this.dataSource
                .getRepository(User)
                .createQueryBuilder("user")
                .select(["user.id", "user.email", "user.password", "user.jti"])
                .where("email = :email", {email})
                .getOne()
            if (!existingUseruser) {
                throw new BadRequestException('존재하지 않는 이메일입니다.');
            }
            // 폼으로 받아온 비밀번호는 유저에게 받아온 해시가 안된 비밀번호
            // 유저에게 저장된 비밀번호는 해시된 비밀번호
            const isMatch = await bcrypt.compare(password, existingUseruser.password); // true
            if ( isMatch !== true ) {
                throw new UnauthorizedException("비밀번호가 일치하지 않습니다.")
            }
            // 기존 jwt id 있는지 확인 후 없으면 생성
            let jti = existingUseruser.jti
            if (!jti) {
                jti = this.generateJwtId()
            }
            // new jwt id 저장
            await this.dataSource
                .createQueryBuilder()
                .update(User)
                .set({ jti })
                .where("id = :id", { id: existingUseruser.id })
                .execute()
            // payload 생성
            const payload = { sub: existingUseruser.id, email: existingUseruser.email, name: existingUseruser.name, jti: jti };
            // jwt token 생성
            return {
                access_token: await this.jwtService.signAsync(payload, { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '60m' }),
                refresh_token: await this.jwtService.signAsync({...payload, type: "refresh"}, { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' })
            }
        } catch (error) {
            this.logger.error('login failed', { 
                context: 'UsersService', 
                error: error.message,
                stack: error.stack,
            });
            if (error instanceof HttpException) {
                throw error
            }
            throw new InternalServerErrorException('로그인 중 문제가 발생했습니다.');
        }
    }

     // token validation 기능
    async tokenValidation(id: number, jti: string):Promise<any> {
        try {
            // 사용자 조회
            const user = await this.dataSource
                .getRepository(User)
                .createQueryBuilder("user")
                .select(["user.jti"])
                .where("id=:id", {id: id})
                .getOne()
            // 토큰 페이로드에 담긴 사용자 id 로 유저 존재 확인
            if (!user) {
                throw new BadRequestException('사용자가 없습니다. 유효하지 않은 토큰입니다.');
            }

            // jwt id 비교
            if (jti !== user.jti) {
                throw new BadRequestException('유효하지 않은 토큰입니다.');
            }
            return {
                message: "인증이 완료되었습니다."
            }
        } catch (error) {
            this.logger.error('token validation failed', { 
                context: 'AuthService', 
                error: error.message,
                stack: error.stack,
            });
            if (error instanceof HttpException) {
                throw error
            }
            throw new InternalServerErrorException('사용자 인증에 문제가 발생했습니다.');
        }
    }

    // token 재발급 기능
    async tokenRefresh(refreshToken: string):Promise<any> {
        try {
            // refresh token 디코딩
            const decoded = await this.jwtService.verifyAsync(refreshToken, 
                { secret: process.env.JWT_REFRESH_SECRET });

            // 리프레시 토큰인지 확인
            if (decoded.type !== 'refresh') {
                throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
            }

            // user
            const user = await this.dataSource
                .getRepository(User)
                .createQueryBuilder("user")
                .select(["user.jti"])
                .where("id=:id", {id: decoded.sub})
                .getOne()

            if (!user) {
                throw new BadRequestException('사용자를 찾을 수 없습니다..');
            }

            // jti comparison
            if (decoded.jti !== user.jti) {
                 throw new BadRequestException('리프레시 토큰이 무효화되었습니다.');
            }

            // payload
            const payload = { sub: user.id, email: user.email, name: user.name, jti: user.jti };
            
            // create access token
            return {
                access_token: await this.jwtService.signAsync(payload, { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '60m' }),
            }
        } catch (error) {
            this.logger.error('token refresh failed', { 
                context: 'AuthService', 
                error: error.message,
                stack: error.stack,
            });
            if (error instanceof HttpException) {
                throw error
            }
            throw new InternalServerErrorException('토근 재발급 중 문제가 발생했습니다.');
        }
    }

     // 모든 토큰 무효화하여 로그아웃
    async reset(id: number, currntJti: string):Promise<any> {
        try {
            // 토큰 유효성 검증
            const user = await this.dataSource
                .getRepository(User)
                .createQueryBuilder("user")
                .select(["user.jti"])
                .where("id=:id", {id: id})
                .getOne()
            // 토큰 페이로드에 담긴 사용자 id 로 유저 존재 확인
            if (!user) {
                throw new BadRequestException('사용자가 없습니다. 유효하지 않은 토큰입니다.');
            }
            // jwt id 비교
            if (currntJti !== user.jti) {
                throw new BadRequestException('유효하지 않은 토큰입니다.');
            }

            // 새로운 jti 를 생성
            const jti = this.generateJwtId()

            // 유저에 등록된, jti를 업데이트
            await this.dataSource
                .createQueryBuilder()
                .update(User)
                .set({ jti })
                .where("id = :id", { id })
                .execute()
                
            // 업데이트 시, 모든 토큰은 invalid 된다. 왜냐면 모든 엔드포인트에서 jti 검증을 하기에
            return { message: '로그아웃되었습니다. 모든 토큰이 무효화되었습니다.' };
        } catch (error) {
            this.logger.error('logout failed', { 
                context: 'AuthService', 
                error: error.message,
                stack: error.stack,
            });
            if (error instanceof HttpException) {
                throw error
            }
            throw new InternalServerErrorException('로그아웃 중 문제가 발생했습니다.');
        }
    }
}
