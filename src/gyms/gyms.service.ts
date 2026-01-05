import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateGymDto } from './dto/create-gym.dto';
import { UpdateGymDto } from './dto/update-gym.dto';
import { Gyms } from './entities/gym.entity';

@Injectable()
export class GymsService {
  constructor(
    @InjectRepository(Gyms)
    private gymsRepository: Repository<Gyms>,
  ) {}

  create(createGymDto: CreateGymDto) {
    const gym = this.gymsRepository.create(createGymDto);
    return this.gymsRepository.save(gym);
  }

  findAll() {
    return this.gymsRepository.find();
  }

  findOne(id: number) {
    return this.gymsRepository.findOne({ where: { id } });
  }

  async update(id: number, updateGymDto: UpdateGymDto) {
    await this.gymsRepository.update(id, updateGymDto);
    return this.findOne(id);
  }

  remove(id: number) {
    return this.gymsRepository.delete(id);
  }
}
