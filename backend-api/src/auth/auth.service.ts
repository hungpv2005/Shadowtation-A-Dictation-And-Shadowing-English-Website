import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { DataSource, IsNull } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { RefreshToken } from '../database/entities/refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(private readonly dataSource: DataSource, private readonly config: ConfigService) {}

  async login(input: { email?: unknown; password?: unknown }) {
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = typeof input.password === 'string' ? input.password : '';
    if (!email || email.length > 150 || !password || password.length > 200) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    const user = await this.dataSource.getRepository(User).findOneBy({ email });
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    const refreshToken = await this.issueRefreshToken(user.id);
    return { ...this.createAccessToken(user), refreshToken, user: this.publicUser(user) };
  }

  async refresh(input: { refreshToken?: unknown }) {
    const rawToken = typeof input.refreshToken === 'string' ? input.refreshToken : '';
    if (!rawToken || rawToken.length > 255) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    const tokenHash = this.hashToken(rawToken);

    const user = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(RefreshToken);
      const stored = await repository.findOne({
        where: { tokenHash },
        lock: { mode: 'pessimistic_write' },
      });
      if (!stored || stored.revokedAt || stored.expiresAt.getTime() <= Date.now()) {
        throw new UnauthorizedException('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }

      const account = await manager.getRepository(User).findOneBy({ id: stored.userId });
      if (!account?.isActive) throw new UnauthorizedException('Tài khoản không còn hoạt động.');

      stored.revokedAt = new Date();
      await repository.save(stored);
      return account;
    });

    const nextRefreshToken = await this.issueRefreshToken(user.id);
    return { ...this.createAccessToken(user), refreshToken: nextRefreshToken };
  }

  async logout(input: { refreshToken?: unknown }) {
    const rawToken = typeof input.refreshToken === 'string' ? input.refreshToken : '';
    if (rawToken && rawToken.length <= 255) {
      await this.dataSource.getRepository(RefreshToken).update(
        { tokenHash: this.hashToken(rawToken), revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    }
    return { ok: true };
  }

  private createAccessToken(user: User) {
    const secret = this.config.get<string>('JWT_ACCESS_SECRET');
    if (!secret || secret.length < 32) {
      throw new ServiceUnavailableException('Backend chưa được cấu hình JWT_ACCESS_SECRET tối thiểu 32 ký tự.');
    }
    const expiresIn = this.readExpiry(this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'));
    const now = Math.floor(Date.now() / 1000);
    const header = this.encode({ alg: 'HS256', typ: 'JWT' });
    const payload = this.encode({ sub: user.id, email: user.email, role: user.role, iat: now, exp: now + expiresIn });
    const unsigned = `${header}.${payload}`;
    const signature = createHmac('sha256', secret).update(unsigned).digest('base64url');
    return { accessToken: `${unsigned}.${signature}`, tokenType: 'Bearer', expiresIn };
  }

  private publicUser(user: User) {
    return { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
  }

  private async issueRefreshToken(userId: string) {
    const token = randomBytes(48).toString('base64url');
    const expiresIn = this.readExpiry(this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'));
    await this.dataSource.getRepository(RefreshToken).save({
      userId,
      tokenHash: this.hashToken(token),
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      revokedAt: null,
    });
    return token;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private encode(value: unknown) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private readExpiry(value: string) {
    const match = /^([1-9]\d*)(s|m|h|d)$/.exec(value.trim());
    if (!match) return 15 * 60;
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return Math.min(Number(match[1]) * multipliers[match[2]], 365 * 86400);
  }
}
