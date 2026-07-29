import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Championship, ChampionshipRepository, CreateChampionshipData } from '../domain/championship-repository.interface';

@Injectable()
export class PrismaChampionshipRepository implements ChampionshipRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateChampionshipData): Promise<Championship> {
    return this.prisma.championship.create({ data });
  }

  findAll(): Promise<Championship[]> {
    return this.prisma.championship.findMany();
  }

  findById(id: string): Promise<Championship | null> {
    return this.prisma.championship.findUnique({ where: { id } });
  }
}
