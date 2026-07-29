import * as bcrypt from 'bcrypt';
import { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user-repository.interface';

export interface LoginUserInput {
  email: string;
  password: string;
}

export class LoginUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: LoginUserInput): Promise<User> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new Error('Invalid credentials');
    }

    return user;
  }
}
