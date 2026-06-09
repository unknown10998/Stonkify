import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  username: string;
  password: string;
  createdAt: string;
}

interface AuthStore {
  users:       Record<string, User>;
  currentUser: string | null;
  login:       (username: string, password: string) => string | null;
  signup:      (username: string, password: string) => string | null;
  logout:      () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      users:       {},
      currentUser: null,

      login: (username, password) => {
        const u = username.trim().toLowerCase();
        const existing = get().users[u];
        if (!existing)           return 'No account found. Sign up first.';
        if (existing.password !== password) return 'Incorrect password.';
        set({ currentUser: u });
        return null;
      },

      signup: (username, password) => {
        const u = username.trim().toLowerCase();
        if (u.length < 3)          return 'Username must be at least 3 characters.';
        if (password.length < 4)   return 'Password must be at least 4 characters.';
        if (get().users[u])        return 'Username already taken.';
        set(s => ({
          users: { ...s.users, [u]: { username: u, password, createdAt: new Date().toISOString() } },
          currentUser: u,
        }));
        return null;
      },

      logout: () => set({ currentUser: null }),
    }),
    { name: 'stonkify-auth' }
  )
);
