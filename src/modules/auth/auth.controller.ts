import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiLocalizedErrorResponses } from '../../common/swagger/api-localized-error-responses.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Autentifikatsiya')
@ApiLocalizedErrorResponses({ unauthorized: false, forbidden: false, conflict: true })
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Yangi foydalanuvchini ro‘yxatdan o‘tkazish va JWT token berish' })
  @ApiCreatedResponse({ description: 'Foydalanuvchi ro‘yxatdan o‘tdi va token juftligi qaytarildi.' })
  register(@Body() dto: RegisterDto, @Req() request: Request) {
    return this.authService.register(dto, this.getRequestMeta(request));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Username, email yoki telefon orqali tizimga kirish' })
  @ApiOkResponse({ description: 'Tizimga kirish muvaffaqiyatli, token juftligi qaytarildi.' })
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, this.getRequestMeta(request));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh tokenni yangilash va yangi token juftligini berish' })
  @ApiOkResponse({ description: 'Token juftligi yangilandi.' })
  refresh(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.authService.refresh(dto.refreshToken, this.getRequestMeta(request));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh tokenni bekor qilish' })
  @ApiOkResponse({ description: 'Refresh token mavjud bo‘lsa bekor qilindi.' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      deviceInfo: request.get('user-agent'),
    };
  }
}
