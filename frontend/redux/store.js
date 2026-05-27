import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slice/authSlice';
import familyTreeReducer from './slice/familyTreeSlice';
import uiReducer from './slice/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    familyTree: familyTreeReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});