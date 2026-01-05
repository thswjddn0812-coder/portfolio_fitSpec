import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { Members } from './entities/member.entity';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Members)
    private membersRepository: Repository<Members>,
  ) {}

  create(createMemberDto: CreateMemberDto) {
    const member = this.membersRepository.create(createMemberDto);
    return this.membersRepository.save(member);
  }

  findAll() {
    return this.membersRepository.find();
  }

  findOne(id: number) {
    return this.membersRepository.findOne({ where: { id } });
  }

  async update(id: number, updateMemberDto: UpdateMemberDto) {
    await this.membersRepository.update(id, updateMemberDto);
    return this.findOne(id);
  }

  remove(id: number) {
    return this.membersRepository.delete(id);
  }
}
