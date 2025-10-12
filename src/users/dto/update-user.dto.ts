import { IsEmail, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateUserDto {
    
    @IsOptional()
    @IsEmail({}, {message: "올바른 이메일 형식이 아닙니다."})
    email: string;

    @IsOptional()
    @IsString({message: "이름은 문자열이어야 합니다."})
    @IsNotEmpty({message: "이름은 필수입니다."})
    name: string;
}