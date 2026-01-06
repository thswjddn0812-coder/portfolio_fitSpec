import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  /**
   * 회원 생성
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createMemberDto: CreateMemberDto) {
    return this.membersService.create(createMemberDto);
  }

  /**
   * 회원 목록 조회
   * @param gymId - 헬스장 ID (선택사항, 없으면 전체 조회)
   */
  @Get()
  findAll(@Query('gymId') gymId?: string) {
    const gymIdNum = gymId ? parseInt(gymId) : undefined;
    return this.membersService.findAll(gymIdNum);
  }

  /**
   * 회원 상세 조회
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.membersService.findOne(+id);
  }

  /**
   * 회원 정보 수정
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMemberDto: UpdateMemberDto) {
    return this.membersService.update(+id, updateMemberDto);
  }

  /**
   * 회원 삭제
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.membersService.remove(+id);
  }
}
