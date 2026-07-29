import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Match, MatchFilter, MatchRepository, MatchStatus, ScheduleMatchData } from '../domain/match-repository.interface';

@Injectable()
export class PrismaMatchRepository implements MatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: ScheduleMatchData): Promise<Match> {
    return this.prisma.match.create({ data });
  }

  findAll(filter?: MatchFilter): Promise<Match[]> {
    return this.prisma.match.findMany({
      where: {
        ...(filter?.championshipId ? { championshipId: filter.championshipId } : {}),
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.teamId ? { OR: [{ homeTeamId: filter.teamId }, { awayTeamId: filter.teamId }] } : {}),
      },
      orderBy: { kickoffAt: 'asc' },
    });
  }

  findById(id: string): Promise<Match | null> {
    return this.prisma.match.findUnique({ where: { id } });
  }

  async updateStatus(id: string, status: MatchStatus): Promise<void> {
    await this.prisma.match.update({ where: { id }, data: { status } });
  }
}
