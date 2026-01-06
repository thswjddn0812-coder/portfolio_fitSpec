import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 쿠키 파서 설정
  app.use(cookieParser.default());
  
  // 전역 Exception Filter 설정
  app.useGlobalFilters(new HttpExceptionFilter());
  
  // 전역 Interceptor 설정
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );
  
  // 전역 ValidationPipe 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성 제거
      forbidNonWhitelisted: true, // DTO에 정의되지 않은 속성이 있으면 에러
      transform: true, // 자동 타입 변환
    }),
  );

  // CORS 설정 - 전체 허용
  app.enableCors({
    origin: true, // 모든 origin 허용
    credentials: true, // 쿠키 포함 요청 허용
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
  
  await app.listen(3000);
  console.log('🚀 애플리케이션이 포트 3000에서 실행 중입니다.');
}
bootstrap();
