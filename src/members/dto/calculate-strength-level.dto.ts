import { IsEnum, IsNumber, IsNotEmpty, Min, Max } from 'class-validator';

export class CalculateStrengthLevelDto {
  @IsEnum(['M', 'F'])
  @IsNotEmpty()
  gender: 'M' | 'F';

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(150)
  age: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(500)
  bodyWeight: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  measuredWeight: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  categoryId: number;
}
