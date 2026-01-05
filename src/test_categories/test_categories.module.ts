import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestCategoriesService } from './test_categories.service';
import { TestCategoriesController } from './test_categories.controller';
import { TestCategories } from './entities/test_category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TestCategories])],
  controllers: [TestCategoriesController],
  providers: [TestCategoriesService],
  exports: [TestCategoriesService],
})
export class TestCategoriesModule {}
