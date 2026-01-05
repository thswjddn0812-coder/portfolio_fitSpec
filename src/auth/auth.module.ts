import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { Gyms } from '../gyms/entities/gym.entity';
import { RefreshTokens } from '../refresh_tokens/entities/refresh_token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Gyms, RefreshTokens]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production',
        signOptions: {
          expiresIn: '15m', // 액세스 토큰 만료 시간
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule], // JwtModule을 export하여 Guard에서 사용 가능하도록
})
export class AuthModule {}
