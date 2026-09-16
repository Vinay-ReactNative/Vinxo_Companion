import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Project {
  id: string;
  name: string;
  chatIds: string[];
  createdAt: string;
}

interface ProjectsState {
  items: Project[];
}

const initialState: ProjectsState = {
  items: [
    {
      id: 'project-personal',
      name: 'Personal',
      chatIds: [],
      createdAt: new Date().toISOString(),
    },
  ],
};

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    createProject: (state, action: PayloadAction<Project>) => {
      state.items.push(action.payload);
    },
    addChatToProject: (
      state,
      action: PayloadAction<{ projectId: string; chatId: string }>,
    ) => {
      const project = state.items.find((item) => item.id === action.payload.projectId);
      if (project && !project.chatIds.includes(action.payload.chatId)) {
        project.chatIds.unshift(action.payload.chatId);
      }
    },
    removeChatFromProject: (
      state,
      action: PayloadAction<{ projectId: string; chatId: string }>,
    ) => {
      const project = state.items.find((item) => item.id === action.payload.projectId);
      if (project) {
        project.chatIds = project.chatIds.filter((chatId) => chatId !== action.payload.chatId);
      }
    },
    hydrateProjects: (state, action: PayloadAction<Project[]>) => {
      state.items = action.payload.length ? action.payload : initialState.items;
    },
  },
});

export const {
  createProject,
  addChatToProject,
  removeChatFromProject,
  hydrateProjects,
} = projectsSlice.actions;
export default projectsSlice.reducer;
