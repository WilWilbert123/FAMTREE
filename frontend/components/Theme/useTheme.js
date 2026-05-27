import { createContext, useContext } from 'react';

export const ThemeContext = createContext({
  theme: null,
  isDark: false,
});

// Keep this named export
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

 