import { Module } from '@nestjs/common';
import { AgeCoefficientsService } from './age-coefficients.service';
import { AgeCoefficientsController } from './age-coefficients.controller';

@Module({
  controllers: [AgeCoefficientsController],
  providers: [AgeCoefficientsService],
})
export class AgeCoefficientsModule {}
