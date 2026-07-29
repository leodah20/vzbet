export type ChampionshipFormat = 'PONTOS_CORRIDOS' | 'MATA_MATA';

export interface Championship {
  id: string;
  name: string;
  season: string;
  format: ChampionshipFormat;
  startDate: Date;
  endDate: Date;
}

export interface CreateChampionshipData {
  name: string;
  season: string;
  format: ChampionshipFormat;
  startDate: Date;
  endDate: Date;
}

export interface ChampionshipRepository {
  create(data: CreateChampionshipData): Promise<Championship>;
  findAll(): Promise<Championship[]>;
  findById(id: string): Promise<Championship | null>;
}

export const CHAMPIONSHIP_REPOSITORY = Symbol('CHAMPIONSHIP_REPOSITORY');
