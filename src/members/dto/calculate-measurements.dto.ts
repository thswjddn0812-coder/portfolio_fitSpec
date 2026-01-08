import { IsNumber, IsArray, ValidateNested, Min, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class MeasurementDto {
  @IsNumber()
  @Min(1)
  categoryId: number;

  @IsNumber()
  @Min(0)
  value: number;

  @IsString()
  @IsOptional()
  trainerFeedback?: string;
}

export class CalculateMeasurementsDto {
  @IsNumber()
  @Min(1)
  memberId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeasurementDto)
  measurements: MeasurementDto[];
}

