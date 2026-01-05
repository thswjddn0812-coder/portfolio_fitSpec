import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Gyms } from '../gyms/entities/gym.entity';
import { RefreshTokens } from '../refresh_tokens/entities/refresh_token.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Gyms)
    private gymsRepository: Repository<Gyms>,
    @InjectRepository(RefreshTokens)
    private refreshTokensRepository: Repository<RefreshTokens>,
    private jwtService: JwtService,
  ) {}

  /**
   * 회원가입
   * 패스워드를 해시화하여 gyms 테이블에 저장
   */
  async signup(signupDto: SignupDto) {
    // 이메일 중복 체크
    const existingGym = await this.gymsRepository.findOne({
      where: { email: signupDto.email },
    });

    if (existingGym) {
      throw new ConflictException('이미 등록된 이메일입니다.');
    }

    // 패스워드 해시화
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(signupDto.password, saltRounds);

    // gyms 테이블에 저장
    const gym = this.gymsRepository.create({
      email: signupDto.email,
      password: hashedPassword,
      gymName: signupDto.gymName,
      ownerName: signupDto.ownerName,
    });

    const savedGym = await this.gymsRepository.save(gym);

    // 패스워드 제외하고 반환
    const { password, ...result } = savedGym;
    return result;
  }

  /**
   * 로그인
   * 이메일/패스워드 확인 후 액세스 토큰과 리프레시 토큰 발급
   */
  async login(loginDto: LoginDto) {
    // 이메일로 gym 찾기
    const gym = await this.gymsRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!gym) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // 패스워드 확인
    const isPasswordValid = await bcrypt.compare(loginDto.password, gym.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // 액세스 토큰 발급 (15분)
    const accessToken = this.jwtService.sign(
      { sub: gym.id, email: gym.email },
      { expiresIn: '15m' },
    );

    // 리프레시 토큰 발급 (7일)
    const refreshToken = this.jwtService.sign(
      { sub: gym.id, email: gym.email, type: 'refresh' },
      { expiresIn: '7d' },
    );

    // 리프레시 토큰 해시화
    const saltRounds = 10;
    const hashedRefreshToken = await bcrypt.hash(refreshToken, saltRounds);

    // 리프레시 토큰 만료 시간 계산 (7일 후)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // refresh_tokens 테이블에 저장
    const refreshTokenEntity = this.refreshTokensRepository.create({
      gym: gym,
      tokenHash: hashedRefreshToken,
      expiresAt: expiresAt,
      isRevoked: 0,
    });

    await this.refreshTokensRepository.save(refreshTokenEntity);

    // 패스워드 제외하고 반환
    const { password, ...gymInfo } = gym;

    return {
      accessToken,
      refreshToken, // 클라이언트에 전달 (쿠키에 저장)
      gym: gymInfo,
    };
  }

  /**
   * 토큰 갱신
   * 쿠키의 리프레시 토큰을 해시화하여 DB와 비교 후 액세스 토큰 재발급
   */
  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('리프레시 토큰이 제공되지 않았습니다.');
    }

    try {
      // 리프레시 토큰 검증
      const payload = this.jwtService.verify(refreshToken);
      
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
      }

      // gym 찾기
      const gym = await this.gymsRepository.findOne({
        where: { id: payload.sub },
      });

      if (!gym) {
        throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
      }

      // DB에서 해당 gym의 모든 활성 리프레시 토큰 가져오기
      const activeTokens = await this.refreshTokensRepository
        .createQueryBuilder('refreshToken')
        .where('refreshToken.gym_id = :gymId', { gymId: gym.id })
        .andWhere('refreshToken.is_revoked = 0')
        .andWhere('refreshToken.expires_at > :now', { now: new Date() })
        .getMany();

      // 제공된 리프레시 토큰과 DB의 해시된 토큰 비교
      let tokenFound = false;
      for (const tokenEntity of activeTokens) {
        const isMatch = await bcrypt.compare(refreshToken, tokenEntity.tokenHash);
        if (isMatch) {
          tokenFound = true;
          break;
        }
      }

      if (!tokenFound) {
        throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
      }

      // 새로운 액세스 토큰 발급
      const newAccessToken = this.jwtService.sign(
        { sub: gym.id, email: gym.email },
        { expiresIn: '15m' },
      );

      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('리프레시 토큰이 유효하지 않습니다.');
    }
  }

  /**
   * 로그아웃
   * 리프레시 토큰 무효화
   */
  async logout(refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('리프레시 토큰이 제공되지 않았습니다.');
    }

    try {
      // 리프레시 토큰 검증
      const payload = this.jwtService.verify(refreshToken);
      
      if (payload.type !== 'refresh') {
        return { message: '로그아웃 완료' };
      }

      // DB에서 해당 gym의 모든 활성 리프레시 토큰 찾기
      const activeTokens = await this.refreshTokensRepository.find({
        where: {
          gym: { id: payload.sub },
          isRevoked: 0,
        },
      });

      // 제공된 리프레시 토큰과 일치하는 토큰 찾아서 무효화
      for (const tokenEntity of activeTokens) {
        const isMatch = await bcrypt.compare(refreshToken, tokenEntity.tokenHash);
        if (isMatch) {
          tokenEntity.isRevoked = 1;
          await this.refreshTokensRepository.save(tokenEntity);
          break;
        }
      }

      return { message: '로그아웃 완료' };
    } catch (error) {
      // 토큰이 유효하지 않아도 로그아웃은 성공으로 처리
      return { message: '로그아웃 완료' };
    }
  }
}
