module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-url-polyfill|@supabase|@react-native-async-storage|react-native-vector-icons|react-native-config)/)',
  ],
  setupFiles: ['<rootDir>/__tests__/setup.js'],
  testTimeout: 30000,
};
