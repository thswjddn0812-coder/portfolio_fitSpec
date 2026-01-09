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
    results: Array<{
      categoryId: number;
      exerciseName: string;
      value: number;
      unit: string;
      score: number;
      adjustedLevels: {
        elite: number | null;
        advanced: number | null;
        intermediate: number | null;
        novice: number | null;
        beginner: number | null;
      };
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
      // 현재 날짜와 시간을 한국 시간대(KST, UTC+9)로 변환하여 YYYY-MM-DD HH:mm:ss 형식으로 저장
      const now = new Date();
      // UTC 시간에 9시간(32400000ms) 추가하여 한국 시간으로 변환
      const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const measuredDateTime = koreaTime.toISOString().slice(0, 19).replace('T', ' '); // YYYY-MM-DD HH:mm:ss 형식
      const results: Array<{
        categoryId: number;
        exerciseName: string;
        value: number;
        unit: string;
        score: number;
        adjustedLevels: {
          elite: number | null;
          advanced: number | null;
          intermediate: number | null;
          novice: number | null;
          beginner: number | null;
        };
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

        // 4. 등급 계산 (DB 저장 전에 먼저 수행하여 gradeScore를 얻기 위해)
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

        for (let i = 0; i < levelOrder.length; i++) {
          const levelValue = levelOrder[i].value;
          if (levelValue !== null && levelValue !== undefined && measurement.value >= levelValue) {
            currentLevel = levelOrder[i].name;
            console.log(`[DEBUG] 등급 판정: ${measurement.value} >= ${levelValue} (${levelOrder[i].name})`);
            break;
          }
        }

        const score = this.getScoreByLevel(currentLevel);

        // 5. DB에 저장 (등급 계산 후 모든 정보 포함)
        const physicalRecord = queryRunner.manager.create(PhysicalRecords, {
          value: measurement.value.toString(),
          measuredAt: measuredDateTime,
          weightAtMeasured: member.weight,
          heightAtMeasured: member.height,
          ageAtMeasured: member.age,
          gradeScore: score,
          trainerFeedback: measurement.trainerFeedback || null,
          member: member,
          category: category,
        });

        await queryRunner.manager.save(PhysicalRecords, physicalRecord);

        results.push({
          categoryId: measurement.categoryId,
          exerciseName: category.name,
          value: measurement.value,
          unit: category.unit,
          score: score,
          adjustedLevels: {
            elite: adjustedLevels.elite ? Math.round(adjustedLevels.elite * 100) / 100 : null,
            advanced: adjustedLevels.advanced ? Math.round(adjustedLevels.advanced * 100) / 100 : null,
            intermediate: adjustedLevels.intermediate ? Math.round(adjustedLevels.intermediate * 100) / 100 : null,
            novice: adjustedLevels.novice ? Math.round(adjustedLevels.novice * 100) / 100 : null,
            beginner: adjustedLevels.beginner ? Math.round(adjustedLevels.beginner * 100) / 100 : null,
          },
        });
      }

      // 트랜잭션 커밋
      await queryRunner.commitTransaction();

      return {
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

  /**
   * 저장된 측정 결과 조회 (같은 measuredAt로 저장된 레코드들을 묶어서 반환)
   * 날짜 필터링이 있으면 해당 날짜의 모든 측정 세션을 그룹화하여 반환
   * 날짜 필터링이 없으면 모든 측정 기록을 날짜별로 그룹화하여 반환
   */
  async getMeasurements(
    gymId: number,
    memberId: number,
    date?: string, // YYYY-MM-DD 형식, 선택사항
  ): Promise<{
    sessions?: Array<{
      measuredAt: string;
      results: Array<{
        categoryId: number;
        exerciseName: string;
        value: number;
        unit: string;
        score: number;
        adjustedLevels: {
          elite: number | null;
          advanced: number | null;
          intermediate: number | null;
          novice: number | null;
          beginner: number | null;
        };
        trainerFeedback?: string | null;
      }>;
    }>;
    sessionsByDate?: Array<{
      date: string;
      sessions: Array<{
        measuredAt: string;
        results: Array<{
          categoryId: number;
          exerciseName: string;
          value: number;
          unit: string;
          score: number;
          adjustedLevels: {
            elite: number | null;
            advanced: number | null;
            intermediate: number | null;
            novice: number | null;
            beginner: number | null;
          };
          trainerFeedback?: string | null;
        }>;
      }>;
    }>;
    results?: Array<{
      categoryId: number;
      exerciseName: string;
      value: number;
      unit: string;
      score: number;
      adjustedLevels: {
        elite: number | null;
        advanced: number | null;
        intermediate: number | null;
        novice: number | null;
        beginner: number | null;
      };
      trainerFeedback?: string | null;
    }>;
    measuredAt?: string;
  }> {
    // 1. 회원 정보 조회 및 권한 확인
    const member = await this.membersRepository.findOne({
      where: { id: memberId, gym: { id: gymId } },
    });

    if (!member) {
      throw new NotFoundException(`헬스장 ID ${gymId}에 속한 회원 ID ${memberId}를 찾을 수 없습니다.`);
    }

    // 2. 측정 기록 조회
    let query = this.physicalRecordsRepository
      .createQueryBuilder('pr')
      .leftJoinAndSelect('pr.category', 'category')
      .where('pr.member_id = :memberId', { memberId })
      .orderBy('pr.measured_at', 'DESC');

    // 날짜 필터링 (있으면)
    if (date) {
      // YYYY-MM-DD 형식의 날짜를 시작일시와 종료일시로 변환
      const startDate = `${date} 00:00:00`;
      const endDate = `${date} 23:59:59`;
      query.andWhere('pr.measured_at >= :startDate', { startDate });
      query.andWhere('pr.measured_at <= :endDate', { endDate });
    }

    const records = await query.getMany();

    if (records.length === 0) {
      return {
        sessions: [],
      };
    }

    const gender = member.gender;

    // 3. 날짜 필터링이 있으면 세션별로 그룹화, 없으면 최신 세션만 반환
    if (date) {
      // 날짜 필터링이 있을 때: 같은 날짜의 모든 측정 세션을 그룹화
      const sessionsMap = new Map<string, PhysicalRecords[]>();

      // measuredAt별로 그룹화
      for (const record of records) {
        const measuredAt = record.measuredAt;
        if (!sessionsMap.has(measuredAt)) {
          sessionsMap.set(measuredAt, []);
        }
        sessionsMap.get(measuredAt)!.push(record);
      }

      // 각 세션별로 결과 계산
      const sessions: Array<{
        measuredAt: string;
        results: Array<{
          categoryId: number;
          exerciseName: string;
          value: number;
          unit: string;
          score: number;
          adjustedLevels: {
            elite: number | null;
            advanced: number | null;
            intermediate: number | null;
            novice: number | null;
            beginner: number | null;
          };
          trainerFeedback?: string | null;
        }>;
      }> = [];

      // measuredAt 기준 내림차순으로 정렬 (최신순)
      const sortedMeasuredAts = Array.from(sessionsMap.keys()).sort((a, b) => {
        return new Date(b).getTime() - new Date(a).getTime();
      });

      for (const measuredAt of sortedMeasuredAts) {
        const sessionRecords = sessionsMap.get(measuredAt)!;
        const sessionResults: Array<{
          categoryId: number;
          exerciseName: string;
          value: number;
          unit: string;
          score: number;
          adjustedLevels: {
            elite: number | null;
            advanced: number | null;
            intermediate: number | null;
            novice: number | null;
            beginner: number | null;
          };
          trainerFeedback?: string | null;
        }> = [];

        for (const record of sessionRecords) {
          const bodyWeight = parseFloat(record.weightAtMeasured || member.weight);
          const age = record.ageAtMeasured || member.age;
          const measuredValue = parseFloat(record.value);

          // EvaluationStandards 조회
          const evaluationStandard = await this.evaluationStandardsRepository
            .createQueryBuilder('es')
            .leftJoinAndSelect('es.category', 'category')
            .where('es.gender = :gender', { gender })
            .andWhere('category.id = :categoryId', { categoryId: record.category.id })
            .andWhere('es.bodyWeight <= :bodyWeight', { bodyWeight })
            .orderBy('es.bodyWeight', 'DESC')
            .getOne();

          if (!evaluationStandard) {
            throw new NotFoundException(
              `카테고리 ID ${record.category.id}에 대한 평가 기준을 찾을 수 없습니다.`,
            );
          }

          // AgeCoefficients 조회
          const ageCoefficient = await this.findNearestAgeCoefficient(
            gender,
            age,
            record.category.id,
          );

          const coefficient = parseFloat(ageCoefficient.coefficient);

          // adjustedLevels 계산
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

          sessionResults.push({
            categoryId: record.category.id,
            exerciseName: record.category.name,
            value: measuredValue,
            unit: record.category.unit,
            score: record.gradeScore || 1,
            adjustedLevels: {
              elite: adjustedLevels.elite ? Math.round(adjustedLevels.elite * 100) / 100 : null,
              advanced: adjustedLevels.advanced ? Math.round(adjustedLevels.advanced * 100) / 100 : null,
              intermediate: adjustedLevels.intermediate ? Math.round(adjustedLevels.intermediate * 100) / 100 : null,
              novice: adjustedLevels.novice ? Math.round(adjustedLevels.novice * 100) / 100 : null,
              beginner: adjustedLevels.beginner ? Math.round(adjustedLevels.beginner * 100) / 100 : null,
            },
            trainerFeedback: record.trainerFeedback,
          });
        }

        sessions.push({
          measuredAt,
          results: sessionResults,
        });
      }

      return {
        sessions,
      };
    } else {
      // 날짜 필터링이 없을 때: 모든 측정 기록을 날짜별로 그룹화하여 반환
      // 1단계: measuredAt별로 그룹화 (세션 그룹)
      const sessionsMap = new Map<string, PhysicalRecords[]>();
      
      for (const record of records) {
        // measuredAt를 문자열로 변환 (타입은 string이지만 런타임에 Date일 수 있음)
        let measuredAtStr: string;
        const measuredAtValue = record.measuredAt as any;
        if (measuredAtValue instanceof Date) {
          measuredAtStr = measuredAtValue.toISOString();
        } else if (typeof measuredAtValue === 'string') {
          measuredAtStr = measuredAtValue;
        } else {
          measuredAtStr = new Date(measuredAtValue).toISOString();
        }
        
        if (!sessionsMap.has(measuredAtStr)) {
          sessionsMap.set(measuredAtStr, []);
        }
        sessionsMap.get(measuredAtStr)!.push(record);
      }

      // 2단계: 날짜별로 그룹화
      const datesMap = new Map<string, Map<string, PhysicalRecords[]>>();
      
      for (const [measuredAt, sessionRecords] of sessionsMap.entries()) {
        // measuredAt는 이미 문자열이므로 날짜 부분만 추출 (YYYY-MM-DD)
        // "2026-01-09T10:00:00" 또는 "2026-01-09 10:00:00" 형식 처리
        const dateKey = measuredAt.split('T')[0].split(' ')[0];
        
        if (!datesMap.has(dateKey)) {
          datesMap.set(dateKey, new Map());
        }
        // measuredAt는 이미 문자열이므로 그대로 사용
        datesMap.get(dateKey)!.set(measuredAt, sessionRecords);
      }

      // 3단계: 날짜별로 결과 구성
      const sessionsByDate: Array<{
        date: string;
        sessions: Array<{
          measuredAt: string;
          results: Array<{
            categoryId: number;
            exerciseName: string;
            value: number;
            unit: string;
            score: number;
            adjustedLevels: {
              elite: number | null;
              advanced: number | null;
              intermediate: number | null;
              novice: number | null;
              beginner: number | null;
            };
            trainerFeedback?: string | null;
          }>;
        }>;
      }> = [];

      // 날짜 기준 내림차순 정렬 (최신 날짜가 먼저)
      const sortedDates = Array.from(datesMap.keys()).sort((a, b) => {
        return new Date(b).getTime() - new Date(a).getTime();
      });

      for (const dateKey of sortedDates) {
        const sessionsForDate = datesMap.get(dateKey)!;
        const sessions: Array<{
          measuredAt: string;
          results: Array<{
            categoryId: number;
            exerciseName: string;
            value: number;
            unit: string;
            score: number;
            adjustedLevels: {
              elite: number | null;
              advanced: number | null;
              intermediate: number | null;
              novice: number | null;
              beginner: number | null;
            };
            trainerFeedback?: string | null;
          }>;
        }> = [];

        // 같은 날짜 내에서 measuredAt 기준 내림차순 정렬 (최신 세션이 먼저)
        const sortedMeasuredAts = Array.from(sessionsForDate.keys()).sort((a, b) => {
          return new Date(b).getTime() - new Date(a).getTime();
        });

        for (const measuredAt of sortedMeasuredAts) {
          const sessionRecords = sessionsForDate.get(measuredAt)!;
          const sessionResults: Array<{
            categoryId: number;
            exerciseName: string;
            value: number;
            unit: string;
            score: number;
            adjustedLevels: {
              elite: number | null;
              advanced: number | null;
              intermediate: number | null;
              novice: number | null;
              beginner: number | null;
            };
            trainerFeedback?: string | null;
          }> = [];

          for (const record of sessionRecords) {
            const bodyWeight = parseFloat(record.weightAtMeasured || member.weight);
            const age = record.ageAtMeasured || member.age;
            const measuredValue = parseFloat(record.value);

            // EvaluationStandards 조회
            const evaluationStandard = await this.evaluationStandardsRepository
              .createQueryBuilder('es')
              .leftJoinAndSelect('es.category', 'category')
              .where('es.gender = :gender', { gender })
              .andWhere('category.id = :categoryId', { categoryId: record.category.id })
              .andWhere('es.bodyWeight <= :bodyWeight', { bodyWeight })
              .orderBy('es.bodyWeight', 'DESC')
              .getOne();

            if (!evaluationStandard) {
              throw new NotFoundException(
                `카테고리 ID ${record.category.id}에 대한 평가 기준을 찾을 수 없습니다.`,
              );
            }

            // AgeCoefficients 조회
            const ageCoefficient = await this.findNearestAgeCoefficient(
              gender,
              age,
              record.category.id,
            );

            const coefficient = parseFloat(ageCoefficient.coefficient);

            // adjustedLevels 계산
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

            sessionResults.push({
              categoryId: record.category.id,
              exerciseName: record.category.name,
              value: measuredValue,
              unit: record.category.unit,
              score: record.gradeScore || 1,
              adjustedLevels: {
                elite: adjustedLevels.elite ? Math.round(adjustedLevels.elite * 100) / 100 : null,
                advanced: adjustedLevels.advanced ? Math.round(adjustedLevels.advanced * 100) / 100 : null,
                intermediate: adjustedLevels.intermediate ? Math.round(adjustedLevels.intermediate * 100) / 100 : null,
                novice: adjustedLevels.novice ? Math.round(adjustedLevels.novice * 100) / 100 : null,
                beginner: adjustedLevels.beginner ? Math.round(adjustedLevels.beginner * 100) / 100 : null,
              },
              trainerFeedback: record.trainerFeedback,
            });
          }

          sessions.push({
            measuredAt,
            results: sessionResults,
          });
        }

        sessionsByDate.push({
          date: dateKey,
          sessions,
        });
      }

      return {
        sessionsByDate,
      };
    }
  }
}
