import * as bcrypt from 'bcrypt';
import { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user-repository.interface';

// A pre-computed bcrypt hash of no real password (cost factor 10, matching RegisterUserUseCase).
// Compared against on every failed lookup so timing doesn't reveal whether the email is registered.
const DUMMY_PASSWORD_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8kJcNPFTBP5oAo9Bqx3vN8kkO5J7bK';

export interface LoginUserInput {
  email: string;
  password: string;
}

export class LoginUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: LoginUserInput): Promise<User> {
    const user = await this.userRepository.findByEmail(input.email);
    const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const passwordMatches = await bcrypt.compare(input.password, passwordHash);

    if (!user || !passwordMatches) {
      throw new Error('Invalid credentials');
    }

    return user;
  }
}
