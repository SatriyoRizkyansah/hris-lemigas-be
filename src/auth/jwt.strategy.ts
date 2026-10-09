import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './user.decorator.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET ?? 'fallback-secret-do-not-use-in-production',
    });
  }

  validate(payload: any): JwtPayload {
    return {
      sub: payload.sub,
      email: payload.email,
      nama: payload.nama,
      roleId: payload.roleId,
      role: payload.role,
      roles: payload.roles,
      unitKerjaId: payload.unitKerjaId,
    };
  }
}
