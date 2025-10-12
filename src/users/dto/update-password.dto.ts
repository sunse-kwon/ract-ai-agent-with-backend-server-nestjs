import { IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
    
    @IsString({message: "비밀번호는 문자열이어야 합니다."})
    currentPassword: string;

    @IsString({message: "비밀번호는 문자열이어야 합니다."})
    @MinLength(8,{message: "비밀번호는 최소 8자 이상이어야 합니다."})
    newPassword: string;

}