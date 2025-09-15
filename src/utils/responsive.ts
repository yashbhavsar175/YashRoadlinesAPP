// responsive.ts - Utility for responsive design
import { Dimensions, PixelRatio } from 'react-native';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

// Base dimensions (iPhone X as reference)
const baseWidth = 375;
const baseHeight = 812;

// Responsive font size function
export const responsiveFontSize = (size: number): number => {
  const scale = Math.min(width / baseWidth, 1.2); // Cap the scale to prevent oversized fonts
  const newSize = size * scale;
  return Math.max(10, PixelRatio.roundToNearestPixel(newSize));
};

// Responsive width function
export const responsiveWidth = (size: number): number => {
  const scale = width / baseWidth;
  return PixelRatio.roundToNearestPixel(size * scale);
};

// Responsive height function
export const responsiveHeight = (size: number): number => {
  const scale = height / baseHeight;
  return PixelRatio.roundToNearestPixel(size * scale);
};

// Get screen info
export const getScreenInfo = () => ({
  width,
  height,
  isSmallScreen: width < 350,
  isMediumScreen: width >= 350 && width < 400,
  isLargeScreen: width >= 400,
});

// Responsive padding/margin
export const responsiveSpacing = (size: number): number => {
  const scale = width / baseWidth;
  return Math.max(4, PixelRatio.roundToNearestPixel(size * scale));
};