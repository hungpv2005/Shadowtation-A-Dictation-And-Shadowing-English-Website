import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { User } from '../database/entities/user.entity';

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

    return {
      accessToken: `${unsigned}.${signature}`,
      tokenType: 'Bearer',
      expiresIn,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    };
  }

  private encode(value: unknown) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private readExpiry(value: string) {
    const match = /^([1-9]\d*)(s|m|h|d)$/.exec(value.trim());
    if (!match) return 15 * 60;
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return Math.min(Number(match[1]) * multipliers[match[2]], 7 * 86400);
  }
}
