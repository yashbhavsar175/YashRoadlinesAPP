// Simple test to debug photo storage
jest.mock('../src/data/modules/NetworkHelper', () => ({
  isOnline: jest.fn().mockResolvedValue(false),
  getSyncStatus: jest.fn().mockResolvedValue({ syncing: false, lastSync: null }),
}));

import * as Storage from '../src/data/Storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Photo Storage Debug', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('should save and retrieve a photo', async () => {
    const photoData = {
      delivery_record_id: 'test-record-123',
      photo_type: 'bilty' as const,
      file_path: '/path/to/photo.jpg',
      file_name: 'photo.jpg',
      file_size: 1000,
      mime_type: 'image/jpeg',
    };

    // Save the photo
    const photoId = await Storage.savePhotoRecord(photoData);
    console.log('Saved photo ID:', photoId);

    // Check AsyncStorage directly
    const storedData = await AsyncStorage.getItem('offline_delivery_photos');
    console.log('AsyncStorage data:', storedData);

    // Retrieve the photos
    const retrievedPhotos = await Storage.getDeliveryPhotos(photoData.delivery_record_id);
    console.log('Retrieved photos:', retrievedPhotos);

    expect(retrievedPhotos.length).toBeGreaterThan(0);
    const savedPhoto = retrievedPhotos.find(p => p.id === photoId);
    expect(savedPhoto).toBeDefined();
  });
});
