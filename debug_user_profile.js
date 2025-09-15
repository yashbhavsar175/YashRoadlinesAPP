// Add this code to any screen to debug user profile
import AsyncStorage from '@react-native-async-storage/async-storage';

// Call this function after login to check if user profile is saved
const debugUserProfile = async () => {
  console.log('🔍 === USER PROFILE DEBUG ===');
  
  try {
    // Check if user profile exists in AsyncStorage
    const userProfile = await AsyncStorage.getItem('user_profile');
    
    if (userProfile) {
      const parsed = JSON.parse(userProfile);
      console.log('✅ User profile found:', parsed);
      console.log('📧 Email:', parsed.email);
      console.log('👤 Name:', parsed.name);
      console.log('🔑 User Type:', parsed.user_type);
    } else {
      console.log('❌ No user profile found in AsyncStorage');
      console.log('🔧 This means notifications won\'t work');
    }
  } catch (error) {
    console.log('❌ Error reading user profile:', error);
  }
  
  console.log('🔍 === DEBUG END ===');
};

// Call this: debugUserProfile();