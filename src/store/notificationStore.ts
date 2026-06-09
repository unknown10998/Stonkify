import { create } from 'zustand';

export interface TradeNotif {
  id: string;
  text: string;
  sub?: string;
  type: 'buy' | 'sell' | 'short' | 'cover' | 'win' | 'loss' | 'event' | 'achievement';
}

interface NotificationStore {
  items: TradeNotif[];
  push: (text: string, type: TradeNotif['type'], sub?: string, duration?: number) => void;
  dismiss: (id: string) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  items: [],
  push: (text, type, sub, duration = 2800) => {
    const id = `n_${Date.now()}_${Math.random()}`;
    set(s => ({ items: [...s.items.slice(-5), { id, text, type, sub }] }));
    setTimeout(() => {
      set(s => ({ items: s.items.filter(n => n.id !== id) }));
    }, duration);
  },
  dismiss: (id) => set(s => ({ items: s.items.filter(n => n.id !== id) })),
}));
