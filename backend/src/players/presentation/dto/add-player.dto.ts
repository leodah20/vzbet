import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class AddPlayerDto {
  @IsString()
  name: string;

  @IsString()
  position: string;

  @IsInt()
  @Min(1)
  number: number;

  @IsOptional()
  @IsUrl()
  photoUrl?: string;
}
