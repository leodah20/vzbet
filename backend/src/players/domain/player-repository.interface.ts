export interface Player {
  id: string;
  name: string;
  position: string;
  number: number;
  photoUrl: string | null;
  teamId: string;
}

export interface CreatePlayerData {
  name: string;
  position: string;
  number: number;
  photoUrl?: string;
  teamId: string;
}

export interface PlayerRepository {
  create(data: CreatePlayerData): Promise<Player>;
  findByTeamId(teamId: string): Promise<Player[]>;
}

export const PLAYER_REPOSITORY = Symbol('PLAYER_REPOSITORY');
