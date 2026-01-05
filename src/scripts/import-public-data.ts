import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { PublicPhysicalRecords } from '../public_physical_records/entities/public_physical_record.entity';
import { TestCategories } from '../test_categories/entities/test_category.entity';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

interface DataRow {
  gender: string;
  age: string;
  category: string; // category_name 또는 category_id
  measured_value: string;
}

async function importData() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  // 파일 경로 (환경 변수 또는 명령줄 인자)
  const filePath =
    process.argv[2] || process.env.CSV_FILE_PATH || 'C:/Users/SAMSUNG/Desktop/KS_NFA_FTNESS_MESURE_ITEM_MESURE_INFO_202504.csv';

  if (!fs.existsSync(filePath)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${filePath}`);
    console.log('사용법: npm run import:csv <파일경로> (CSV 또는 엑셀 파일)');
    process.exit(1);
  }

  const fileExtension = filePath.toLowerCase().split('.').pop();
  let records: DataRow[] = [];
  let measureItemColumns: { column: string; categoryId: number }[] = []; // CSV 측정 항목 컬럼 정보 저장

  // 파일 확장자에 따라 읽기 방식 결정
  if (fileExtension === 'xlsx' || fileExtension === 'xls') {
    console.log(`📂 엑셀 파일 읽는 중: ${filePath}`);
    
    // 엑셀 파일 읽기
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // 첫 번째 시트 사용
    const worksheet = workbook.Sheets[sheetName];
    
    // JSON으로 변환 (헤더 포함)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
    });
    
    if (jsonData.length === 0) {
      console.error('❌ 엑셀 파일이 비어있습니다.');
      process.exit(1);
    }
    
    // 첫 번째 행을 헤더로 사용
    const headers = (jsonData[0] as string[]).map(h => h.toString().trim().toLowerCase());
    
    // 헤더 매핑 (다양한 형식 지원)
    const headerMap: { [key: string]: string } = {};
    headers.forEach((header, index) => {
      if (header.includes('gender') || header.includes('성별')) {
        headerMap['gender'] = headers[index];
      } else if (header.includes('age') || header.includes('나이')) {
        headerMap['age'] = headers[index];
      } else if (header.includes('category') || header.includes('항목') || header.includes('종목')) {
        headerMap['category'] = headers[index];
      } else if (header.includes('value') || header.includes('측정') || header.includes('값')) {
        headerMap['measured_value'] = headers[index];
      }
    });
    
    // 데이터 행 변환
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (row.every(cell => !cell || cell.toString().trim() === '')) continue; // 빈 행 건너뛰기
      
      const record: any = {};
      headers.forEach((header, index) => {
        const value = row[index];
        if (headerMap['gender'] === header) {
          record.gender = value?.toString().trim() || '';
        } else if (headerMap['age'] === header) {
          record.age = value?.toString().trim() || '';
        } else if (headerMap['category'] === header) {
          record.category = value?.toString().trim() || '';
        } else if (headerMap['measured_value'] === header) {
          record.measured_value = value?.toString().trim() || '';
        }
      });
      
      if (record.gender || record.age || record.category || record.measured_value) {
        records.push(record);
      }
    }
  } else {
    console.log(`📂 CSV 파일 읽는 중: ${filePath}`);
    
    // CSV 파일 읽기
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // CSV 파싱 (헤더 포함)
    const rawRecords = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    
    // 헤더 확인 (디버깅용)
    if (rawRecords.length > 0) {
      console.log('📋 발견된 CSV 헤더:', Object.keys(rawRecords[0] as object));
      console.log('📋 첫 번째 레코드 샘플:', rawRecords[0]);
    }
    
    const headerKeys = rawRecords.length > 0 ? Object.keys(rawRecords[0] as object) : [];
    
    // 성별과 나이 컬럼 찾기
    let genderColumn: string | null = null;
    let ageColumn: string | null = null;
    measureItemColumns = []; // 전역 변수 초기화
    
    headerKeys.forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('sex') || lowerKey.includes('gender') || lowerKey.includes('성별')) {
        genderColumn = key;
      } else if (lowerKey.includes('age') || lowerKey.includes('나이') || lowerKey.includes('연령')) {
        ageColumn = key;
      } else if (key.startsWith('MESURE_IEM_') && key.endsWith('_VALUE')) {
        // MESURE_IEM_001_VALUE -> 001 -> 1
        const match = key.match(/MESURE_IEM_(\d+)_VALUE/);
        if (match) {
          const categoryId = parseInt(match[1]);
          measureItemColumns.push({ column: key, categoryId });
        }
      }
    });
    
    console.log('📋 성별 컬럼:', genderColumn);
    console.log('📋 나이 컬럼:', ageColumn);
    console.log(`📋 측정 항목 컬럼: ${measureItemColumns.length}개 발견`);
    
    // 필수 컬럼 확인
    if (!genderColumn || !ageColumn) {
      console.error('❌ 필수 컬럼을 찾을 수 없습니다.');
      console.error('💡 성별(SEXDSTN_FLAG_CD) 또는 나이(MESURE_AGE_CO) 컬럼을 확인해주세요.');
      process.exit(1);
    }
    
    if (measureItemColumns.length === 0) {
      console.error('❌ 측정 항목 컬럼을 찾을 수 없습니다.');
      console.error('💡 MESURE_IEM_XXX_VALUE 형태의 컬럼이 있는지 확인해주세요.');
      process.exit(1);
    }
    
    // Wide format을 Long format으로 변환
    // 각 행의 각 측정 항목을 별도의 레코드로 변환
    records = [];
    for (const rawRecord of rawRecords) {
      const record = rawRecord as any; // 타입 단언
      const gender = record[genderColumn]?.toString().trim().toUpperCase();
      const age = record[ageColumn]?.toString().trim();
      
      if (!gender || !age) continue;
      
      // 각 측정 항목 컬럼을 순회하면서 값이 있으면 레코드 생성
      for (const { column, categoryId } of measureItemColumns) {
        const value = record[column]?.toString().trim();
        if (value && value !== '' && value !== 'null' && value !== 'NULL') {
          records.push({
            gender: gender,
            age: age,
            category: categoryId.toString(), // 카테고리 ID로 사용
            measured_value: value,
          });
        }
      }
    }
    
    console.log(`📋 변환된 레코드 샘플 (처음 3개):`, records.slice(0, 3));
  }

  console.log(`📊 총 ${records.length}개의 레코드를 발견했습니다.`);
  
  // 유효한 레코드만 필터링 (모든 필수 필드가 있는 경우)
  const validRecords = records.filter((record: any) => 
    record.gender && record.age && record.category && record.measured_value
  );
  
  console.log(`✅ 유효한 레코드: ${validRecords.length}개`);
  console.log(`⚠️  무효한 레코드: ${records.length - validRecords.length}개`);
  
  if (validRecords.length === 0) {
    console.error('❌ 유효한 레코드가 없습니다. CSV 파일 형식을 확인해주세요.');
    process.exit(1);
  }
  
  records = validRecords;

  // test_categories 테이블에서 모든 카테고리 가져오기
  const categories = await dataSource
    .getRepository(TestCategories)
    .find();
  
  // 카테고리를 ID 순서로 정렬 (ID가 작은 순서대로)
  const sortedCategories = categories.sort((a, b) => a.id - b.id);
  
  const categoryMap = new Map<string, number>(); // 이름 -> ID 매핑
  const categoryIdMap = new Map<number, TestCategories>(); // ID -> 카테고리 객체 매핑
  
  sortedCategories.forEach((cat) => {
    categoryMap.set(cat.name.toLowerCase(), cat.id);
    categoryIdMap.set(cat.id, cat);
  });

  console.log(`📋 ${categories.length}개의 측정 항목을 찾았습니다.`);
  console.log('📋 DB에 있는 카테고리 목록 (ID 순서):', sortedCategories.map(c => `ID:${c.id} - ${c.name}`).join(', '));
  
  // CSV 측정 항목 컬럼과 DB 카테고리 직접 매핑 확인
  // CSV 컬럼 번호(001, 002...)가 DB 카테고리 ID(1, 2...)와 직접 매핑됨
  if (fileExtension !== 'xlsx' && fileExtension !== 'xls' && measureItemColumns.length > 0) {
    const sortedMeasureColumns = [...measureItemColumns].sort((a, b) => a.categoryId - b.categoryId);
    
    console.log('📋 CSV 측정 항목 컬럼 → DB 카테고리 직접 매핑:');
    sortedMeasureColumns.forEach((item) => {
      const category = categoryIdMap.get(item.categoryId);
      if (category) {
        console.log(`  ${item.column} (번호: ${item.categoryId}) → DB 카테고리 ID:${category.id} (${category.name})`);
      } else {
        console.warn(`  ⚠️  ${item.column} (번호: ${item.categoryId}) → DB에 ID ${item.categoryId}인 카테고리가 없습니다.`);
      }
    });
  }

  // 배치 크기 설정 (한 번에 삽입할 레코드 수)
  const BATCH_SIZE = 1000;
  let successCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;
  const errors: string[] = [];

  // 배치로 데이터 삽입
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const entities: PublicPhysicalRecords[] = [];

    for (const record of batch) {
      try {
        // gender 검증 및 변환
        const gender = record.gender?.toUpperCase().trim();
        if (gender !== 'M' && gender !== 'F') {
          throw new Error(`잘못된 성별 값: ${record.gender}`);
        }

        // age 검증
        const age = parseInt(record.age);
        if (isNaN(age) || age < 0 || age > 150) {
          throw new Error(`잘못된 나이 값: ${record.age}`);
        }

        // category_id 찾기
        // CSV 컬럼 번호(001, 002...)가 DB 카테고리 ID(1, 2...)와 직접 매핑됨
        // 예: MESURE_IEM_001_VALUE → categoryId: 1 → DB 카테고리 ID: 1 (신장)
        //     MESURE_IEM_002_VALUE → categoryId: 2 → DB 카테고리 ID: 2 (체중)
        let category: TestCategories | undefined;
        const categoryInput = record.category?.trim();
        const categoryIdNum = parseInt(categoryInput);
        
        if (!isNaN(categoryIdNum)) {
          // CSV 측정 항목 번호를 그대로 DB 카테고리 ID로 사용
          category = categoryIdMap.get(categoryIdNum);
        } else {
          // 이름으로 입력된 경우
          const categoryId = categoryMap.get(categoryInput.toLowerCase());
          if (categoryId) {
            category = categoryIdMap.get(categoryId);
          }
        }
        
        if (!category) {
          // 카테고리가 없으면 건너뛰기 (에러 발생시키지 않음)
          // 예: CSV에 010이 있지만 DB에 ID 10이 없으면 건너뜀
          continue;
        }
        
        // measured_value 검증
        const measuredValue = parseFloat(record.measured_value);
        if (isNaN(measuredValue)) {
          throw new Error(`잘못된 측정값: ${record.measured_value}`);
        }

        const entity = new PublicPhysicalRecords();
        entity.gender = gender as 'M' | 'F';
        entity.age = age;
        entity.measuredValue = measuredValue.toString();
        entity.category = category;

        entities.push(entity);
      } catch (error) {
        errorCount++;
        const errorMsg = `행 ${i + batch.indexOf(record) + 2}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`⚠️  ${errorMsg}`);
      }
    }

    // 배치 삽입 (중복 체크 포함)
    if (entities.length > 0) {
      try {
        // 중복 체크: 각 entity의 정확한 조합을 확인
        // 배치 단위로 중복 체크를 효율적으로 수행
        const newEntities: PublicPhysicalRecords[] = [];
        
        // 배치를 작은 청크로 나누어 중복 체크 (너무 많은 쿼리 방지)
        const CHECK_CHUNK_SIZE = 100;
        for (let j = 0; j < entities.length; j += CHECK_CHUNK_SIZE) {
          const chunk = entities.slice(j, j + CHECK_CHUNK_SIZE);
          
          // 청크의 각 entity에 대해 중복 체크
          for (const entity of chunk) {
            const existing = await dataSource
              .getRepository(PublicPhysicalRecords)
              .findOne({
                where: {
                  gender: entity.gender,
                  age: entity.age,
                  category: { id: entity.category.id },
                  measuredValue: entity.measuredValue,
                },
              });

            if (!existing) {
              newEntities.push(entity);
            } else {
              duplicateCount++;
            }
          }
        }

        const batchDuplicateCount = entities.length - newEntities.length;

        // 새로운 데이터만 삽입
        if (newEntities.length > 0) {
          await dataSource
            .getRepository(PublicPhysicalRecords)
            .save(newEntities);
          successCount += newEntities.length;
        }

        console.log(
          `✅ ${i + entities.length}/${records.length} 레코드 처리 완료 (${Math.round(((i + entities.length) / records.length) * 100)}%) - 신규: ${newEntities.length}개, 중복: ${batchDuplicateCount}개`,
        );
      } catch (error) {
        console.error(`❌ 배치 삽입 실패:`, error.message);
        errorCount += entities.length;
      }
    }
  }

  console.log('\n📈 임포트 완료!');
  console.log(`✅ 성공 (신규 삽입): ${successCount}개`);
  console.log(`🔄 중복 스킵: ${duplicateCount}개`);
  console.log(`❌ 실패: ${errorCount}개`);

  if (errors.length > 0 && errors.length <= 20) {
    console.log('\n⚠️  에러 목록:');
    errors.forEach((err) => console.log(`  - ${err}`));
  } else if (errors.length > 20) {
    console.log(`\n⚠️  총 ${errors.length}개의 에러가 발생했습니다. (처음 20개만 표시)`);
    errors.slice(0, 20).forEach((err) => console.log(`  - ${err}`));
  }

  await app.close();
  process.exit(0);
}

importData().catch((error) => {
  console.error('❌ 임포트 중 오류 발생:', error);
  process.exit(1);
});
