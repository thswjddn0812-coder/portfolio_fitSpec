import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhysicalRecordsService } from './physical_records.service';
import { PhysicalRecordsController } from './physical_records.controller';
import { PhysicalRecords } from './entities/physical_record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PhysicalRecords])],
  controllers: [PhysicalRecordsController],
  providers: [PhysicalRecordsService],
  exports: [PhysicalRecordsService],
})
export class PhysicalRecordsModule {}
