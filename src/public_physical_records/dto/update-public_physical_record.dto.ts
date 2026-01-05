import { PartialType } from '@nestjs/mapped-types';
import { CreatePublicPhysicalRecordDto } from './create-public_physical_record.dto';

export class UpdatePublicPhysicalRecordDto extends PartialType(CreatePublicPhysicalRecordDto) {}
