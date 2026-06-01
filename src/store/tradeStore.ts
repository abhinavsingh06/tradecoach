import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ChatMessage } from '../types';

interface TradeState {
  messages: ChatMessage[];
  hydrated: boolean;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'createdAt'>) => ChatMessage;
  clearMessages: () => void;
}

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const useTradeStore = create<TradeState>()(
  persist(
    (set) => ({
      messages: [],
      hydrated: false,

      addMessage: (input) => {
        const msg: ChatMessage = {
          ...input,
          id: generateId(),
          createdAt: Date.now(),
        };
        set((s) => ({ messages: [...s.messages, msg] }));
        return msg;
      },

      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'tradecoach-chat-v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ messages: s.messages }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);
