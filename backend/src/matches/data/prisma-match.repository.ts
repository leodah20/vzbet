import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Match, MatchRepository, MatchStatus, ScheduleMatchData } from '../domain/match-repository.interface';

@Injectable()
export class PrismaMatchRepository implements MatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: ScheduleMatchData): Promise<Match> {
    return this.prisma.match.create({ data });
  }

  findAll(): Promise<Match[]> {
    return this.prisma.match.findMany({ orderBy: { kickoffAt: 'asc' } });
  }

  findById(id: string): Promise<Match | null> {
    return this.prisma.match.findUnique({ where: { id } });
  }

  async updateStatus(id: string, status: MatchStatus): Promise<void> {
    await this.prisma.match.update({ where: { id }, data: { status } });
  }

  async registerResult(id: string, homeScore: number, awayScore: number): Promise<void> {
    await this.prisma.match.update({ where: { id }, data: { homeScore, awayScore, status: 'FINALIZADA' } });
  }
}
