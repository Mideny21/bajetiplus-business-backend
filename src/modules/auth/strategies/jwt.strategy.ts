import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from '../../../common/types/auth-user.type';
import { UsersService } from '../../users/users.service';

interface AccessPayload {
  sub: string;
  type: 'access';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AccessPayload): Promise<AuthUser> {
    if (payload.type !== 'access') throw new UnauthorizedException();
    const user = await this.users.findById(payload.sub);
    if (!user?.isActive) throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
    };
  }
}
