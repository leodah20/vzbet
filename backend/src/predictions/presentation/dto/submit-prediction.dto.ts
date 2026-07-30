import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum PredictedOutcomeInput {
  CASA = 'CASA',
  EMPATE = 'EMPATE',
  FORA = 'FORA',
}

export class SubmitPredictionDto {
  @IsString()
  matchId: string;

  @IsEnum(PredictedOutcomeInput)
  predictedOutcome: PredictedOutcomeInput;

  @IsOptional()
  @IsInt()
  @Min(0)
  predictedHome?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  predictedAway?: number;
}
