import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class CreateMemberDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['M', 'F'])
  @IsNotEmpty()
  gender: 'M' | 'F';

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(150)
  age: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(300)
  height: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(500)
  weight: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
