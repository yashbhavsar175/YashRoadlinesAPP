/**
 * Unit Tests for PhotoManager Service
 * Feature: mumbai-delivery-redesign
 * 
 * Tests the PhotoManager service's capturePhoto method
 * Validates: Requirements 4.1, 4.2, 4.4
 */

import { PhotoManager } from '../src/services/PhotoManager';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

describe('PhotoManager Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('capturePhoto - camera source', () => {
    test('should successfully capture photo from camera', async () => {
      // Arrange
      const mockAsset = {
        uri: 'file:///path/to/photo.jpg',
        fileName: 'photo.jpg',
        fileSize: 12345,
        type: 'image/jpeg',
      };

      (launchCamera as jest.Mock).mockResolvedValue({
        assets: [mockAsset],
      });

      // Act
      const result = await PhotoManager.capturePhoto({
        source: 'camera',
        quality: 0.7,
        maxWidth: 1920,
      });

      // Assert
      expect(launchCamera).toHaveBeenCalledWith({
        mediaType: 'photo',
        quality: 0.7,
        maxWidth: 1920,
        maxHeight: 1920,
        includeBase64: false,
      });
      expect(result.uri).toBe(mockAsset.uri);
      expect(result.fileName).toBe(mockAsset.fileName);
      expect(result.fileSize).toBe(mockAsset.fileSize);
      expect(result.mimeType).toBe(mockAsset.type);
      expect(result.timestamp).toBeDefined();
    });

    test('should use default quality and maxWidth if not provided', async () => {
      // Arrange
      const mockAsset = {
        uri: 'file:///path/to/photo.jpg',
        fileName: 'photo.jpg',
        fileSize: 12345,
        type: 'image/jpeg',
      };

      (launchCamera as jest.Mock).mockResolvedValue({
        assets: [mockAsset],
      });

      // Act
      await PhotoManager.capturePhoto({ source: 'camera' });

      // Assert
      expect(launchCamera).toHaveBeenCalledWith({
        mediaType: 'photo',
        quality: 0.7,
        maxWidth: 1920,
        maxHeight: 1920,
        includeBase64: false,
      });
    });
  });

  describe('capturePhoto - library source', () => {
    test('should successfully select photo from library', async () => {
      // Arrange
      const mockAsset = {
        uri: 'file:///path/to/photo.png',
        fileName: 'photo.png',
        fileSize: 54321,
        type: 'image/png',
      };

      (launchImageLibrary as jest.Mock).mockResolvedValue({
        assets: [mockAsset],
      });

      // Act
      const result = await PhotoManager.capturePhoto({
        source: 'library',
        quality: 0.8,
        maxWidth: 2048,
      });

      // Assert
      expect(launchImageLibrary).toHaveBeenCalledWith({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 2048,
        maxHeight: 1920,
        includeBase64: false,
      });
      expect(result.uri).toBe(mockAsset.uri);
      expect(result.fileName).toBe(mockAsset.fileName);
      expect(result.fileSize).toBe(mockAsset.fileSize);
      expect(result.mimeType).toBe(mockAsset.type);
    });
  });

  describe('capturePhoto - error handling', () => {
    test('should throw error when user cancels', async () => {
      // Arrange
      (launchCamera as jest.Mock).mockResolvedValue({
        didCancel: true,
      });

      // Act & Assert
      await expect(
        PhotoManager.capturePhoto({ source: 'camera' })
      ).rejects.toThrow('Photo capture cancelled');
    });

    test('should throw error when picker returns error', async () => {
      // Arrange
      (launchCamera as jest.Mock).mockResolvedValue({
        errorCode: 'camera_unavailable',
        errorMessage: 'Camera not available',
      });

      // Act & Assert
      await expect(
        PhotoManager.capturePhoto({ source: 'camera' })
      ).rejects.toThrow('Photo capture failed: Camera not available');
    });

    test('should throw error when no asset data received', async () => {
      // Arrange
      (launchCamera as jest.Mock).mockResolvedValue({
        assets: [],
      });

      // Act & Assert
      await expect(
        PhotoManager.capturePhoto({ source: 'camera' })
      ).rejects.toThrow('No photo data received');
    });

    test('should throw error when asset has no URI', async () => {
      // Arrange
      (launchCamera as jest.Mock).mockResolvedValue({
        assets: [{ fileName: 'photo.jpg' }],
      });

      // Act & Assert
      await expect(
        PhotoManager.capturePhoto({ source: 'camera' })
      ).rejects.toThrow('No photo data received');
    });
  });

  describe('capturePhoto - file type validation', () => {
    test('should accept JPEG images', async () => {
      // Arrange
      const mockAsset = {
        uri: 'file:///path/to/photo.jpg',
        fileName: 'photo.jpg',
        fileSize: 12345,
        type: 'image/jpeg',
      };

      (launchCamera as jest.Mock).mockResolvedValue({
        assets: [mockAsset],
      });

      // Act
      const result = await PhotoManager.capturePhoto({ source: 'camera' });

      // Assert
      expect(result.mimeType).toBe('image/jpeg');
    });

    test('should accept PNG images', async () => {
      // Arrange
      const mockAsset = {
        uri: 'file:///path/to/photo.png',
        fileName: 'photo.png',
        fileSize: 12345,
        type: 'image/png',
      };

      (launchCamera as jest.Mock).mockResolvedValue({
        assets: [mockAsset],
      });

      // Act
      const result = await PhotoManager.capturePhoto({ source: 'camera' });

      // Assert
      expect(result.mimeType).toBe('image/png');
    });

    test('should accept JPG images', async () => {
      // Arrange
      const mockAsset = {
        uri: 'file:///path/to/photo.jpg',
        fileName: 'photo.jpg',
        fileSize: 12345,
        type: 'image/jpg',
      };

      (launchCamera as jest.Mock).mockResolvedValue({
        assets: [mockAsset],
      });

      // Act
      const result = await PhotoManager.capturePhoto({ source: 'camera' });

      // Assert
      expect(result.mimeType).toBe('image/jpg');
    });

    test('should reject non-image file types', async () => {
      // Arrange
      const mockAsset = {
        uri: 'file:///path/to/document.pdf',
        fileName: 'document.pdf',
        fileSize: 12345,
        type: 'application/pdf',
      };

      (launchCamera as jest.Mock).mockResolvedValue({
        assets: [mockAsset],
      });

      // Act & Assert
      await expect(
        PhotoManager.capturePhoto({ source: 'camera' })
      ).rejects.toThrow('Invalid file type. Please select a JPG or PNG image.');
    });

    test('should reject video file types', async () => {
      // Arrange
      const mockAsset = {
        uri: 'file:///path/to/video.mp4',
        fileName: 'video.mp4',
        fileSize: 12345,
        type: 'video/mp4',
      };

      (launchCamera as jest.Mock).mockResolvedValue({
        assets: [mockAsset],
      });

      // Act & Assert
      await expect(
        PhotoManager.capturePhoto({ source: 'camera' })
      ).rejects.toThrow('Invalid file type. Please select a JPG or PNG image.');
    });

    test('should default to image/jpeg when type is missing', async () => {
      // Arrange
      const mockAsset = {
        uri: 'file:///path/to/photo.jpg',
        fileName: 'photo.jpg',
        fileSize: 12345,
        // type is missing
      };

      (launchCamera as jest.Mock).mockResolvedValue({
        assets: [mockAsset],
      });

      // Act
      const result = await PhotoManager.capturePhoto({ source: 'camera' });

      // Assert
      expect(result.mimeType).toBe('image/jpeg');
    });
  });

  describe('capturePhoto - metadata handling', () => {
    test('should generate filename when not provided', async () => {
      // Arrange
      const mockAsset = {
        uri: 'file:///path/to/photo.jpg',
        fileSize: 12345,
        type: 'image/jpeg',
        // fileName is missing
      };

      (launchCamera as jest.Mock).mockResolvedValue({
        assets: [mockAsset],
      });

      // Act
      const result = await PhotoManager.capturePhoto({ source: 'camera' });

      // Assert
      expect(result.fileName).toMatch(/^photo_\d+\.jpg$/);
    });

    test('should default fileSize to 0 when not provided', async () => {
      // Arrange
      const mockAsset = {
        uri: 'file:///path/to/photo.jpg',
        fileName: 'photo.jpg',
        type: 'image/jpeg',
        // fileSize is missing
      };

      (launchCamera as jest.Mock).mockResolvedValue({
        assets: [mockAsset],
      });

      // Act
      const result = await PhotoManager.capturePhoto({ source: 'camera' });

      // Assert
      expect(result.fileSize).toBe(0);
    });

    test('should include timestamp in ISO format', async () => {
      // Arrange
      const mockAsset = {
        uri: 'file:///path/to/photo.jpg',
        fileName: 'photo.jpg',
        fileSize: 12345,
        type: 'image/jpeg',
      };

      (launchCamera as jest.Mock).mockResolvedValue({
        assets: [mockAsset],
      });

      // Act
      const result = await PhotoManager.capturePhoto({ source: 'camera' });

      // Assert
      expect(result.timestamp).toBeDefined();
      expect(() => new Date(result.timestamp)).not.toThrow();
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});

describe('getPhoto - photo retrieval', () => {
  // Mock AsyncStorage and RNFS
  const mockAsyncStorage = require('@react-native-async-storage/async-storage');
  const mockRNFS = require('react-native-fs');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should retrieve photo from local storage when file exists', async () => {
    // Arrange
    const photoId = 'test-record_bilty_1234567890';
    const mockMetadata = {
      id: photoId,
      recordId: 'test-record',
      photoType: 'bilty',
      localPath: '/path/to/photo.jpg',
      fileName: 'bilty_1234567890.jpg',
      fileSize: 12345,
      mimeType: 'image/jpeg',
      timestamp: '2024-01-15T12:00:00.000Z',
    };

    mockAsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ [photoId]: mockMetadata })
    );
    mockRNFS.exists.mockResolvedValue(true);

    // Act
    const result = await PhotoManager.getPhoto(photoId);

    // Assert
    expect(result).not.toBeNull();
    expect(result?.uri).toBe('file:///path/to/photo.jpg');
    expect(result?.fileName).toBe('bilty_1234567890.jpg');
    expect(result?.fileSize).toBe(12345);
    expect(result?.mimeType).toBe('image/jpeg');
    expect(result?.timestamp).toBe('2024-01-15T12:00:00.000Z');
  });

  test('should fallback to remote URL when local file does not exist', async () => {
    // Arrange
    const photoId = 'test-record_signature_1234567890';
    const mockMetadata = {
      id: photoId,
      recordId: 'test-record',
      photoType: 'signature',
      localPath: '/path/to/photo.jpg',
      fileName: 'signature_1234567890.jpg',
      fileSize: 54321,
      mimeType: 'image/png',
      timestamp: '2024-01-15T12:00:00.000Z',
      remoteUrl: 'https://example.com/photos/signature_1234567890.jpg',
    };

    mockAsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ [photoId]: mockMetadata })
    );
    mockRNFS.exists.mockResolvedValue(false);

    // Act
    const result = await PhotoManager.getPhoto(photoId);

    // Assert
    expect(result).not.toBeNull();
    expect(result?.uri).toBe('https://example.com/photos/signature_1234567890.jpg');
    expect(result?.fileName).toBe('signature_1234567890.jpg');
    expect(result?.fileSize).toBe(54321);
    expect(result?.mimeType).toBe('image/png');
  });

  test('should return null when photo metadata not found', async () => {
    // Arrange
    const photoId = 'non-existent-photo';
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({}));

    // Act
    const result = await PhotoManager.getPhoto(photoId);

    // Assert
    expect(result).toBeNull();
  });

  test('should return null when local file does not exist and no remote URL', async () => {
    // Arrange
    const photoId = 'test-record_bilty_1234567890';
    const mockMetadata = {
      id: photoId,
      recordId: 'test-record',
      photoType: 'bilty',
      localPath: '/path/to/photo.jpg',
      fileName: 'bilty_1234567890.jpg',
      fileSize: 12345,
      mimeType: 'image/jpeg',
      timestamp: '2024-01-15T12:00:00.000Z',
      // No remoteUrl
    };

    mockAsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ [photoId]: mockMetadata })
    );
    mockRNFS.exists.mockResolvedValue(false);

    // Act
    const result = await PhotoManager.getPhoto(photoId);

    // Assert
    expect(result).toBeNull();
  });

  test('should return null when AsyncStorage is empty', async () => {
    // Arrange
    const photoId = 'test-photo';
    mockAsyncStorage.getItem.mockResolvedValue(null);

    // Act
    const result = await PhotoManager.getPhoto(photoId);

    // Assert
    expect(result).toBeNull();
  });

  test('should handle errors gracefully and return null', async () => {
    // Arrange
    const photoId = 'test-photo';
    mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

    // Act
    const result = await PhotoManager.getPhoto(photoId);

    // Assert
    expect(result).toBeNull();
  });

  test('should prioritize local file over remote URL when both exist', async () => {
    // Arrange
    const photoId = 'test-record_bilty_1234567890';
    const mockMetadata = {
      id: photoId,
      recordId: 'test-record',
      photoType: 'bilty',
      localPath: '/path/to/photo.jpg',
      fileName: 'bilty_1234567890.jpg',
      fileSize: 12345,
      mimeType: 'image/jpeg',
      timestamp: '2024-01-15T12:00:00.000Z',
      remoteUrl: 'https://example.com/photos/bilty_1234567890.jpg',
    };

    mockAsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ [photoId]: mockMetadata })
    );
    mockRNFS.exists.mockResolvedValue(true);

    // Act
    const result = await PhotoManager.getPhoto(photoId);

    // Assert
    expect(result).not.toBeNull();
    expect(result?.uri).toBe('file:///path/to/photo.jpg');
    expect(result?.uri).not.toBe('https://example.com/photos/bilty_1234567890.jpg');
  });
});

describe('syncPendingPhotos - photo synchronization', () => {
  const mockAsyncStorage = require('@react-native-async-storage/async-storage');
  const mockRNFS = require('react-native-fs');
  const mockSupabase = require('../src/supabase');
  const mockNetworkHelper = require('../src/data/modules/NetworkHelper');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should skip sync when offline', async () => {
    // Arrange
    mockNetworkHelper.isOnline.mockResolvedValue(false);

    // Act
    const result = await PhotoManager.syncPendingPhotos();

    // Assert
    expect(result.success).toBe(true);
    expect(result.uploaded).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  test('should return success when no pending photos', async () => {
    // Arrange
    mockNetworkHelper.isOnline.mockResolvedValue(true);
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

    // Act
    const result = await PhotoManager.syncPendingPhotos();

    // Assert
    expect(result.success).toBe(true);
    expect(result.uploaded).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  test('should successfully sync pending photos', async () => {
    // Arrange
    const photoId = 'test-record_bilty_1234567890';
    const mockMetadata = {
      id: photoId,
      recordId: 'test-record',
      photoType: 'bilty',
      localPath: '/path/to/photo.jpg',
      fileName: 'bilty_1234567890.jpg',
      fileSize: 12345,
      mimeType: 'image/jpeg',
      timestamp: '2024-01-15T12:00:00.000Z',
    };

    mockNetworkHelper.isOnline.mockResolvedValue(true);
    
    // Mock pending uploads queue
    mockAsyncStorage.getItem
      .mockResolvedValueOnce(JSON.stringify([photoId])) // pending uploads
      .mockResolvedValueOnce(JSON.stringify({ [photoId]: mockMetadata })) // photo metadata
      .mockResolvedValueOnce(JSON.stringify({ [photoId]: mockMetadata })); // for update

    mockRNFS.exists.mockResolvedValue(true);
    mockRNFS.readFile.mockResolvedValue('base64encodeddata');

    // Mock Supabase storage upload
    mockSupabase.supabase.storage.from.mockReturnValue({
      upload: jest.fn().mockResolvedValue({
        data: { path: 'default-office/test-record/bilty_1234567890.jpg' },
        error: null,
      }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/photo.jpg' },
      }),
    });

    // Mock database update
    mockSupabase.supabase.from.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    // Act
    const result = await PhotoManager.syncPendingPhotos();

    // Assert
    expect(result.success).toBe(true);
    expect(result.uploaded).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  test('should handle upload failures and track errors', async () => {
    // Arrange
    const photoId = 'test-record_bilty_1234567890';
    const mockMetadata = {
      id: photoId,
      recordId: 'test-record',
      photoType: 'bilty',
      localPath: '/path/to/photo.jpg',
      fileName: 'bilty_1234567890.jpg',
      fileSize: 12345,
      mimeType: 'image/jpeg',
      timestamp: '2024-01-15T12:00:00.000Z',
    };

    mockNetworkHelper.isOnline.mockResolvedValue(true);
    
    mockAsyncStorage.getItem
      .mockResolvedValueOnce(JSON.stringify([photoId])) // pending uploads
      .mockResolvedValue(JSON.stringify({ [photoId]: mockMetadata })); // photo metadata

    mockRNFS.exists.mockResolvedValue(true);
    mockRNFS.readFile.mockResolvedValue('base64encodeddata');

    // Mock Supabase storage upload failure
    mockSupabase.supabase.storage.from.mockReturnValue({
      upload: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' },
      }),
    });

    // Act
    const result = await PhotoManager.syncPendingPhotos();

    // Assert
    expect(result.success).toBe(false);
    expect(result.uploaded).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].photoId).toBe(photoId);
  });

  test('should skip already uploaded photos', async () => {
    // Arrange
    const photoId = 'test-record_bilty_1234567890';
    const mockMetadata = {
      id: photoId,
      recordId: 'test-record',
      photoType: 'bilty',
      localPath: '/path/to/photo.jpg',
      fileName: 'bilty_1234567890.jpg',
      fileSize: 12345,
      mimeType: 'image/jpeg',
      timestamp: '2024-01-15T12:00:00.000Z',
      remoteUrl: 'https://example.com/photo.jpg', // Already uploaded
    };

    mockNetworkHelper.isOnline.mockResolvedValue(true);
    
    mockAsyncStorage.getItem
      .mockResolvedValueOnce(JSON.stringify([photoId])) // pending uploads
      .mockResolvedValue(JSON.stringify({ [photoId]: mockMetadata })); // photo metadata

    // Act
    const result = await PhotoManager.syncPendingPhotos();

    // Assert
    expect(result.success).toBe(true);
    expect(result.uploaded).toBe(1);
    expect(result.failed).toBe(0);
    // Should have removed from pending queue
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'pending_photo_uploads',
      JSON.stringify([])
    );
  });
});
