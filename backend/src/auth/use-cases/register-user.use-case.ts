import * as bcrypt from 'bcrypt';
import { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user-repository.interface';
import { ConflictError } from '../../shared/domain/errors';

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

export class RegisterUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: RegisterUserInput): Promise<User> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    return this.userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'TORCEDOR',
    });
  }
}
