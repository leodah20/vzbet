import { IsDateString, IsIn, IsString } from 'class-validator';

export class CreateChampionshipDto {
  @IsString()
  name: string;

  @IsString()
  season: string;

  @IsIn(['PONTOS_CORRIDOS', 'MATA_MATA'])
  format: 'PONTOS_CORRIDOS' | 'MATA_MATA';

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
