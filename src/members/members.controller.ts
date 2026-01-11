import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CalculateStrengthLevelDto } from './dto/calculate-strength-level.dto';
import { CalculateMeasurementsDto } from './dto/calculate-measurements.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('members')
@UseGuards(JwtAuthGuard) // 모든 엔드포인트에 JWT Guard 적용
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  /**
   * 회원 생성
   * 쿠키에서 gym_id를 읽어서 사용
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: Request, @Body() createMemberDto: CreateMemberDto) {
    // 쿠키에서 gym_id 읽기 (없으면 토큰에서 sub 사용)
    const gymId = this.getGymId(req);
    return this.membersService.create(gymId, createMemberDto);
  }

  /**
   * 회원 목록 조회
   * @param name - 회원 이름 (선택사항, 이름으로 검색)
   */
  @Get()
  findAll(@Req() req: Request, @Query('name') name?: string) {
    const gymId = this.getGymId(req);
    return this.membersService.findAll(gymId, name);
  }

  /**
   * 특정 헬스장의 회원 상세 조회
   */
  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    const gymId = this.getGymId(req);
    return this.membersService.findOne(gymId, +id);
  }

  /**
   * 특정 헬스장의 회원 정보 수정
   */
  @Patch(':id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateMemberDto: UpdateMemberDto,
  ) {
    const gymId = this.getGymId(req);
    return this.membersService.update(gymId, +id, updateMemberDto);
  }

  /**
   * 특정 헬스장의 회원 삭제
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Req() req: Request, @Param('id') id: string) {
    const gymId = this.getGymId(req);
    return this.membersService.remove(gymId, +id);
  }

  /**
   * 근력 등급 계산
   */
  @Post('calculate-strength-level')
  @HttpCode(HttpStatus.OK)
  calculateStrengthLevel(@Body() dto: CalculateStrengthLevelDto) {
    return this.membersService.calculateStrengthLevel(
      dto.gender,
      dto.age,
      dto.bodyWeight,
      dto.measuredWeight,
      dto.categoryId,
    );
  }

  /**
   * 체력 측정 결과 처리 및 등급 계산
   */
  @Post('calculate-measurements')
  @HttpCode(HttpStatus.OK)
  calculateMeasurements(@Req() req: Request, @Body() dto: CalculateMeasurementsDto) {
    const gymId = this.getGymId(req);
    return this.membersService.calculateAndSaveMeasurements(gymId, dto);
  }

  /**
   * 저장된 측정 결과 조회 - 최신 결과
   */
  @Get(':id/measurements/latest')
  @HttpCode(HttpStatus.OK)
  getLatestMeasurements(@Req() req: Request, @Param('id') id: string) {
    const gymId = this.getGymId(req);
    return this.membersService.getMeasurements(gymId, +id);
  }

  /**
   * 저장된 측정 결과 조회 - 특정 날짜 또는 전체 이력
   */
  @Get(':id/measurements')
  @HttpCode(HttpStatus.OK)
  getMeasurements(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('date') date?: string,
  ) {
    const gymId = this.getGymId(req);
    return this.membersService.getMeasurements(gymId, +id, date);
  }

  /**
   * 쿠키 또는 토큰에서 gym_id 추출
   */
  private getGymId(req: Request): number {
    // 1. 쿠키에서 gym_id 읽기
    const cookieGymId = req.cookies?.gym_id;
    if (cookieGymId) {
      return parseInt(cookieGymId);
    }

    // 2. 토큰에서 sub (gym.id) 읽기
    const user = req['user'];
    if (user && user.sub) {
      return user.sub;
    }

    throw new Error('gym_id를 찾을 수 없습니다. 로그인이 필요합니다.');
  }
}
