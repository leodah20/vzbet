import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlayerData, Player, PlayerRepository } from '../domain/player-repository.interface';

@Injectable()
export class PrismaPlayerRepository implements PlayerRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreatePlayerData): Promise<Player> {
    return this.prisma.player.create({ data });
  }

  findByTeamId(teamId: string): Promise<Player[]> {
    return this.prisma.player.findMany({ where: { teamId } });
  }
}
