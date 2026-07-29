import { IsInt, IsString, Min } from 'class-validator';

export class SubmitPredictionDto {
  @IsString()
  matchId: string;

  @IsInt()
  @Min(0)
  predictedHome: number;

  @IsInt()
  @Min(0)
  predictedAway: number;
}
