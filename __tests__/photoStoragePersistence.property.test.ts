/**
 * Property-Based Tests for Photo Storage Persistence
 * Feature: mumbai-delivery-redesign
 * 
 * Property 11: Photo Storage Persistence
 * Validates: Requirements 4.5
 * 
 * For any photo successfully captured and associated with a delivery record, 
 * the photo should be stored in local storage and retrievable by its photo_id.
 * 
 * Note: These tests verify photo storage and retrieval by mocking the storage layer
 * to capture what data is being saved and ensuring it can be retrieved.
 */

// Mock isOnline to return false so tests use AsyncStorage
jest.mock('../src/data/modules/NetworkHelper', () => ({
  isOnline: jest.fn().mockResolvedValue(false),
  getSyncStatus: jest.fn().mockResolvedValue({ syncing: false, lastSync: null }),
}));

import * as fc from 'fast-check';
import * as Storage from '../src/data/Storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock console.error to avoid cluttering test output
let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('Property 11: Photo Storage Persistence', () => {
  /**
   * **Validates: Requirements 4.5**
   * 
   * This property verifies that any photo successfully captured and associated with
   * a delivery record is stored in local storage and can be retrieved by its photo_id.
   */

  // Arbitrary for generating valid photo data
  const validStringArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
  const validFileNameArb = fc.string({ minLength: 5, maxLength: 50 }).map(s => `${s.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`);
  const validFileSizeArb = fc.integer({ min: 1000, max: 5000000 }); // 1KB to 5MB
  const validMimeTypeArb = fc.constantFrom('image/jpeg', 'image/png', 'image/jpg');
  const validPhotoTypeArb = fc.constantFrom('bilty', 'signature');
  
  // Arbitrary for generating a valid photo record
  const validPhotoRecordArb = fc.record({
    delivery_record_id: fc.uuid(),
    photo_type: validPhotoTypeArb,
    file_path: validStringArb.map(s => `/path/to/photos/${s}`),
    file_name: validFileNameArb,
    file_size: validFileSizeArb,
    mime_type: validMimeTypeArb,
  });

  test('Property 11.1: Saved photo should be retrievable by its photo_id', async () => {
    await fc.assert(
      fc.asyncProperty(
        validPhotoRecordArb,
        async (photoData) => {
          // Clear AsyncStorage before each test
          await AsyncStorage.clear();
          
          // Act - Save the photo
          const photoId = await Storage.savePhotoRecord(photoData);

          // Assert - Photo ID should be returned
          expect(photoId).toBeDefined();
          expect(typeof photoId).toBe('string');
          expect(photoId.length).toBeGreaterThan(0);
          
          // Debug: Check what's in AsyncStorage
          const storedData = await AsyncStorage.getItem('offline_delivery_photos');
          if (!storedData) {
            throw new Error('No data in AsyncStorage after save');
          }
          const parsedData = JSON.parse(storedData);
          if (!Array.isArray(parsedData) || parsedData.length === 0) {
            throw new Error(`AsyncStorage data is not an array or is empty: ${JSON.stringify(parsedData)}`);
          }
          
          // Act - Retrieve the photos for this delivery record
          const retrievedPhotos = await Storage.getDeliveryPhotos(photoData.delivery_record_id);
          
          // Assert - Photo should be retrievable
          expect(retrievedPhotos).toBeDefined();
          expect(Array.isArray(retrievedPhotos)).toBe(true);
          expect(retrievedPhotos.length).toBeGreaterThan(0);
          
          // Find the saved photo in the retrieved photos
          const savedPhoto = retrievedPhotos.find(p => p.id === photoId);
          expect(savedPhoto).toBeDefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 11.2: Retrieved photo should have all original data fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        validPhotoRecordArb,
        async (photoData) => {
          // Clear AsyncStorage before each test
          await AsyncStorage.clear();
          
          // Act - Save the photo
          const photoId = await Storage.savePhotoRecord(photoData);
          
          // Act - Retrieve the photos
          const retrievedPhotos = await Storage.getDeliveryPhotos(photoData.delivery_record_id);
          const savedPhoto = retrievedPhotos.find(p => p.id === photoId);
          
          // Assert - All original data should be preserved
          expect(savedPhoto).toBeDefined();
          expect(savedPhoto!.delivery_record_id).toBe(photoData.delivery_record_id);
          expect(savedPhoto!.photo_type).toBe(photoData.photo_type);
          expect(savedPhoto!.file_path).toBe(photoData.file_path);
          expect(savedPhoto!.file_name).toBe(photoData.file_name);
          expect(savedPhoto!.file_size).toBe(photoData.file_size);
          expect(savedPhoto!.mime_type).toBe(photoData.mime_type);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 11.3: Multiple photos for same delivery record should all be retrievable', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(validPhotoRecordArb, { minLength: 2, maxLength: 5 }),
        async (deliveryRecordId, photoDataArray) => {
          // Clear AsyncStorage before each test
          await AsyncStorage.clear();
          
          // Ensure all photos have the same delivery_record_id
          const photosForSameRecord = photoDataArray.map(photo => ({
            ...photo,
            delivery_record_id: deliveryRecordId,
          }));
          
          // Act - Save all photos
          const photoIds: string[] = [];
          for (const photoData of photosForSameRecord) {
            const photoId = await Storage.savePhotoRecord(photoData);
            photoIds.push(photoId);
          }
          
          // Act - Retrieve all photos for this delivery record
          const retrievedPhotos = await Storage.getDeliveryPhotos(deliveryRecordId);
          
          // Assert - All saved photos should be retrievable
          expect(retrievedPhotos.length).toBeGreaterThanOrEqual(photosForSameRecord.length);
          
          for (const photoId of photoIds) {
            const foundPhoto = retrievedPhotos.find(p => p.id === photoId);
            expect(foundPhoto).toBeDefined();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 11.4: Photo retrieval should filter by delivery_record_id correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        validPhotoRecordArb,
        validPhotoRecordArb,
        async (recordId1, recordId2, photoData1, photoData2) => {
          // Ensure the two record IDs are different
          fc.pre(recordId1 !== recordId2);
          
          // Clear AsyncStorage before each test
          await AsyncStorage.clear();
          
          // Act - Save photos for two different delivery records
          const photo1 = { ...photoData1, delivery_record_id: recordId1 };
          const photo2 = { ...photoData2, delivery_record_id: recordId2 };
          
          const photoId1 = await Storage.savePhotoRecord(photo1);
          const photoId2 = await Storage.savePhotoRecord(photo2);
          
          // Act - Retrieve photos for first record
          const retrievedPhotos1 = await Storage.getDeliveryPhotos(recordId1);
          
          // Assert - Should only get photos for first record
          const foundPhoto1 = retrievedPhotos1.find(p => p.id === photoId1);
          const foundPhoto2 = retrievedPhotos1.find(p => p.id === photoId2);
          
          expect(foundPhoto1).toBeDefined();
          expect(foundPhoto1!.delivery_record_id).toBe(recordId1);
          
          // Photo from second record should not be in results
          if (foundPhoto2) {
            expect(foundPhoto2.delivery_record_id).toBe(recordId1);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 11.5: Photo should have required metadata fields after storage', async () => {
    await fc.assert(
      fc.asyncProperty(
        validPhotoRecordArb,
        async (photoData) => {
          // Clear AsyncStorage before each test
          await AsyncStorage.clear();
          
          // Act - Save the photo
          const photoId = await Storage.savePhotoRecord(photoData);
          
          // Act - Retrieve the photos
          const retrievedPhotos = await Storage.getDeliveryPhotos(photoData.delivery_record_id);
          const savedPhoto = retrievedPhotos.find(p => p.id === photoId);
          
          // Assert - Required metadata fields should be present
          expect(savedPhoto).toBeDefined();
          expect(savedPhoto!.id).toBeDefined();
          expect(savedPhoto!.created_at).toBeDefined();
          expect(savedPhoto!.updated_at).toBeDefined();
          expect(typeof savedPhoto!.uploaded).toBe('boolean');
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 11.6: Photo type (bilty/signature) should be preserved in storage', async () => {
    await fc.assert(
      fc.asyncProperty(
        validPhotoRecordArb,
        async (photoData) => {
          // Clear AsyncStorage before each test
          await AsyncStorage.clear();
          
          // Act - Save the photo
          const photoId = await Storage.savePhotoRecord(photoData);
          
          // Act - Retrieve the photos
          const retrievedPhotos = await Storage.getDeliveryPhotos(photoData.delivery_record_id);
          const savedPhoto = retrievedPhotos.find(p => p.id === photoId);
          
          // Assert - Photo type should be preserved
          expect(savedPhoto).toBeDefined();
          expect(savedPhoto!.photo_type).toBe(photoData.photo_type);
          expect(['bilty', 'signature']).toContain(savedPhoto!.photo_type);
        }
      ),
      { numRuns: 20 }
    );
  });
});

