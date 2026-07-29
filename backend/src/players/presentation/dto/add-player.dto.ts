import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class AddPlayerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  position: string;

  @IsInt()
  @Min(1)
  number: number;

  @IsOptional()
  @IsUrl()
  photoUrl?: string;
}
