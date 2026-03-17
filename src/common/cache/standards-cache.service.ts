import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluationStandards } from '../../evaluation-standards/entities/evaluation-standard.entity';
import { AgeCoefficients } from '../../age-coefficients/entities/age-coefficient.entity';
import { TestCategories } from '../../test_categories/entities/test_category.entity';

type Gender = 'M' | 'F';

@Injectable()
export class StandardsCacheService implements OnModuleInit {
  private categoriesById = new Map<number, TestCategories>();
  private evalByGenderCategory = new Map<string, EvaluationStandards[]>(); // `${gender}:${categoryId}` -> bodyWeight desc
  private ageByGenderCategory = new Map<string, AgeCoefficients[]>(); // `${gender}:${categoryId}` -> age asc

  private lastLoadedAt = 0;
  private loading: Promise<void> | null = null;
  private hits = 0;
  private misses = 0;
  private reloads = 0;

  // 기준 데이터는 변경 빈도가 낮다는 전제. 필요하면 환경변수로 조절 가능.
  private readonly ttlMs = Number(process.env.STANDARDS_CACHE_TTL_MS ?? 10 * 60 * 1000);
  private readonly logEnabled = (process.env.STANDARDS_CACHE_LOG ?? 'true') !== 'false';

  constructor(
    @InjectRepository(EvaluationStandards)
    private readonly evaluationStandardsRepository: Repository<EvaluationStandards>,
    @InjectRepository(AgeCoefficients)
    private readonly ageCoefficientsRepository: Repository<AgeCoefficients>,
    @InjectRepository(TestCategories)
    private readonly testCategoriesRepository: Repository<TestCategories>,
  ) {}

  async onModuleInit() {
    // 서버 기동 시 warm-up
    await this.ensureLoaded();
  }

  private key(gender: Gender, categoryId: number) {
    return `${gender}:${categoryId}`;
  }

  private isStale(now = Date.now()) {
    return this.lastLoadedAt === 0 || now - this.lastLoadedAt > this.ttlMs;
  }

  async ensureLoaded() {
    const now = Date.now();
    if (!this.isStale(now)) {
      this.hits++;
      if (this.logEnabled) {
        console.log(
          `[StandardsCache] HIT (age/eval/categories). hits=${this.hits} misses=${this.misses} lastLoadedAt=${new Date(
            this.lastLoadedAt,
          ).toISOString()} ttlMs=${this.ttlMs}`,
        );
      }
      return;
    }

    this.misses++;
    if (this.logEnabled) {
      console.log(
        `[StandardsCache] MISS (loading). hits=${this.hits} misses=${this.misses} lastLoadedAt=${
          this.lastLoadedAt ? new Date(this.lastLoadedAt).toISOString() : 'never'
        } ttlMs=${this.ttlMs}`,
      );
    }

    if (this.loading) {
      await this.loading;
      return;
    }

    this.loading = (async () => {
      const startedAt = Date.now();
      const [categories, standards, coefficients] = await Promise.all([
        this.testCategoriesRepository.find(),
        this.evaluationStandardsRepository
          .createQueryBuilder('es')
          .leftJoinAndSelect('es.category', 'category')
          .getMany(),
        this.ageCoefficientsRepository.find(),
      ]);

      const categoriesById = new Map<number, TestCategories>();
      for (const c of categories) categoriesById.set(c.id, c);

      const evalByGenderCategory = new Map<string, EvaluationStandards[]>();
      for (const es of standards) {
        const gender = es.gender;
        const categoryId = es.category?.id;
        if (!gender || categoryId == null) continue;
        const k = this.key(gender, categoryId);
        if (!evalByGenderCategory.has(k)) evalByGenderCategory.set(k, []);
        evalByGenderCategory.get(k)!.push(es);
      }
      for (const [, arr] of evalByGenderCategory) {
        arr.sort((a, b) => (b.bodyWeight ?? 0) - (a.bodyWeight ?? 0));
      }

      const ageByGenderCategory = new Map<string, AgeCoefficients[]>();
      for (const ac of coefficients) {
        const gender = ac.gender;
        const categoryId = ac.categoryId;
        if (!gender || categoryId == null) continue;
        const k = this.key(gender, categoryId);
        if (!ageByGenderCategory.has(k)) ageByGenderCategory.set(k, []);
        ageByGenderCategory.get(k)!.push(ac);
      }
      for (const [, arr] of ageByGenderCategory) {
        arr.sort((a, b) => a.age - b.age);
      }

      this.categoriesById = categoriesById;
      this.evalByGenderCategory = evalByGenderCategory;
      this.ageByGenderCategory = ageByGenderCategory;
      this.lastLoadedAt = Date.now();
      this.reloads++;

      if (this.logEnabled) {
        console.log(
          `[StandardsCache] LOADED categories=${categories.length} evaluationStandards=${standards.length} ageCoefficients=${coefficients.length} reloads=${this.reloads} elapsedMs=${
            Date.now() - startedAt
          }`,
        );
      }
    })().finally(() => {
      this.loading = null;
    });

    await this.loading;
  }

  async getCategoryOrThrow(categoryId: number) {
    await this.ensureLoaded();
    const c = this.categoriesById.get(categoryId);
    if (!c) {
      throw new NotFoundException(`카테고리 ID ${categoryId}를 찾을 수 없습니다.`);
    }
    return c;
  }

  async getEvaluationStandardOrThrow(gender: Gender, categoryId: number, bodyWeight: number) {
    await this.ensureLoaded();
    const list = this.evalByGenderCategory.get(this.key(gender, categoryId));
    if (!list || list.length === 0) {
      throw new NotFoundException(`카테고리 ID ${categoryId}에 대한 평가 기준을 찾을 수 없습니다.`);
    }
    const found = list.find((es) => (es.bodyWeight ?? 0) <= bodyWeight);
    if (!found) {
      throw new NotFoundException(
        `해당 조건(gender: ${gender}, categoryId: ${categoryId}, bodyWeight: ${bodyWeight})에 맞는 평가 기준을 찾을 수 없습니다.`,
      );
    }
    return found;
  }

  async getNearestAgeCoefficientOrThrow(gender: Gender, categoryId: number, age: number) {
    await this.ensureLoaded();
    const list = this.ageByGenderCategory.get(this.key(gender, categoryId));
    if (!list || list.length === 0) {
      throw new NotFoundException(
        `해당 조건(gender: ${gender}, age: ${age}, categoryId: ${categoryId})에 맞는 나이 계수를 찾을 수 없습니다.`,
      );
    }

    // list는 age asc 정렬
    let lower: AgeCoefficients | undefined;
    let upper: AgeCoefficients | undefined;
    for (const item of list) {
      if (item.age <= age) lower = item;
      else {
        upper = item;
        break;
      }
    }

    if (!lower) return upper!;
    if (!upper) return lower;

    const lowerDiff = age - lower.age;
    const upperDiff = upper.age - age;
    return lowerDiff <= upperDiff ? lower : upper;
  }

  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      reloads: this.reloads,
      lastLoadedAt: this.lastLoadedAt,
      ttlMs: this.ttlMs,
    };
  }
}

