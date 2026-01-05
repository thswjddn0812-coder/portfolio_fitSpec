import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePublicPhysicalRecordDto } from './dto/create-public_physical_record.dto';
import { UpdatePublicPhysicalRecordDto } from './dto/update-public_physical_record.dto';
import { PublicPhysicalRecords } from './entities/public_physical_record.entity';

@Injectable()
export class PublicPhysicalRecordsService {
  constructor(
    @InjectRepository(PublicPhysicalRecords)
    private publicPhysicalRecordsRepository: Repository<PublicPhysicalRecords>,
  ) {}

  create(createPublicPhysicalRecordDto: CreatePublicPhysicalRecordDto) {
    const publicPhysicalRecord = this.publicPhysicalRecordsRepository.create(createPublicPhysicalRecordDto);
    return this.publicPhysicalRecordsRepository.save(publicPhysicalRecord);
  }

  findAll() {
    return this.publicPhysicalRecordsRepository.find();
  }

  findOne(id: number) {
    return this.publicPhysicalRecordsRepository.findOne({ where: { id } });
  }

  async update(id: number, updatePublicPhysicalRecordDto: UpdatePublicPhysicalRecordDto) {
    await this.publicPhysicalRecordsRepository.update(id, updatePublicPhysicalRecordDto);
    return this.findOne(id);
  }

  remove(id: number) {
    return this.publicPhysicalRecordsRepository.delete(id);
  }
}
