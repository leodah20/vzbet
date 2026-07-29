import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeamData, Team, TeamRepository } from '../domain/team-repository.interface';

@Injectable()
export class PrismaTeamRepository implements TeamRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateTeamData): Promise<Team> {
    return this.prisma.team.create({ data });
  }

  findAll(): Promise<Team[]> {
    return this.prisma.team.findMany();
  }

  findById(id: string): Promise<Team | null> {
    return this.prisma.team.findUnique({ where: { id } });
  }
}
