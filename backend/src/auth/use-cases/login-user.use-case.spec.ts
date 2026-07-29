import * as bcrypt from 'bcrypt';
import { LoginUserUseCase } from './login-user.use-case';
import { UserRepository } from '../domain/user-repository.interface';

describe('LoginUserUseCase', () => {
  function makeRepository(): jest.Mocked<UserRepository> {
    return {
      create: jest.fn(),
      findByEmail: jest.fn(),
    };
  }

  it('returns the user when the password matches', async () => {
    const passwordHash = await bcrypt.hash('segredo123', 10);
    const repository = makeRepository();
    repository.findByEmail.mockResolvedValue({
      id: 'user-1',
      name: 'Joao',
      email: 'joao@example.com',
      passwordHash,
      role: 'TORCEDOR',
    });
    const useCase = new LoginUserUseCase(repository);

    const result = await useCase.execute({ email: 'joao@example.com', password: 'segredo123' });

    expect(result.id).toBe('user-1');
  });

  it('rejects when the user does not exist', async () => {
    const repository = makeRepository();
    repository.findByEmail.mockResolvedValue(null);
    const useCase = new LoginUserUseCase(repository);

    await expect(useCase.execute({ email: 'ghost@example.com', password: 'x' })).rejects.toThrow(
      'Invalid credentials',
    );
  });

  it('rejects when the password is wrong', async () => {
    const passwordHash = await bcrypt.hash('segredo123', 10);
    const repository = makeRepository();
    repository.findByEmail.mockResolvedValue({
      id: 'user-1',
      name: 'Joao',
      email: 'joao@example.com',
      passwordHash,
      role: 'TORCEDOR',
    });
    const useCase = new LoginUserUseCase(repository);

    await expect(useCase.execute({ email: 'joao@example.com', password: 'wrong' })).rejects.toThrow(
      'Invalid credentials',
    );
  });
});
