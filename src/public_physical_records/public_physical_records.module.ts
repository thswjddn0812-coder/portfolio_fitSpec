import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicPhysicalRecordsService } from './public_physical_records.service';
import { PublicPhysicalRecordsController } from './public_physical_records.controller';
import { PublicPhysicalRecords } from './entities/public_physical_record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PublicPhysicalRecords])],
  controllers: [PublicPhysicalRecordsController],
  providers: [PublicPhysicalRecordsService],
  exports: [PublicPhysicalRecordsService],
})
export class PublicPhysicalRecordsModule {}
