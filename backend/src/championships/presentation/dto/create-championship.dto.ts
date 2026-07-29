import { IsDateString, IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateChampionshipDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  season: string;

  @IsIn(['PONTOS_CORRIDOS', 'MATA_MATA'])
  format: 'PONTOS_CORRIDOS' | 'MATA_MATA';

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
