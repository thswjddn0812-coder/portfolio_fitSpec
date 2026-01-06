import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { Members } from './entities/member.entity';
import { Gyms } from '../gyms/entities/gym.entity';
import { EvaluationStandards } from '../evaluation-standards/entities/evaluation-standard.entity';
import { AgeCoefficients } from '../age-coefficients/entities/age-coefficient.entity';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Members)
    private membersRepository: Repository<Members>,
    @InjectRepository(Gyms)
    private gymsRepository: Repository<Gyms>,
    @InjectRepository(EvaluationStandards)
    private evaluationStandardsRepository: Repository<EvaluationStandards>,
    @InjectRepository(AgeCoefficients)
    private ageCoefficientsRepository: Repository<AgeCoefficients>,
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

  /**
   * 근력 등급 계산
   * @param gender 성별 ('M' | 'F')
   * @param age 나이
   * @param bodyWeight 체중
   * @param measuredWeight 측정된 1RM 기록
   * @param categoryId 카테고리 ID
   * @returns { level: string, nextLevelTarget: number, remaining: number }
   */
  async calculateStrengthLevel(
    gender: 'M' | 'F',
    age: number,
    bodyWeight: number,
    measuredWeight: number,
    categoryId: number,
  ): Promise<{ level: string; nextLevelTarget: number; remaining: number }> {
    // Step 1: EvaluationStandards에서 해당 gender와 categoryId를 가진 행 중,
    // bodyWeight가 입력값보다 작거나 같은 것 중 가장 큰 행을 가져오기
    const evaluationStandard = await this.evaluationStandardsRepository
      .createQueryBuilder('es')
      .leftJoinAndSelect('es.category', 'category')
      .where('es.gender = :gender', { gender })
      .andWhere('category.id = :categoryId', { categoryId })
      .andWhere('es.bodyWeight <= :bodyWeight', { bodyWeight })
      .orderBy('es.bodyWeight', 'DESC')
      .getOne();

    if (!evaluationStandard) {
      throw new NotFoundException(
        `해당 조건(gender: ${gender}, categoryId: ${categoryId}, bodyWeight: ${bodyWeight})에 맞는 평가 기준을 찾을 수 없습니다.`,
      );
    }

    // Step 2: AgeCoefficients에서 해당 gender와 age에 맞는 coefficient 가져오기
    // 나이가 딱 맞지 않으면 가장 가까운 아래 나이 값 사용
    const ageCoefficient = await this.ageCoefficientsRepository
      .createQueryBuilder('ac')
      .where('ac.gender = :gender', { gender })
      .andWhere('ac.age <= :age', { age })
      .orderBy('ac.age', 'DESC')
      .getOne();

    if (!ageCoefficient) {
      throw new NotFoundException(
        `해당 조건(gender: ${gender}, age: ${age})에 맞는 나이 계수를 찾을 수 없습니다.`,
      );
    }

    const coefficient = parseFloat(ageCoefficient.coefficient);

    // Step 3: DB에서 가져온 등급 기준값에 coefficient를 곱하기
    const adjustedLevels = {
      elite: evaluationStandard.elite ? parseFloat(evaluationStandard.elite) * coefficient : null,
      advanced: evaluationStandard.advanced
        ? parseFloat(evaluationStandard.advanced) * coefficient
        : null,
      intermediate: evaluationStandard.intermediate
        ? parseFloat(evaluationStandard.intermediate) * coefficient
        : null,
      novice: evaluationStandard.novice ? parseFloat(evaluationStandard.novice) * coefficient : null,
      beginner: evaluationStandard.beginner
        ? parseFloat(evaluationStandard.beginner) * coefficient
        : null,
    };

    // Step 4: 회원의 measuredWeight와 위에서 계산한 보정값들을 높은 순서(Elite부터)대로 비교
    // 회원이 속한 최상위 등급을 반환
    const levelOrder = [
      { name: 'Elite', value: adjustedLevels.elite },
      { name: 'Advanced', value: adjustedLevels.advanced },
      { name: 'Intermediate', value: adjustedLevels.intermediate },
      { name: 'Novice', value: adjustedLevels.novice },
      { name: 'Beginner', value: adjustedLevels.beginner },
    ];

    let currentLevel = 'Beginner';
    let currentIndex = levelOrder.length - 1;

    // Elite부터 순서대로 체크하여 measuredWeight가 해당 등급 기준값 이상인 최상위 등급 찾기
    for (let i = 0; i < levelOrder.length; i++) {
      const levelValue = levelOrder[i].value;
      if (levelValue !== null && levelValue !== undefined && measuredWeight >= levelValue) {
        currentLevel = levelOrder[i].name;
        currentIndex = i;
        break;
      }
    }

    // 다음 등급 찾기 (현재 등급보다 한 단계 위)
    let nextLevelTarget: number | null = null;
    for (let i = currentIndex - 1; i >= 0; i--) {
      const levelValue = levelOrder[i].value;
      if (levelValue !== null) {
        nextLevelTarget = levelValue;
        break;
      }
    }

    const remaining = nextLevelTarget !== null ? Math.max(0, nextLevelTarget - measuredWeight) : 0;

    return {
      level: currentLevel,
      nextLevelTarget: nextLevelTarget || 0,
      remaining: Math.round(remaining * 100) / 100, // 소수점 2자리까지
    };
  }
}
