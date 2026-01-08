import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, DataSource } from 'typeorm';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { Members } from './entities/member.entity';
import { Gyms } from '../gyms/entities/gym.entity';
import { EvaluationStandards } from '../evaluation-standards/entities/evaluation-standard.entity';
import { AgeCoefficients } from '../age-coefficients/entities/age-coefficient.entity';
import { TestCategories } from '../test_categories/entities/test_category.entity';
import { PhysicalRecords } from '../physical_records/entities/physical_record.entity';
import { CalculateMeasurementsDto } from './dto/calculate-measurements.dto';

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
    @InjectRepository(TestCategories)
    private testCategoriesRepository: Repository<TestCategories>,
    @InjectRepository(PhysicalRecords)
    private physicalRecordsRepository: Repository<PhysicalRecords>,
    private dataSource: DataSource,
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

    // Step 2: AgeCoefficients에서 해당 gender, age, categoryId에 맞는 coefficient 가져오기
    // 나이가 딱 맞지 않으면 가장 가까운 나이 값 사용
    const ageCoefficient = await this.findNearestAgeCoefficient(gender, age, categoryId);

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

  /**
   * 나이 계수를 찾는 헬퍼 메서드 (가장 가까운 나이, 카테고리별)
   * 정확한 categoryId가 일치하는 데이터만 사용
   */
  private async findNearestAgeCoefficient(
    gender: 'M' | 'F',
    age: number,
    categoryId: number,
  ): Promise<AgeCoefficients> {
    // 디버깅: 해당 categoryId로 찾을 수 있는 데이터 확인
    const allWithCategory = await this.ageCoefficientsRepository.find({
      where: { gender, categoryId },
    });
    console.log(`[DEBUG] categoryId=${categoryId}인 데이터:`, allWithCategory.length, '개');
    if (allWithCategory.length > 0) {
      console.log('[DEBUG] 찾은 데이터:', allWithCategory.map(a => ({ age: a.age, coefficient: a.coefficient, categoryId: a.categoryId })));
    }

    // 아래 나이 중 가장 큰 값 (정확한 categoryId로만 찾기)
    const lowerAge = await this.ageCoefficientsRepository
      .createQueryBuilder('ac')
      .where('ac.gender = :gender', { gender })
      .andWhere('ac.categoryId = :categoryId', { categoryId })
      .andWhere('ac.age <= :age', { age })
      .orderBy('ac.age', 'DESC')
      .getOne();

    // 위 나이 중 가장 작은 값 (정확한 categoryId로만 찾기)
    const upperAge = await this.ageCoefficientsRepository
      .createQueryBuilder('ac')
      .where('ac.gender = :gender', { gender })
      .andWhere('ac.categoryId = :categoryId', { categoryId })
      .andWhere('ac.age > :age', { age })
      .orderBy('ac.age', 'ASC')
      .getOne();

    console.log(`[DEBUG] lowerAge:`, lowerAge ? { age: lowerAge.age, coefficient: lowerAge.coefficient } : 'null');
    console.log(`[DEBUG] upperAge:`, upperAge ? { age: upperAge.age, coefficient: upperAge.coefficient } : 'null');

    // 가장 가까운 나이 선택
    if (!lowerAge && !upperAge) {
      throw new NotFoundException(
        `해당 조건(gender: ${gender}, age: ${age}, categoryId: ${categoryId})에 맞는 나이 계수를 찾을 수 없습니다. DB에 카테고리 ${categoryId}에 대한 나이 계수 데이터를 추가해주세요.`,
      );
    }

    if (!lowerAge) return upperAge!;
    if (!upperAge) return lowerAge;

    const lowerDiff = age - lowerAge.age;
    const upperDiff = upperAge.age - age;

    return lowerDiff <= upperDiff ? lowerAge : upperAge;
  }

  /**
   * 등급에 따른 점수 반환
   */
  private getScoreByLevel(level: string): number {
    const levelScoreMap: Record<string, number> = {
      Beginner: 1,
      Novice: 2,
      Intermediate: 3,
      Advanced: 4,
      Elite: 5,
    };
    return levelScoreMap[level] || 1;
  }

  /**
   * 평균 점수에 따른 전체 등급 반환
   */
  private getOverallLevelByAverageScore(averageScore: number): string {
    if (averageScore >= 4.5) return 'Elite';
    if (averageScore >= 3.5) return 'Advanced';
    if (averageScore >= 2.5) return 'Intermediate';
    if (averageScore >= 1.5) return 'Novice';
    return 'Beginner';
  }

  /**
   * 전체 등급에 따른 설명 반환
   */
  private getDescriptionByLevel(level: string): string {
    const descriptions: Record<string, string> = {
      Beginner: '초보자 수준입니다. 꾸준한 운동으로 실력을 향상시켜보세요.',
      Novice: '초급자 수준입니다. 더 높은 목표를 향해 도전해보세요.',
      Intermediate: '중급자 수준입니다. 좋은 실력입니다.',
      Advanced: '고급자 수준입니다. 훌륭한 실력입니다.',
      Elite: '엘리트 수준입니다. 최고의 실력입니다.',
    };
    return descriptions[level] || descriptions['Beginner'];
  }

  /**
   * 체력 측정 결과 처리 및 등급 계산
   */
  async calculateAndSaveMeasurements(
    gymId: number,
    dto: CalculateMeasurementsDto,
  ): Promise<{
    totalSummary: {
      overallLevel: string;
      averageScore: number;
      description: string;
    };
    results: Array<{
      categoryId: number;
      exerciseName: string;
      value: number;
      unit: string;
      level: string;
      score: number;
      nextLevel: string;
      nextLevelTarget: number;
      remaining: number;
    }>;
  }> {
    // 1. 회원 정보 조회
    const member = await this.membersRepository.findOne({
      where: { id: dto.memberId, gym: { id: gymId } },
    });

    if (!member) {
      throw new NotFoundException(`헬스장 ID ${gymId}에 속한 회원 ID ${dto.memberId}를 찾을 수 없습니다.`);
    }

    const gender = member.gender;
    const age = member.age;
    const bodyWeight = parseFloat(member.weight);

    // 2. 트랜잭션 시작
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
      const results: Array<{
        categoryId: number;
        exerciseName: string;
        value: number;
        unit: string;
        level: string;
        score: number;
        nextLevel: string;
        nextLevelTarget: number;
        remaining: number;
      }> = [];

      // 3. 각 측정값 처리
      for (const measurement of dto.measurements) {
        // 카테고리 정보 조회
        const category = await this.testCategoriesRepository.findOne({
          where: { id: measurement.categoryId },
        });

        if (!category) {
          throw new NotFoundException(`카테고리 ID ${measurement.categoryId}를 찾을 수 없습니다.`);
        }

        // DB에 저장
        const physicalRecord = queryRunner.manager.create(PhysicalRecords, {
          value: measurement.value.toString(),
          measuredAt: today,
          weightAtMeasured: member.weight,
          member: member,
          category: category,
        });

        await queryRunner.manager.save(PhysicalRecords, physicalRecord);

        // 4. 등급 계산
        // 4-1. EvaluationStandards에서 체중과 가장 가까운 내림값 찾기
        const evaluationStandard = await queryRunner.manager
          .createQueryBuilder(EvaluationStandards, 'es')
          .leftJoinAndSelect('es.category', 'category')
          .where('es.gender = :gender', { gender })
          .andWhere('category.id = :categoryId', { categoryId: measurement.categoryId })
          .andWhere('es.bodyWeight <= :bodyWeight', { bodyWeight })
          .orderBy('es.bodyWeight', 'DESC')
          .getOne();

        if (!evaluationStandard) {
          throw new NotFoundException(
            `해당 조건(gender: ${gender}, categoryId: ${measurement.categoryId}, bodyWeight: ${bodyWeight})에 맞는 평가 기준을 찾을 수 없습니다.`,
          );
        }

        // 4-2. AgeCoefficients에서 가장 가까운 나이 계수 찾기 (카테고리별)
        const ageCoefficient = await this.findNearestAgeCoefficient(gender, age, measurement.categoryId);

        const coefficient = parseFloat(ageCoefficient.coefficient);

        // 디버깅: 원본 기준값 출력
        console.log(`[DEBUG] EvaluationStandard 원본 값:`, {
          bodyWeight: evaluationStandard.bodyWeight,
          elite: evaluationStandard.elite,
          advanced: evaluationStandard.advanced,
          intermediate: evaluationStandard.intermediate,
          novice: evaluationStandard.novice,
          beginner: evaluationStandard.beginner,
        });
        console.log(`[DEBUG] AgeCoefficient:`, {
          age: ageCoefficient.age,
          coefficient: ageCoefficient.coefficient,
          categoryId: ageCoefficient.categoryId,
        });

        // 4-3. 기준치에 나이 계수 곱하기
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

        // 디버깅: 계산된 기준값 출력
        console.log(`[DEBUG] 계산된 기준값 (coefficient=${coefficient}):`, adjustedLevels);
        console.log(`[DEBUG] 측정값:`, measurement.value);

        // 4-4. 등급 판정
        const levelOrder = [
          { name: 'Elite', value: adjustedLevels.elite },
          { name: 'Advanced', value: adjustedLevels.advanced },
          { name: 'Intermediate', value: adjustedLevels.intermediate },
          { name: 'Novice', value: adjustedLevels.novice },
          { name: 'Beginner', value: adjustedLevels.beginner },
        ];

        let currentLevel = 'Beginner';
        let currentIndex = levelOrder.length - 1;

        for (let i = 0; i < levelOrder.length; i++) {
          const levelValue = levelOrder[i].value;
          if (levelValue !== null && levelValue !== undefined && measurement.value >= levelValue) {
            currentLevel = levelOrder[i].name;
            currentIndex = i;
            console.log(`[DEBUG] 등급 판정: ${measurement.value} >= ${levelValue} (${levelOrder[i].name})`);
            break;
          }
        }

        // 다음 등급 찾기
        let nextLevel = 'Elite';
        let nextLevelTarget: number | null = null;
        for (let i = currentIndex - 1; i >= 0; i--) {
          const levelValue = levelOrder[i].value;
          if (levelValue !== null) {
            nextLevel = levelOrder[i].name;
            nextLevelTarget = levelValue;
            break;
          }
        }

        const remaining = nextLevelTarget !== null ? Math.max(0, nextLevelTarget - measurement.value) : 0;
        const score = this.getScoreByLevel(currentLevel);

        results.push({
          categoryId: measurement.categoryId,
          exerciseName: category.name,
          value: measurement.value,
          unit: category.unit,
          level: currentLevel,
          score: score,
          nextLevel: nextLevel,
          nextLevelTarget: nextLevelTarget || 0,
          remaining: Math.round(remaining * 100) / 100,
        });
      }

      // 트랜잭션 커밋
      await queryRunner.commitTransaction();

      // 5. 전체 요약 계산
      const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
      const overallLevel = this.getOverallLevelByAverageScore(averageScore);
      const description = this.getDescriptionByLevel(overallLevel);

      return {
        totalSummary: {
          overallLevel,
          averageScore: Math.round(averageScore * 100) / 100,
          description,
        },
        results,
      };
    } catch (error) {
      // 트랜잭션 롤백
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // 쿼리 러너 해제
      await queryRunner.release();
    }
  }
}
