import React from 'react';
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../components/Theme/useTheme';
import { toggleTheme } from '../../redux/slice/uiSlice';

export default function ThemeToggle() {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const { theme: currentTheme } = useSelector((state) => state.ui);
  
  return (
    <TouchableOpacity onPress={() => dispatch(toggleTheme())}>
      <Icon
        name={currentTheme === 'light' ? 'dark-mode' : 'light-mode'}
        size={24}
        color={theme.colors.textPrimary}
      />
    </TouchableOpacity>
  );
}