import { Module } from '@nestjs/common';
import { PlayersController } from './players.controller';
import { PrismaPlayerRepository } from '../data/prisma-player.repository';
import { PLAYER_REPOSITORY } from '../domain/player-repository.interface';
import { TeamsModule } from '../../teams/presentation/teams.module';
import { AuthModule } from '../../auth/presentation/auth.module';

@Module({
  imports: [AuthModule, TeamsModule],
  controllers: [PlayersController],
  providers: [{ provide: PLAYER_REPOSITORY, useClass: PrismaPlayerRepository }],
})
export class PlayersModule {}
