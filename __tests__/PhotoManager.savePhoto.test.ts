/**
 * Unit tests for PhotoManager.savePhoto method
 * Tests photo storage functionality including directory creation,
 * file copying, and metadata persistence
 */

import { PhotoManager } from '../src/services/PhotoManager';
import { PhotoData } from '../src/data/Storage';

// Mock dependencies
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/documents',
  exists: jest.fn(),
  mkdir: jest.fn(),
  copyFile: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('PhotoManager.savePhoto', () => {
  const mockRecordId = 'test-record-123';
  const mockPhotoData: PhotoData = {
    uri: 'file:///tmp/photo.jpg',
    fileName: 'photo.jpg',
    fileSize: 12345,
    mimeType: 'image/jpeg',
    timestamp: '2024-01-15T12:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (RNFS.exists as jest.Mock).mockResolvedValue(false);
    (RNFS.mkdir as jest.Mock).mockResolvedValue(undefined);
    (RNFS.copyFile as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('should create directory if it does not exist', async () => {
    await PhotoManager.savePhoto(mockPhotoData, mockRecordId, 'bilty');

    expect(RNFS.exists).toHaveBeenCalledWith(
      '/mock/documents/delivery_photos/test-record-123'
    );
    expect(RNFS.mkdir).toHaveBeenCalledWith(
      '/mock/documents/delivery_photos/test-record-123',
      { NSURLIsExcludedFromBackupKey: true }
    );
  });

  it('should not create directory if it already exists', async () => {
    (RNFS.exists as jest.Mock).mockResolvedValue(true);

    await PhotoManager.savePhoto(mockPhotoData, mockRecordId, 'bilty');

    expect(RNFS.exists).toHaveBeenCalled();
    expect(RNFS.mkdir).not.toHaveBeenCalled();
  });

  it('should copy photo file to correct location with timestamp', async () => {
    const mockTimestamp = 1705320000000;
    jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

    await PhotoManager.savePhoto(mockPhotoData, mockRecordId, 'bilty');

    expect(RNFS.copyFile).toHaveBeenCalledWith(
      'file:///tmp/photo.jpg',
      `/mock/documents/delivery_photos/test-record-123/bilty_${mockTimestamp}.jpg`
    );

    jest.restoreAllMocks();
  });

  it('should use correct file extension for PNG images', async () => {
    const pngPhoto: PhotoData = {
      ...mockPhotoData,
      mimeType: 'image/png',
    };
    const mockTimestamp = 1705320000000;
    jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

    await PhotoManager.savePhoto(pngPhoto, mockRecordId, 'signature');

    expect(RNFS.copyFile).toHaveBeenCalledWith(
      'file:///tmp/photo.jpg',
      `/mock/documents/delivery_photos/test-record-123/signature_${mockTimestamp}.png`
    );

    jest.restoreAllMocks();
  });

  it('should save metadata to AsyncStorage', async () => {
    const mockTimestamp = 1705320000000;
    jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

    await PhotoManager.savePhoto(mockPhotoData, mockRecordId, 'bilty');

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'delivery_photo_metadata',
      expect.stringContaining(mockRecordId)
    );

    const savedData = JSON.parse(
      (AsyncStorage.setItem as jest.Mock).mock.calls[0][1]
    );
    const photoId = Object.keys(savedData)[0];
    
    expect(savedData[photoId]).toMatchObject({
      recordId: mockRecordId,
      photoType: 'bilty',
      fileName: `bilty_${mockTimestamp}.jpg`,
      fileSize: 12345,
      mimeType: 'image/jpeg',
      timestamp: '2024-01-15T12:00:00.000Z',
    });

    jest.restoreAllMocks();
  });

  it('should return unique photo ID', async () => {
    const photoId = await PhotoManager.savePhoto(mockPhotoData, mockRecordId, 'bilty');

    expect(photoId).toContain(mockRecordId);
    expect(photoId).toContain('bilty');
    expect(typeof photoId).toBe('string');
  });

  it('should handle signature photo type correctly', async () => {
    const mockTimestamp = 1705320000000;
    jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

    const photoId = await PhotoManager.savePhoto(mockPhotoData, mockRecordId, 'signature');

    expect(photoId).toContain('signature');
    expect(RNFS.copyFile).toHaveBeenCalledWith(
      'file:///tmp/photo.jpg',
      expect.stringContaining('signature_')
    );

    jest.restoreAllMocks();
  });

  it('should merge with existing metadata in AsyncStorage', async () => {
    const existingMetadata = {
      'existing-photo-id': {
        id: 'existing-photo-id',
        recordId: 'other-record',
        photoType: 'bilty',
        localPath: '/path/to/existing.jpg',
        fileName: 'existing.jpg',
        fileSize: 5000,
        mimeType: 'image/jpeg',
        timestamp: '2024-01-14T12:00:00.000Z',
      },
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(existingMetadata)
    );

    await PhotoManager.savePhoto(mockPhotoData, mockRecordId, 'bilty');

    const savedData = JSON.parse(
      (AsyncStorage.setItem as jest.Mock).mock.calls[0][1]
    );
    
    expect(savedData['existing-photo-id']).toBeDefined();
    expect(Object.keys(savedData).length).toBe(2);
  });

  it('should throw error if file copy fails', async () => {
    (RNFS.copyFile as jest.Mock).mockRejectedValue(new Error('Copy failed'));

    await expect(
      PhotoManager.savePhoto(mockPhotoData, mockRecordId, 'bilty')
    ).rejects.toThrow('Failed to save bilty photo');
  });

  it('should throw error if metadata save fails', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(
      new Error('Storage full')
    );

    await expect(
      PhotoManager.savePhoto(mockPhotoData, mockRecordId, 'bilty')
    ).rejects.toThrow('Failed to save bilty photo');
  });

  it('should throw error if directory creation fails', async () => {
    (RNFS.mkdir as jest.Mock).mockRejectedValue(
      new Error('Permission denied')
    );

    await expect(
      PhotoManager.savePhoto(mockPhotoData, mockRecordId, 'bilty')
    ).rejects.toThrow('Failed to save bilty photo');
  });
});
