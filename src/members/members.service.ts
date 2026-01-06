import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { Members } from './entities/member.entity';
import { Gyms } from '../gyms/entities/gym.entity';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Members)
    private membersRepository: Repository<Members>,
    @InjectRepository(Gyms)
    private gymsRepository: Repository<Gyms>,
  ) {}

  async create(createMemberDto: CreateMemberDto) {
    // gym 존재 확인
    const gym = await this.gymsRepository.findOne({
      where: { id: createMemberDto.gymId },
    });

    if (!gym) {
      throw new NotFoundException(`ID ${createMemberDto.gymId}인 헬스장을 찾을 수 없습니다.`);
    }

    const member = this.membersRepository.create({
      name: createMemberDto.name,
      gender: createMemberDto.gender,
      age: createMemberDto.age,
      height: createMemberDto.height.toString(),
      weight: createMemberDto.weight.toString(),
      notes: createMemberDto.notes || null,
      gym: gym,
    });

    const savedMember = await this.membersRepository.save(member);
    
    // 관계 정보 제외하고 반환
    const { gym: _, ...result } = savedMember;
    return {
      ...result,
      gymId: gym.id,
    };
  }

  async findAll(gymId?: number) {
    const where = gymId ? { gym: { id: gymId } } : {};
    return this.membersRepository.find({
      where,
      relations: ['gym'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const member = await this.membersRepository.findOne({
      where: { id },
      relations: ['gym'],
    });

    if (!member) {
      throw new NotFoundException(`ID ${id}인 회원을 찾을 수 없습니다.`);
    }

    return member;
  }

  async update(id: number, updateMemberDto: UpdateMemberDto) {
    const member = await this.findOne(id);

    // gym_id가 변경되는 경우 gym 존재 확인
    if (updateMemberDto.gymId) {
      const gym = await this.gymsRepository.findOne({
        where: { id: updateMemberDto.gymId },
      });

      if (!gym) {
        throw new NotFoundException(`ID ${updateMemberDto.gymId}인 헬스장을 찾을 수 없습니다.`);
      }

      member.gym = gym;
    }

    // 나머지 필드 업데이트
    if (updateMemberDto.name) member.name = updateMemberDto.name;
    if (updateMemberDto.gender) member.gender = updateMemberDto.gender;
    if (updateMemberDto.age !== undefined) member.age = updateMemberDto.age;
    if (updateMemberDto.height !== undefined) member.height = updateMemberDto.height.toString();
    if (updateMemberDto.weight !== undefined) member.weight = updateMemberDto.weight.toString();
    if (updateMemberDto.notes !== undefined) member.notes = updateMemberDto.notes || null;

    const updatedMember = await this.membersRepository.save(member);
    
    // 관계 정보 제외하고 반환
    const { gym: _, ...result } = updatedMember;
    return {
      ...result,
      gymId: updatedMember.gym.id,
    };
  }

  async remove(id: number) {
    const member = await this.findOne(id);
    await this.membersRepository.remove(member);
    return { message: '회원이 삭제되었습니다.' };
  }
}
