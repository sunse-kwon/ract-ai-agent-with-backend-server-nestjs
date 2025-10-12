import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';


export class SignupDto {
    @IsEmail({}, {message: "올바른 이메일 형식이 아닙니다."})
    @IsNotEmpty({message: "이메일은 필수입니다."})
    email: string;

    @IsString({message: "비밀번호는 문자열이어야 합니다."})
    @MinLength(8,{message: "비밀번호는 최소 8자 이상이어야 합니다."})
    password: string;

    @IsString({message: "이름은 문자열이어야 합니다."})
    @IsNotEmpty({message: "이름은 필수입니다."})
    name: string;
}