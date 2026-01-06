import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { Members } from './entities/member.entity';
import { Gyms } from '../gyms/entities/gym.entity';
import { AuthModule } from '../auth/auth.module';
import { EvaluationStandards } from '../evaluation-standards/entities/evaluation-standard.entity';
import { AgeCoefficients } from '../age-coefficients/entities/age-coefficient.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Members, Gyms, EvaluationStandards, AgeCoefficients]),
    AuthModule, // JwtModule을 사용하기 위해 import
  ],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
