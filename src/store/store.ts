import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore } from '@reduxjs/toolkit';
import chatsReducer, { hydrateChats } from './chats/chatSlice';
import projectsReducer, { hydrateProjects } from './projects/projectSlice';

const STORAGE_KEY = '@vinxo/projects-and-chats';

export const store = configureStore({
  reducer: {
    chats: chatsReducer,
    projects: projectsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

let hasHydrated = false;

store.subscribe(() => {
  if (!hasHydrated) return;

  const state = store.getState();
  AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ chats: state.chats, projects: state.projects }),
  ).catch((error) => console.warn('[Store] persistence failed', error));
});

export const hydrateStore = async () => {
  try {
    const persistedValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (persistedValue) {
      const persistedState = JSON.parse(persistedValue) as {
        chats?: RootState['chats'];
        projects?: RootState['projects'];
      };

      if (persistedState.chats) store.dispatch(hydrateChats(persistedState.chats));
      if (persistedState.projects) {
        store.dispatch(hydrateProjects(persistedState.projects.items));
      }
    }
  } catch (error) {
    console.warn('[Store] hydration failed', error);
  } finally {
    hasHydrated = true;
  }
};
