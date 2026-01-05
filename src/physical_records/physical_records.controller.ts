import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PhysicalRecordsService } from './physical_records.service';
import { CreatePhysicalRecordDto } from './dto/create-physical_record.dto';
import { UpdatePhysicalRecordDto } from './dto/update-physical_record.dto';

@Controller('physical-records')
export class PhysicalRecordsController {
  constructor(private readonly physicalRecordsService: PhysicalRecordsService) {}

  @Post()
  create(@Body() createPhysicalRecordDto: CreatePhysicalRecordDto) {
    return this.physicalRecordsService.create(createPhysicalRecordDto);
  }

  @Get()
  findAll() {
    return this.physicalRecordsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.physicalRecordsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePhysicalRecordDto: UpdatePhysicalRecordDto) {
    return this.physicalRecordsService.update(+id, updatePhysicalRecordDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.physicalRecordsService.remove(+id);
  }
}
