import { Platform, StatusBar, StyleSheet } from 'react-native';
import { Colors } from './colors';

export const GlobalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background, // Consistent background
    // paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // This will be handled by individual screen app bars/headers now
  },
  card: {
    backgroundColor: Colors.surface, // White background for cards
    borderRadius: 12, // More rounded corners for a modern look
    padding: 20, // Increased padding for content
    margin: 12, // Increased margin between cards
    elevation: 4, // Android shadow, slightly stronger
    shadowColor: Colors.primaryDark, // Deeper shadow for iOS
    shadowOffset: { width: 0, height: 4 }, // More prominent shadow
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  title: {
    fontSize: 28, // Larger title
    fontWeight: 'bold',
    color: Colors.textPrimary, // Darker text for readability on light backgrounds
    marginBottom: 20, // More space below title
    textAlign: 'center', // Centered titles by default for cards
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 16, // More space below subtitle
    textAlign: 'center', // Centered subtitles by default
  },
  bodyText: {
    fontSize: 16,
    color: Colors.textPrimary, // Dark text for readability
    lineHeight: 24,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary, // Dark primary button
    paddingVertical: 14, // Slightly taller buttons
    paddingHorizontal: 28,
    borderRadius: 10, // More rounded button corners
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20, // More space above buttons
    elevation: 3, // Button shadow
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonPrimaryText: {
    color: Colors.surface, // White text on primary button
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderColor: Colors.border,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  buttonSecondaryText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    height: 55, // Taller input fields
    borderColor: Colors.border, // Lighter border color
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16, // More horizontal padding
    marginBottom: 16,
    fontSize: 16, // Larger text in inputs
    color: Colors.textPrimary, // Dark text input
    backgroundColor: Colors.surface, // White background for inputs
  },
  buttonTextOnly: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  linkText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  // Add more global styles as needed
});