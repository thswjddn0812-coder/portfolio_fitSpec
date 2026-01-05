import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRefreshTokenDto } from './dto/create-refresh_token.dto';
import { UpdateRefreshTokenDto } from './dto/update-refresh_token.dto';
import { RefreshTokens } from './entities/refresh_token.entity';

@Injectable()
export class RefreshTokensService {
  constructor(
    @InjectRepository(RefreshTokens)
    private refreshTokensRepository: Repository<RefreshTokens>,
  ) {}

  create(createRefreshTokenDto: CreateRefreshTokenDto) {
    const refreshToken = this.refreshTokensRepository.create(createRefreshTokenDto);
    return this.refreshTokensRepository.save(refreshToken);
  }

  findAll() {
    return this.refreshTokensRepository.find();
  }

  findOne(id: number) {
    return this.refreshTokensRepository.findOne({ where: { id } });
  }

  async update(id: number, updateRefreshTokenDto: UpdateRefreshTokenDto) {
    await this.refreshTokensRepository.update(id, updateRefreshTokenDto);
    return this.findOne(id);
  }

  remove(id: number) {
    return this.refreshTokensRepository.delete(id);
  }
}
