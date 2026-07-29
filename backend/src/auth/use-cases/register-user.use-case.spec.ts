import { RegisterUserUseCase } from './register-user.use-case';
import { UserRepository } from '../domain/user-repository.interface';

describe('RegisterUserUseCase', () => {
  function makeRepository(): jest.Mocked<UserRepository> {
    return {
      create: jest.fn(),
      findByEmail: jest.fn(),
    };
  }

  it('registers a new fan with a hashed password', async () => {
    const repository = makeRepository();
    repository.findByEmail.mockResolvedValue(null);
    repository.create.mockImplementation(async (data) => ({
      id: 'user-1',
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role,
    }));
    const useCase = new RegisterUserUseCase(repository);

    const result = await useCase.execute({ name: 'Joao', email: 'joao@example.com', password: 'segredo123' });

    expect(result.email).toBe('joao@example.com');
    expect(result.role).toBe('TORCEDOR');
    expect(result.passwordHash).not.toBe('segredo123');
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('rejects registration when the email is already taken', async () => {
    const repository = makeRepository();
    repository.findByEmail.mockResolvedValue({
      id: 'existing',
      name: 'Someone',
      email: 'joao@example.com',
      passwordHash: 'hash',
      role: 'TORCEDOR',
    });
    const useCase = new RegisterUserUseCase(repository);

    await expect(
      useCase.execute({ name: 'Joao', email: 'joao@example.com', password: 'segredo123' }),
    ).rejects.toThrow('Email already registered');
    expect(repository.create).not.toHaveBeenCalled();
  });
});
