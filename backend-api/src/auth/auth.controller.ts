import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: { email?: unknown; password?: unknown }) {
    return this.authService.login(body ?? {});
  }

  @Post('refresh')
  refresh(@Body() body: { refreshToken?: unknown }) {
    return this.authService.refresh(body ?? {});
  }

  @Post('logout')
  logout(@Body() body: { refreshToken?: unknown }) {
    return this.authService.logout(body ?? {});
  }
}
