import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TestCategoriesService } from './test_categories.service';
import { CreateTestCategoryDto } from './dto/create-test_category.dto';
import { UpdateTestCategoryDto } from './dto/update-test_category.dto';

@Controller('test-categories')
export class TestCategoriesController {
  constructor(private readonly testCategoriesService: TestCategoriesService) {}

  @Post()
  create(@Body() createTestCategoryDto: CreateTestCategoryDto) {
    return this.testCategoriesService.create(createTestCategoryDto);
  }

  @Get()
  findAll() {
    return this.testCategoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.testCategoriesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTestCategoryDto: UpdateTestCategoryDto) {
    return this.testCategoriesService.update(+id, updateTestCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.testCategoriesService.remove(+id);
  }
}
