import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { Members } from './entities/member.entity';
import { Gyms } from '../gyms/entities/gym.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Members, Gyms])],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
