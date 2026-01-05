import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshTokensService } from './refresh_tokens.service';
import { RefreshTokensController } from './refresh_tokens.controller';
import { RefreshTokens } from './entities/refresh_token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RefreshTokens])],
  controllers: [RefreshTokensController],
  providers: [RefreshTokensService],
  exports: [RefreshTokensService],
})
export class RefreshTokensModule {}
