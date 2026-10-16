import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { MoreThan, Repository } from 'typeorm';
import { RefreshToken } from '../database/entities/refresh-token.entity';
import { PasswordResetToken } from '../database/entities/password-reset-token.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private sanitizeUser(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      streakCount: user.streakCount,
      premiumExpiredAt: user.premiumExpiredAt,
    };
  }

  private async generateTokens(user: User): Promise<AuthResponseDto> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET') ?? 'default_access_secret';
    const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'default_refresh_secret';
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn,
    });

    // Lưu bản băm token vào DB để kiểm soát thu hồi (Revoke)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const tokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: this.hashToken(refreshToken),
      expiresAt,
    });
    await this.refreshTokenRepository.save(tokenEntity);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email này đã được sử dụng');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const newUser = this.userRepository.create({
      email,
      fullName: dto.fullName.trim(),
      passwordHash,
      role: UserRole.STUDENT,
      isActive: true,
      streakCount: 0,
    });

    const savedUser = await this.userRepository.save(newUser);
    return this.generateTokens(savedUser);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị tạm khóa, vui lòng liên hệ Admin');
    }

    return this.generateTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'default_refresh_secret';
    let payload: { sub: string };

    try {
      payload = this.jwtService.verify(refreshToken, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const tokenHash = this.hashToken(refreshToken);
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: {
        tokenHash,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!tokenRecord || tokenRecord.revokedAt) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã bị thu hồi');
    }

    // Thu hồi token cũ (Token Rotation)
    tokenRecord.revokedAt = new Date();
    await this.refreshTokenRepository.save(tokenRecord);

    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Người dùng không còn khả dụng');
    }

    return this.generateTokens(user);
  }

  async logout(userId: string, refreshToken?: string): Promise<{ success: boolean; message: string }> {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.refreshTokenRepository.update(
        { userId, tokenHash },
        { revokedAt: new Date() },
      );
    } else {
      // Thu hồi tất cả refresh token của user
      await this.refreshTokenRepository.update(
        { userId, revokedAt: undefined },
        { revokedAt: new Date() },
      );
    }

    return { success: true, message: 'Đăng xuất thành công' };
  }

  async getMe(userId: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng');
    }
    return this.sanitizeUser(user);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ success: boolean; message: string }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản với email này. Vui lòng kiểm tra lại.');
    }

    if (!user.isActive) {
      throw new BadRequestException('Tài khoản này hiện đang bị tạm khóa. Vui lòng liên hệ Admin.');
    }

    if (!dto.newPassword || dto.newPassword.length < 6) {
      throw new BadRequestException('Mật khẩu mới phải có ít nhất 6 ký tự.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.newPassword, salt);

    user.passwordHash = passwordHash;
    await this.userRepository.save(user);

    // Thu hồi các refresh token cũ để bảo vệ an toàn cho tài khoản
    await this.refreshTokenRepository.update(
      { userId: user.id, revokedAt: undefined },
      { revokedAt: new Date() },
    );

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bằng mật khẩu mới.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
    const tokenHash = this.hashToken(dto.token.trim());

    const tokenRecord = await this.passwordResetTokenRepository.findOne({
      where: {
        tokenHash,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!tokenRecord || tokenRecord.usedAt) {
      throw new BadRequestException('Mã liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
    }

    const user = await this.userRepository.findOne({ where: { id: tokenRecord.userId } });
    if (!user || !user.isActive) {
      throw new BadRequestException('Tài khoản người dùng không hợp lệ hoặc đã bị khóa.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.newPassword, salt);

    user.passwordHash = passwordHash;
    await this.userRepository.save(user);

    tokenRecord.usedAt = new Date();
    await this.passwordResetTokenRepository.save(tokenRecord);

    // Thu hồi các phiên đăng nhập cũ để đảm bảo an toàn sau khi đổi mật khẩu
    await this.refreshTokenRepository.update(
      { userId: user.id, revokedAt: undefined },
      { revokedAt: new Date() },
    );

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.',
    };
  }
}
