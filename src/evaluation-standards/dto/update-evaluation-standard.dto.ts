import { PartialType } from '@nestjs/mapped-types';
import { CreateEvaluationStandardDto } from './create-evaluation-standard.dto';

export class UpdateEvaluationStandardDto extends PartialType(CreateEvaluationStandardDto) {}
