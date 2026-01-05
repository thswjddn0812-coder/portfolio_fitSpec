import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GymsService } from './gyms.service';
import { CreateGymDto } from './dto/create-gym.dto';
import { UpdateGymDto } from './dto/update-gym.dto';

@Controller('gyms')
export class GymsController {
  constructor(private readonly gymsService: GymsService) {}

  @Post()
  create(@Body() createGymDto: CreateGymDto) {
    return this.gymsService.create(createGymDto);
  }

  @Get()
  findAll() {
    return this.gymsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gymsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGymDto: UpdateGymDto) {
    return this.gymsService.update(+id, updateGymDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.gymsService.remove(+id);
  }
}
