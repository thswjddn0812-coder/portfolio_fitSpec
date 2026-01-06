import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AgeCoefficientsService } from './age-coefficients.service';
import { CreateAgeCoefficientDto } from './dto/create-age-coefficient.dto';
import { UpdateAgeCoefficientDto } from './dto/update-age-coefficient.dto';

@Controller('age-coefficients')
export class AgeCoefficientsController {
  constructor(private readonly ageCoefficientsService: AgeCoefficientsService) {}

  @Post()
  create(@Body() createAgeCoefficientDto: CreateAgeCoefficientDto) {
    return this.ageCoefficientsService.create(createAgeCoefficientDto);
  }

  @Get()
  findAll() {
    return this.ageCoefficientsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ageCoefficientsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAgeCoefficientDto: UpdateAgeCoefficientDto) {
    return this.ageCoefficientsService.update(+id, updateAgeCoefficientDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ageCoefficientsService.remove(+id);
  }
}
