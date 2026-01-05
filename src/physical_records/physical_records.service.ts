import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePhysicalRecordDto } from './dto/create-physical_record.dto';
import { UpdatePhysicalRecordDto } from './dto/update-physical_record.dto';
import { PhysicalRecords } from './entities/physical_record.entity';

@Injectable()
export class PhysicalRecordsService {
  constructor(
    @InjectRepository(PhysicalRecords)
    private physicalRecordsRepository: Repository<PhysicalRecords>,
  ) {}

  create(createPhysicalRecordDto: CreatePhysicalRecordDto) {
    const physicalRecord = this.physicalRecordsRepository.create(createPhysicalRecordDto);
    return this.physicalRecordsRepository.save(physicalRecord);
  }

  findAll() {
    return this.physicalRecordsRepository.find();
  }

  findOne(id: number) {
    return this.physicalRecordsRepository.findOne({ where: { id } });
  }

  async update(id: number, updatePhysicalRecordDto: UpdatePhysicalRecordDto) {
    await this.physicalRecordsRepository.update(id, updatePhysicalRecordDto);
    return this.findOne(id);
  }

  remove(id: number) {
    return this.physicalRecordsRepository.delete(id);
  }
}
