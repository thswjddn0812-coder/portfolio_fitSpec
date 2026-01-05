import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvaluationStandardsService } from './evaluation-standards.service';
import { EvaluationStandardsController } from './evaluation-standards.controller';
import { EvaluationStandards } from './entities/evaluation-standard.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EvaluationStandards])],
  controllers: [EvaluationStandardsController],
  providers: [EvaluationStandardsService],
  exports: [EvaluationStandardsService],
})
export class EvaluationStandardsModule {}
