import { Controller, Post, Body, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto'
import { LoginDto } from './dto/login.dto'
import { Public } from '../decorator/guard.decorator'


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('/signup')
  async signup(@Body() body: SignupDto): Promise<any> {
    return await this.authService.signup(body);
  }
  
  @Public()
  @Post('/login')
  async login(@Body() body: LoginDto): Promise<any> {
    return await this.authService.login(body);
  }

  @Post('/token-validation')
  async tokenValidation(@Req() req): Promise<any> {
    return await this.authService.tokenValidation(req.user.id, req.user.jti);
  }

  @Public()
  @Post('/token-refresh')
  tokenRefresh(@Body() body: { refreshToken: string }): Promise<any> {
    return this.authService.tokenRefresh(body.refreshToken);
  }

  @Post('/reset')
  reset(@Req() req): Promise<any> {
    return this.authService.reset(req.user.id, req.user.jti);
  }
}
