export interface AuthenticatedUser {
  id: string;
  username: string;
  email?: string | null;
  roles: string[];
  permissions: string[];
  sessionId?: string;
}
