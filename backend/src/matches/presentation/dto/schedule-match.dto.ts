import { IsDateString, IsInt, IsString, Min } from 'class-validator';

export class ScheduleMatchDto {
  @IsString()
  championshipId: string;

  @IsString()
  homeTeamId: string;

  @IsString()
  awayTeamId: string;

  @IsInt()
  @Min(1)
  round: number;

  @IsDateString()
  kickoffAt: string;
}
