import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const isWeb = Platform.OS === 'web';
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isMobile = !isWeb;

export const getDeviceType = () => {
  if (width < 768) return 'mobile';
  if (width >= 768 && width < 1024) return 'tablet';
  return 'desktop';
};

export const responsiveWidth = (percentage) => {
  return (width * percentage) / 100;
};

export const responsiveHeight = (percentage) => {
  return (height * percentage) / 100;
};

export const responsiveFontSize = (size) => {
  const scale = width / 375; // 375 is base iPhone SE width
  return size * scale;
};