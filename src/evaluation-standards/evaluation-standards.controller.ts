import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EvaluationStandardsService } from './evaluation-standards.service';
import { CreateEvaluationStandardDto } from './dto/create-evaluation-standard.dto';
import { UpdateEvaluationStandardDto } from './dto/update-evaluation-standard.dto';

@Controller('evaluation-standards')
export class EvaluationStandardsController {
  constructor(private readonly evaluationStandardsService: EvaluationStandardsService) {}

  @Post()
  create(@Body() createEvaluationStandardDto: CreateEvaluationStandardDto) {
    return this.evaluationStandardsService.create(createEvaluationStandardDto);
  }

  @Get()
  findAll() {
    return this.evaluationStandardsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.evaluationStandardsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEvaluationStandardDto: UpdateEvaluationStandardDto) {
    return this.evaluationStandardsService.update(+id, updateEvaluationStandardDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.evaluationStandardsService.remove(+id);
  }
}
