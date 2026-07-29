import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  name: string;

  @IsString()
  region: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  foundedYear?: number;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
