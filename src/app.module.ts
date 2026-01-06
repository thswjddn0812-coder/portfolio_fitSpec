import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Gyms } from './gyms/entities/gym.entity';
import { RefreshTokens } from './refresh_tokens/entities/refresh_token.entity';
import { Members } from './members/entities/member.entity';
import { TestCategories } from './test_categories/entities/test_category.entity';
import { PhysicalRecords } from './physical_records/entities/physical_record.entity';
import { PublicPhysicalRecords } from './public_physical_records/entities/public_physical_record.entity';
import { EvaluationStandards } from './evaluation-standards/entities/evaluation-standard.entity';
import { GymsModule } from './gyms/gyms.module';
import { EvaluationStandardsModule } from './evaluation-standards/evaluation-standards.module';
import { MembersModule } from './members/members.module';
import { PhysicalRecordsModule } from './physical_records/physical_records.module';
import { PublicPhysicalRecordsModule } from './public_physical_records/public_physical_records.module';
import { RefreshTokensModule } from './refresh_tokens/refresh_tokens.module';
import { TestCategoriesModule } from './test_categories/test_categories.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: false,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'fitspec',
      entities: [
        Gyms,
        RefreshTokens,
        Members,
        TestCategories,
        PhysicalRecords,
        PublicPhysicalRecords,
        EvaluationStandards,
      ],
      synchronize:true, // Code First 방식으로 스키마 자동 생성
      logging: true, // SQL 쿼리 로그 출력
      ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
      } : false,
    }),
    GymsModule,
    EvaluationStandardsModule,
    MembersModule,
    PhysicalRecordsModule,
    PublicPhysicalRecordsModule,
    RefreshTokensModule,
    TestCategoriesModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
