import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiLocalizedErrorResponses } from '../../common/swagger/api-localized-error-responses.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/security/authenticated-user.interface';
import { ChangePasswordDto } from './dto/session.dto';
import { TwoFactorCodeDto, TwoFactorVerifyDto } from './dto/two-factor.dto';
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

  // ─── Qurilmalar (sessiyalar) boshqaruvi — har kim faqat o'zinikini ─────────

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mening ulangan qurilmalarim (faol sessiyalar) ro'yxati" })
  listSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.listSessions(user.id, user.sessionId);
  }

  @Delete('sessions/others')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Joriy qurilmadan tashqari BARCHA qurilmalarni chiqarish" })
  revokeOtherSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.revokeOtherSessions(user.id, user.sessionId);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bitta qurilmani chiqarish (faqat o\'z sessiyasi)' })
  revokeSession(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.authService.revokeSession(user.id, id, user.sessionId);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Parolni almashtirish (boshqa barcha qurilmalar chiqariladi)" })
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto, user.sessionId);
  }

  // ─── Ikki bosqichli tekshiruv (2FA, TOTP) ─────────────────────────────────

  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login 2-bosqichi: 2FA kodi bilan token olish" })
  verifyTwoFactor(@Body() dto: TwoFactorVerifyDto, @Req() request: Request) {
    return this.authService.verifyTwoFactorLogin(dto.twoFactorToken, dto.code, this.getRequestMeta(request));
  }

  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  twoFactorStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.twoFactorStatus(user.id);
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "2FA sozlashni boshlash — sir va otpauth havolasi" })
  setupTwoFactor(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.setupTwoFactor(user.id, user.username);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Kod tasdiqlansa 2FA yoqiladi" })
  enableTwoFactor(@CurrentUser() user: AuthenticatedUser, @Body() dto: TwoFactorCodeDto) {
    return this.authService.enableTwoFactor(user.id, dto.code);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "2FA'ni o'chirish (joriy kod bilan)" })
  disableTwoFactor(@CurrentUser() user: AuthenticatedUser, @Body() dto: TwoFactorCodeDto) {
    return this.authService.disableTwoFactor(user.id, dto.code);
  }

  @Get('sessions/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Kirish tarixi — oxirgi 20 sessiya (chiqarilganlar ham)" })
  sessionHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.listSessionHistory(user.id, user.sessionId);
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      deviceInfo: request.get('user-agent'),
    };
  }
}
