export type Role = 'ADMIN' | 'TORCEDOR';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
}
