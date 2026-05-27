import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Appearance, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setTheme } from '../../redux/slice/uiSlice';
import { darkTheme, lightTheme } from '../../utils/theme';
import { ThemeContext } from './useTheme';

export default function ThemeProvider({ children }) {
  const dispatch = useDispatch();
  const { theme: currentTheme } = useSelector((state) => state.ui);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        dispatch(setTheme(savedTheme));
      } else {
        const systemTheme = Appearance.getColorScheme();
        dispatch(setTheme(systemTheme || 'light'));
      }
    } catch (error) {
      console.log('Error loading theme:', error);
      dispatch(setTheme('light'));
    } finally {
      setIsReady(true);
    }
  };

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  const theme = currentTheme === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark: currentTheme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}