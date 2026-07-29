export type MatchStatus = 'AGENDADA' | 'FINALIZADA' | 'CANCELADA';

export interface Match {
  id: string;
  championshipId: string;
  homeTeamId: string;
  awayTeamId: string;
  round: number;
  kickoffAt: Date;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
}

export interface ScheduleMatchData {
  championshipId: string;
  homeTeamId: string;
  awayTeamId: string;
  round: number;
  kickoffAt: Date;
}

export interface MatchRepository {
  create(data: ScheduleMatchData): Promise<Match>;
  findAll(): Promise<Match[]>;
  findById(id: string): Promise<Match | null>;
  updateStatus(id: string, status: MatchStatus): Promise<void>;
  registerResult(id: string, homeScore: number, awayScore: number): Promise<void>;
}

export const MATCH_REPOSITORY = Symbol('MATCH_REPOSITORY');
