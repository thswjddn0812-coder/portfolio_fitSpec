import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEvaluationStandardDto } from './dto/create-evaluation-standard.dto';
import { UpdateEvaluationStandardDto } from './dto/update-evaluation-standard.dto';
import { EvaluationStandards } from './entities/evaluation-standard.entity';

@Injectable()
export class EvaluationStandardsService {
  constructor(
    @InjectRepository(EvaluationStandards)
    private evaluationStandardsRepository: Repository<EvaluationStandards>,
  ) {}

  create(createEvaluationStandardDto: CreateEvaluationStandardDto) {
    const evaluationStandard = this.evaluationStandardsRepository.create(createEvaluationStandardDto);
    return this.evaluationStandardsRepository.save(evaluationStandard);
  }

  findAll() {
    return this.evaluationStandardsRepository.find();
  }

  findOne(id: number) {
    return this.evaluationStandardsRepository.findOne({ where: { id } });
  }

  async update(id: number, updateEvaluationStandardDto: UpdateEvaluationStandardDto) {
    await this.evaluationStandardsRepository.update(id, updateEvaluationStandardDto);
    return this.findOne(id);
  }

  remove(id: number) {
    return this.evaluationStandardsRepository.delete(id);
  }
}
