export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => Promise<void>;
  hydrateAuth: () => void;
  refreshAccessToken: () => Promise<string | null>;
}
