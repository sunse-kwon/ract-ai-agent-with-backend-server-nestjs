import { Injectable, InternalServerErrorException, ConflictException, Inject, HttpException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../core/entities/users/users.entity'
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto'
import bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UsersService {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly dataSource: DataSource,
        private readonly authService: AuthService
    ) {}
    
    // 회원 조회
    async readUser(id: number, jti: string): Promise<User[] | any> {
        try {
            const user = await this.dataSource
                .getRepository(User)
                .createQueryBuilder("user")
                .select(["user.id", "user.name", "user.email", "user.jti"])
                .where("user.id = :id", { id })
                .andWhere(" isActive = :isActive", {isActive: true})
                .getOne()
            
            if (!user) {
                throw new BadRequestException("회원 찾을수 없습니다.")
            }
            // jwt id 비교
            if (jti !== user.jti) {
                throw new BadRequestException('유효하지 않은 토큰입니다.');
            }
            return user
        } catch (error) {
            this.logger.error('read user failed', { 
                context: 'UsersService', 
                error: error.message,
                stack: error.stack,
            });
             if (error instanceof HttpException) {
                throw error
            }
            throw new InternalServerErrorException('회원조회 중 문제가 발생했습니다.');
        }
    }  

    // 회원정보수정
    async updateUser(id: number, jti: string, body: UpdateUserDto): Promise<User | any> {
        try {
            const { email, name } = body

            // check exsisting user
            const existingUser = await this.dataSource
                .getRepository(User)
                .createQueryBuilder("user")
                .select(["user.email", "user.jti"])
                .where("user.id = :id", { id })
                .andWhere("user.isActive = :isActive", {isActive: true})
                .getOneOrFail()

            if (email && email === existingUser.email) {
                throw new ConflictException('이미 존재하는 이메일입니다.');
            }

            // jwt id 비교
            if (jti !== existingUser.jti) {
                throw new BadRequestException('유효하지 않은 토큰입니다.');
            }

            // 업데이트할 필드만 추출
            const updateData: Partial<User> = {};
            if (name !== undefined) updateData.name = name;
            if (email !== undefined) updateData.email = email;

            // update user 
            await this.dataSource
                .createQueryBuilder()
                .update(User)
                .set(updateData)
                .where("id = :id", { id: existingUser.id })
                .execute()

            return {
                message: "회원정보 수정이 완료되었습니다."
            }
        } catch (error) {
            this.logger.error('updating user failed', { 
                context: 'UsersService', 
                error: error.message,
                stack: error.stack,
            });
            if (error instanceof HttpException) {
                throw error
            }
            throw new InternalServerErrorException("회원 수정 중 문제가 발생했습니다.")
        }
    }

    async updateUserPassword(id: number, jti:string, body: UpdatePasswordDto): Promise<any>{
        try {
            const { currentPassword, newPassword } = body

            // check exsisting user
            const existingUser = await this.dataSource
                .getRepository(User)
                .createQueryBuilder("user")
                .select(["user.id","user.password","user.jti"])
                .where("user.id = :id", { id })
                .andWhere("user.isActive = :isActive", {isActive: true})
                .getOneOrFail()
            
            // jwt id 비교
            if (jti !== existingUser.jti) {
                throw new BadRequestException('유효하지 않은 토큰입니다.');
            }

            // 기존 비밀번호 비교
            const isMatch = await bcrypt.compare(currentPassword, existingUser.password); // true
            if (isMatch !== true) {
                throw new UnauthorizedException("비밀번호가 일치하지 않습니다.")
            }

            // 새 비밀번호가 현재 비밀번호와 같은지 확인
            const isSamePassword = await bcrypt.compare(newPassword, existingUser.password);
            if (isSamePassword === true) {
            throw new UnauthorizedException('새 비밀번호는 현재 비밀번호와 달라야 합니다.');
            }

            // 비밀번호 암호화
            const hashedPassword = await this.authService.hashPassword(newPassword)

            // update 비밀번호 
            await this.dataSource
                .createQueryBuilder()
                .update(User)
                .set({ password: hashedPassword })
                .where("id = :id", { id: existingUser.id })
                .execute()

            return { message: "비밀번호 변경이 완료되었습니다."}
        } catch (error) {
            this.logger.error('updating password failed', { 
                context: 'UsersService', 
                error: error.message,
                stack: error.stack,
            });
            if (error instanceof HttpException) {
                throw error
            }
            throw new InternalServerErrorException("비밀번호 변경 중 문제가 발생했습니다.")
        }
        
    }

    // 회원탈퇴, 왜래키 같은거 남겨놓을려고, 아이디는 유지하되, 이메알, 이름, 연락처, 등등 개인정보 위해 날리는 정도!! 
    async deleteUser(id: number, jti: string): Promise<any> {
        try {
            const exsistingUser = await this.dataSource
                .getRepository(User)
                .createQueryBuilder("user")
                .select(["user.jti"])
                .where("user.id = :id", { id })
                .andWhere("isActive = :isActive", {isActive: true})
                .getOneOrFail()
            
            // jwt id 비교
            if (jti !== exsistingUser.jti) {
                    throw new BadRequestException('유효하지 않은 토큰입니다.');
                }
        
            await this.dataSource
                .getRepository(User)
                .createQueryBuilder()
                .softDelete()
                .where("id = :id", {id: exsistingUser.id})
                .execute();
        
        return { message: "회원 탈퇴가 완료되었습니다."}
      } catch (error) {
        this.logger.error('deactive user failed', { 
                context: 'UsersService', 
                error: error.message,
                stack: error.stack,
            });
            if (error instanceof HttpException) {
                throw error
            }
            throw new InternalServerErrorException("회원 탈퇴 중 문제가 발생했습니다.")
            }
        }
    }

