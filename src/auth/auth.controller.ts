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
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions: CookieOptions = {
      httpOnly: true, // JavaScript에서 접근 불가 (XSS 방지)
      secure: isProduction, // 프로덕션에서만 HTTPS 필수
      // 개발 환경: lax로 설정 (같은 도메인의 다른 포트는 허용)
      // 프로덕션: strict로 설정하여 보안 강화
      // 참고: 크로스 오리진(완전히 다른 도메인)에서는 sameSite: 'none' + secure: true 필요
      sameSite: isProduction ? 'strict' : 'lax',
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
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
    });

    return { message: '로그아웃 완료' };
  }
}
