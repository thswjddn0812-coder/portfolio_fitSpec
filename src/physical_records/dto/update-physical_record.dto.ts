import { PartialType } from '@nestjs/mapped-types';
import { CreatePhysicalRecordDto } from './create-physical_record.dto';

export class UpdatePhysicalRecordDto extends PartialType(CreatePhysicalRecordDto) {}
