import { IsString } from 'class-validator';

export class LoginUserDto {
  // Not @IsEmail(): the seeded admin account logs in with a plain, non-email
  // identifier ("admin") for fast local typing. Registration (register-user.dto.ts)
  // still requires a real email — this relaxation only affects login.
  @IsString()
  email: string;

  @IsString()
  password: string;
}
