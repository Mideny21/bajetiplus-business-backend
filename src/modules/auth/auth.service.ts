import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'node:crypto';
import { normalizeMobile } from '../../common/utils/phone.util';
import { DatabaseService } from '../../database/database.service';
import { FirebaseService } from '../../core/firebase/firebase.service';
import { UsersService } from '../users/users.service';
import { FirebaseLoginDto } from './dto/firebase-login.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface RefreshPayload {
  sub: string;
  sid: string;
  family: string;
  type: 'refresh';
}

export interface PublicUser {
  id: string;
  email: string | null;
  mobile: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshSecret: string;
  private readonly refreshDays: number;
  private readonly countryCode: string;

  constructor(
    private readonly database: DatabaseService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    config: ConfigService,
    private readonly firebase: FirebaseService,
  ) {
    this.accessSecret = config.getOrThrow('JWT_ACCESS_SECRET');
    this.accessExpiresIn = config.get('JWT_ACCESS_EXPIRES_IN', '15m');
    this.refreshSecret = config.getOrThrow('JWT_REFRESH_SECRET');
    this.refreshDays = config.get('JWT_REFRESH_EXPIRES_IN_DAYS', 30);
    this.countryCode = config.get('PHONE_DEFAULT_COUNTRY_CODE', '255');
  }

  async register(dto: RegisterDto): Promise<TokenPair> {
    if (!dto.email && !dto.mobile) {
      throw new BadRequestException(
        'At least one of email or mobile is required',
      );
    }
    const email = dto.email?.trim().toLowerCase();
    const mobile = dto.mobile
      ? normalizeMobile(dto.mobile, this.countryCode)
      : undefined;
    try {
      const user = await this.users.create({
        email,
        mobile,
        passwordHash: await bcrypt.hash(dto.password, 12),
      });
      return this.createTokenPair(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email or mobile is already registered');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const raw = dto.identifier.trim();
    const identifier = raw.includes('@')
      ? raw.toLowerCase()
      : normalizeMobile(raw, this.countryCode);
    const user = await this.users.findByIdentifier(identifier);
    const valid = user?.passwordHash
      ? await bcrypt.compare(dto.password, user.passwordHash)
      : false;
    if (!user || !valid || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.createTokenPair(user);
  }

  async firebaseLogin(dto: FirebaseLoginDto): Promise<TokenPair> {
    if (!this.firebase.enabled) {
      throw new ServiceUnavailableException(
        'Firebase authentication is not configured',
      );
    }
    let decoded: Awaited<ReturnType<FirebaseService['verifyIdToken']>>;
    try {
      decoded = await this.firebase.verifyIdToken(dto.idToken);
    } catch {
      throw new UnauthorizedException('Invalid Firebase token');
    }
    const email = decoded.email_verified
      ? decoded.email?.toLowerCase()
      : undefined;
    const mobile = decoded.phone_number
      ? normalizeMobile(decoded.phone_number, this.countryCode)
      : undefined;
    let user = await this.users.findByFirebaseUid(decoded.uid);
    if (!user && email) user = await this.users.findByIdentifier(email);
    if (!user && mobile) user = await this.users.findByIdentifier(mobile);
    if (user) {
      if (user.firebaseUid && user.firebaseUid !== decoded.uid) {
        throw new ConflictException(
          'Identifier belongs to another Firebase account',
        );
      }
      user = await this.users.update(user.id, { firebaseUid: decoded.uid });
    } else {
      user = await this.users.create({
        firebaseUid: decoded.uid,
        email,
        mobile,
      });
    }
    if (!user.isActive) throw new UnauthorizedException('Account is inactive');
    return this.createTokenPair(user);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const tokenHash = this.hashToken(refreshToken);
    const session = await this.database.refreshSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (
      !session ||
      session.id !== payload.sid ||
      session.familyId !== payload.family ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      await this.database.refreshSession.updateMany({
        where: { familyId: payload.family, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        'Refresh token reuse or revocation detected',
      );
    }
    if (!session.user.isActive)
      throw new UnauthorizedException('Account is inactive');
    return this.database.$transaction(async (tx) => {
      const next = await this.createTokenPair(session.user, payload.family, tx);
      const decodedNext = await this.verifyRefreshToken(next.refreshToken);
      await tx.refreshSession.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          lastUsedAt: new Date(),
          replacedById: decodedNext.sid,
        },
      });
      return next;
    });
  }

  async logout(refreshToken: string): Promise<{ revoked: boolean }> {
    const tokenHash = this.hashToken(refreshToken);
    const result = await this.database.refreshSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: result.count > 0 };
  }

  async logoutAll(userId: string): Promise<{ revoked: number }> {
    const result = await this.database.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: result.count };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user?.isActive) throw new UnauthorizedException();
    return this.toPublicUser(user);
  }

  private async createTokenPair(
    user: User,
    familyId: string = randomUUID(),
    client: Prisma.TransactionClient | DatabaseService = this.database,
  ): Promise<TokenPair> {
    const sessionId = randomUUID();
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, type: 'access' },
      { secret: this.accessSecret, expiresIn: this.accessExpiresIn as never },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, sid: sessionId, family: familyId, type: 'refresh' },
      {
        secret: this.refreshSecret,
        expiresIn: `${this.refreshDays}d` as never,
      },
    );
    const expiresAt = new Date(Date.now() + this.refreshDays * 86_400_000);
    await client.refreshSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        familyId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });
    return { accessToken, refreshToken, user: this.toPublicUser(user) };
  }

  private async verifyRefreshToken(token: string): Promise<RefreshPayload> {
    try {
      const payload = await this.jwt.verifyAsync<RefreshPayload>(token, {
        secret: this.refreshSecret,
      });
      if (payload.type !== 'refresh' || !payload.sid || !payload.family)
        throw new Error();
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
