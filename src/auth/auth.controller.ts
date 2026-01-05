import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  Get,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response, Request, CookieOptions } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 회원가입
   */
  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    return await this.authService.signup(signupDto);
  }

  /**
   * 로그인
   * 액세스 토큰은 응답 본문에, 리프레시 토큰은 쿠키에 저장
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);

    // 리프레시 토큰을 쿠키에 저장
    const cookieOptions: CookieOptions = {
      httpOnly: true, // JavaScript에서 접근 불가 (XSS 방지)
      secure: process.env.NODE_ENV === 'production', // HTTPS에서만 전송
      sameSite: 'strict', // CSRF 방지
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
      path: '/',
    };

    res.cookie('refreshToken', result.refreshToken, cookieOptions);

    // 리프레시 토큰은 응답에서 제거 (쿠키에만 저장)
    const { refreshToken, ...response } = result;
    return response;
  }

  /**
   * 토큰 갱신
   * 쿠키에서 리프레시 토큰을 읽어서 새로운 액세스 토큰 발급
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('리프레시 토큰이 없습니다.');
    }

    return await this.authService.refresh(refreshToken);
  }

  /**
   * 로그아웃
   * 리프레시 토큰 무효화 및 쿠키 삭제
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // 쿠키 삭제
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return { message: '로그아웃 완료' };
  }
}
