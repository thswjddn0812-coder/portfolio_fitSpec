import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTestCategoryDto } from './dto/create-test_category.dto';
import { UpdateTestCategoryDto } from './dto/update-test_category.dto';
import { TestCategories } from './entities/test_category.entity';

@Injectable()
export class TestCategoriesService {
  constructor(
    @InjectRepository(TestCategories)
    private testCategoriesRepository: Repository<TestCategories>,
  ) {}

  create(createTestCategoryDto: CreateTestCategoryDto) {
    const testCategory = this.testCategoriesRepository.create(createTestCategoryDto);
    return this.testCategoriesRepository.save(testCategory);
  }

  findAll() {
    return this.testCategoriesRepository.find();
  }

  findOne(id: number) {
    return this.testCategoriesRepository.findOne({ where: { id } });
  }

  async update(id: number, updateTestCategoryDto: UpdateTestCategoryDto) {
    await this.testCategoriesRepository.update(id, updateTestCategoryDto);
    return this.findOne(id);
  }

  remove(id: number) {
    return this.testCategoriesRepository.delete(id);
  }
}
