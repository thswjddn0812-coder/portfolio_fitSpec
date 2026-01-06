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

  async create(gymId: number, createMemberDto: CreateMemberDto) {
    // gym 존재 확인
    const gym = await this.gymsRepository.findOne({
      where: { id: gymId },
    });

    if (!gym) {
      throw new NotFoundException(`ID ${gymId}인 헬스장을 찾을 수 없습니다.`);
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
    
    // gym 객체 대신 gymId만 반환
    const { gym: _, ...result } = savedMember;
    return {
      ...result,
      gymId: gym.id,
    };
  }

  async findAll(gymId: number, name?: string) {
    const where: any = { gym: { id: gymId } };
    
    if (name) {
      where.name = name;
    }

    const members = await this.membersRepository.find({
      where,
      relations: ['gym'],
      order: { createdAt: 'DESC' },
    });

    // gym 객체 대신 gymId만 반환
    return members.map((member) => {
      const { gym, ...rest } = member;
      return {
        ...rest,
        gymId: gym.id,
      };
    });
  }

  async findOne(gymId: number, id: number) {
    const member = await this.membersRepository.findOne({
      where: { id, gym: { id: gymId } },
      relations: ['gym'],
    });

    if (!member) {
      throw new NotFoundException(`헬스장 ID ${gymId}에 속한 회원 ID ${id}를 찾을 수 없습니다.`);
    }

    // gym 객체 대신 gymId만 반환
    const { gym, ...rest } = member;
    return {
      ...rest,
      gymId: gym.id,
    };
  }

  // 내부에서 사용할 실제 entity를 반환하는 메서드
  private async findOneEntity(gymId: number, id: number): Promise<Members> {
    const member = await this.membersRepository.findOne({
      where: { id, gym: { id: gymId } },
      relations: ['gym'],
    });

    if (!member) {
      throw new NotFoundException(`헬스장 ID ${gymId}에 속한 회원 ID ${id}를 찾을 수 없습니다.`);
    }

    return member;
  }

  async update(gymId: number, id: number, updateMemberDto: UpdateMemberDto) {
    const member = await this.findOneEntity(gymId, id);

    // 나머지 필드 업데이트
    if (updateMemberDto.name) member.name = updateMemberDto.name;
    if (updateMemberDto.gender) member.gender = updateMemberDto.gender;
    if (updateMemberDto.age !== undefined) member.age = updateMemberDto.age;
    if (updateMemberDto.height !== undefined) member.height = updateMemberDto.height.toString();
    if (updateMemberDto.weight !== undefined) member.weight = updateMemberDto.weight.toString();
    if (updateMemberDto.notes !== undefined) member.notes = updateMemberDto.notes || null;

    const updatedMember = await this.membersRepository.save(member);
    
    // gym 객체 대신 gymId만 반환
    const { gym: _, ...result } = updatedMember;
    return {
      ...result,
      gymId: updatedMember.gym.id,
    };
  }

  async remove(gymId: number, id: number) {
    const member = await this.findOneEntity(gymId, id);
    await this.membersRepository.remove(member);
    return { message: '회원이 삭제되었습니다.' };
  }
}
