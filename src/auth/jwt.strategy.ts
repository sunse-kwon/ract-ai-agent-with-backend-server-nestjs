import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
    const secret = process.env.JWT_ACCESS_SECRET
    if (!secret) {
        throw new Error('JWT_ACCESS_SECRET is not defined');
    }
    super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKey: secret,
        });
    }
    async validate(payload: any) {
        return { id: payload.sub, email: payload.email, name: payload.name, jti: payload.jti };
    }
}