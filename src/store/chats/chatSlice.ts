import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Message } from '../../domain/models/Message';

export interface Chat {
  id: string;
  projectId: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface ChatsState {
  items: Chat[];
  activeChatId: string | null;
}

const initialState: ChatsState = {
  items: [],
  activeChatId: null,
};

const chatsSlice = createSlice({
  name: 'chats',
  initialState,
  reducers: {
    createChat: (state, action: PayloadAction<Chat>) => {
      state.items.unshift(action.payload);
      state.activeChatId = action.payload.id;
    },
    selectChat: (state, action: PayloadAction<string>) => {
      state.activeChatId = action.payload;
    },
    clearActiveChat: (state) => {
      state.activeChatId = null;
    },
    deleteChat: (state, action: PayloadAction<string>) => {
      if (state.activeChatId === action.payload) return;

      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    addMessage: (
      state,
      action: PayloadAction<{ chatId: string; message: Message }>,
    ) => {
      const chat = state.items.find((item) => item.id === action.payload.chatId);
      if (!chat) return;

      chat.messages.push(action.payload.message);
      chat.updatedAt = action.payload.message.timestamp;
    },
    hydrateChats: (state, action: PayloadAction<ChatsState>) => {
      state.items = action.payload.items || [];
      state.activeChatId = action.payload.activeChatId || null;
    },
  },
});

export const {
  createChat,
  selectChat,
  clearActiveChat,
  deleteChat,
  addMessage,
  hydrateChats,
} = chatsSlice.actions;
export default chatsSlice.reducer;
