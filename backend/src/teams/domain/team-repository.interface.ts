export interface Team {
  id: string;
  name: string;
  region: string;
  foundedYear: number | null;
  logoUrl: string | null;
  description: string | null;
}

export interface CreateTeamData {
  name: string;
  region: string;
  foundedYear?: number;
  logoUrl?: string;
  description?: string;
}

export interface TeamRepository {
  create(data: CreateTeamData): Promise<Team>;
  findAll(): Promise<Team[]>;
  findById(id: string): Promise<Team | null>;
}

export const TEAM_REPOSITORY = Symbol('TEAM_REPOSITORY');
