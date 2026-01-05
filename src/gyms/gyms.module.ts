import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GymsService } from './gyms.service';
import { GymsController } from './gyms.controller';
import { Gyms } from './entities/gym.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Gyms])],
  controllers: [GymsController],
  providers: [GymsService],
  exports: [GymsService],
})
export class GymsModule {}
