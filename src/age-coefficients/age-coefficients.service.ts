import { Injectable } from '@nestjs/common';
import { CreateAgeCoefficientDto } from './dto/create-age-coefficient.dto';
import { UpdateAgeCoefficientDto } from './dto/update-age-coefficient.dto';

@Injectable()
export class AgeCoefficientsService {
  create(createAgeCoefficientDto: CreateAgeCoefficientDto) {
    return 'This action adds a new ageCoefficient';
  }

  findAll() {
    return `This action returns all ageCoefficients`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ageCoefficient`;
  }

  update(id: number, updateAgeCoefficientDto: UpdateAgeCoefficientDto) {
    return `This action updates a #${id} ageCoefficient`;
  }

  remove(id: number) {
    return `This action removes a #${id} ageCoefficient`;
  }
}
