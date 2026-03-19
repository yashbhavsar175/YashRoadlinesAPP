import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@app_theme';

export type ThemeMode = 'light' | 'dark' | 'system';

export const lightColors = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  card: '#FFFFFF',
  primary: '#1a1a1a',
  text: '#1a1a1a',
  textSecondary: '#666666',
  border: '#E0E0E0',
  inputBackground: '#F9F9F9',
  navBackground: '#FFFFFF',
  headerBackground: '#1a1a1a',
  headerText: '#FFFFFF',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  shadow: '#000000',
};

export const darkColors = {
  background: '#121212',
  surface: '#1E1E1E',
  card: '#2C2C2C',
  primary: '#BB86FC',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  border: '#333333',
  inputBackground: '#2C2C2C',
  navBackground: '#1E1E1E',
  headerBackground: '#1E1E1E',
  headerText: '#FFFFFF',
  success: '#4CAF50',
  error: '#CF6679',
  warning: '#FFB74D',
  info: '#64B5F6',
  shadow: '#000000',
};

export type ColorPalette = typeof lightColors;

interface ThemeContextType {
  currentTheme: ThemeMode;
  isDark: boolean;
  colors: ColorPalette;
  setTheme: (theme: ThemeMode) => Promise<void>;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
        setCurrentTheme(savedTheme as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setTheme = async (theme: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_KEY, theme);
      setCurrentTheme(theme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const nextTheme: ThemeMode = currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'system' : 'light';
    setTheme(nextTheme);
  };

  // Determine if dark mode should be active
  const isDark = currentTheme === 'system' 
    ? systemColorScheme === 'dark' 
    : currentTheme === 'dark';

  // Select color palette based on isDark
  const colors = isDark ? darkColors : lightColors;

  const value: ThemeContextType = {
    currentTheme,
    isDark,
    colors,
    setTheme,
    toggleTheme,
  };

  // Don't render children until theme is loaded
  if (isLoading) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
