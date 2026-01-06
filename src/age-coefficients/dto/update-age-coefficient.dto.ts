import { PartialType } from '@nestjs/mapped-types';
import { CreateAgeCoefficientDto } from './create-age-coefficient.dto';

export class UpdateAgeCoefficientDto extends PartialType(CreateAgeCoefficientDto) {}
