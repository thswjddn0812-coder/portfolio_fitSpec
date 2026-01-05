import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  statusCode: number;
  message?: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    const statusCode = context.switchToHttp().getResponse().statusCode;

    return next.handle().pipe(
      map((data) => {
        // 이미 에러 응답 형식이면 그대로 반환
        if (data && typeof data === 'object' && 'statusCode' in data) {
          return data;
        }

        // 성공 응답 형식으로 변환
        return {
          statusCode,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
