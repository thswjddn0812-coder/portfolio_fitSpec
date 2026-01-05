import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PublicPhysicalRecordsService } from './public_physical_records.service';
import { CreatePublicPhysicalRecordDto } from './dto/create-public_physical_record.dto';
import { UpdatePublicPhysicalRecordDto } from './dto/update-public_physical_record.dto';

@Controller('public-physical-records')
export class PublicPhysicalRecordsController {
  constructor(private readonly publicPhysicalRecordsService: PublicPhysicalRecordsService) {}

  @Post()
  create(@Body() createPublicPhysicalRecordDto: CreatePublicPhysicalRecordDto) {
    return this.publicPhysicalRecordsService.create(createPublicPhysicalRecordDto);
  }

  @Get()
  findAll() {
    return this.publicPhysicalRecordsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.publicPhysicalRecordsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePublicPhysicalRecordDto: UpdatePublicPhysicalRecordDto) {
    return this.publicPhysicalRecordsService.update(+id, updatePublicPhysicalRecordDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.publicPhysicalRecordsService.remove(+id);
  }
}
