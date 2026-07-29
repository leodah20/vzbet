import {
  Body,
  ConflictException,
  Controller,
  Inject,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserUseCase } from '../use-cases/register-user.use-case';
import { LoginUserUseCase } from '../use-cases/login-user.use-case';
import { USER_REPOSITORY } from '../domain/user-repository.interface';
import type { UserRepository } from '../domain/user-repository.interface';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterUserDto) {
    const useCase = new RegisterUserUseCase(this.userRepository);
    try {
      const user = await useCase.execute(dto);
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    } catch {
      throw new ConflictException('Email already registered');
    }
  }

  @Post('login')
  async login(@Body() dto: LoginUserDto) {
    const useCase = new LoginUserUseCase(this.userRepository);
    try {
      const user = await useCase.execute(dto);
      const accessToken = await this.jwtService.signAsync({ sub: user.id, role: user.role });
      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
