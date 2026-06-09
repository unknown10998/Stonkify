import { create } from 'zustand';

export interface ChatMsg {
  id: string;
  role: 'ai' | 'user';
  text: string;
}

interface ChatStore {
  open: boolean;
  messages: ChatMsg[];
  openChat: () => void;
  closeChat: () => void;
  addMessage: (msg: ChatMsg) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  open: false,
  messages: [],
  openChat:   () => set({ open: true }),
  closeChat:  () => set({ open: false }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
}));
