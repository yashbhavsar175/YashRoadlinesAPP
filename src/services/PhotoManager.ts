// PhotoManager.ts
import { launchCamera, launchImageLibrary, ImagePickerResponse, Asset } from 'react-native-image-picker';
import { PermissionsAndroid, Platform, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PhotoData } from '../data/Storage';
import { supabase } from '../supabase';
import { isOnline } from '../data/modules/NetworkHelper';
import { validatePhoto } from '../utils/PhotoValidation';
import { logError, logSyncError, logInfo } from '../utils/ErrorLogger';

export interface CaptureOptions {
  source: 'camera' | 'library';
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export type PhotoType = 'bilty' | 'signature';

interface PhotoMetadata {
  id: string;
  recordId: string;
  photoType: PhotoType;
  localPath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  timestamp: string;
  remoteUrl?: string; // Optional remote URL after sync
}

const PHOTO_METADATA_KEY = 'delivery_photo_metadata';
const PENDING_PHOTO_UPLOADS_KEY = 'pending_photo_uploads';
const DELIVERY_PHOTOS_BUCKET = 'delivery-photos';

export interface SyncResult {
  success: boolean;
  uploaded: number;
  failed: number;
  errors: Array<{ photoId: string; error: string }>;
}

/**
 * PhotoManager Service
 * Handles photo capture, storage, and synchronization for delivery records
 */
class PhotoManagerService {
  /**
   * Request camera permission on Android
   * @returns Promise<boolean> - true if permission granted
   */
  private async requestCameraPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true; // iOS handles permissions automatically
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'This app needs access to your camera to take photos of delivery documents.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('✅ Camera permission granted');
        return true;
      } else {
        console.log('❌ Camera permission denied');
        Alert.alert(
          'Permission Required',
          'Camera permission is required to take photos. Please enable it in app settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (err) {
      console.error('❌ Error requesting camera permission:', err);
      return false;
    }
  }

  /**
   * Capture a photo using the device camera or photo library
   * @param options - Capture options including source, quality, and dimensions
   * @returns Promise<PhotoData> - Photo data object with URI and metadata
   * @throws Error if photo capture fails or is cancelled
   */
  async capturePhoto(options: CaptureOptions): Promise<PhotoData> {
    const { source, quality = 0.7, maxWidth = 1920, maxHeight = 1920 } = options;

    // Request camera permission if using camera
    if (source === 'camera') {
      const hasPermission = await this.requestCameraPermission();
      if (!hasPermission) {
        throw new Error('Camera permission denied');
      }
    }

    const imagePickerOptions = {
      mediaType: 'photo' as const,
      quality: quality as 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1,
      maxWidth: maxWidth,
      maxHeight: maxHeight,
      includeBase64: false,
    };

    let result: ImagePickerResponse;

    try {
      if (source === 'camera') {
        result = await launchCamera(imagePickerOptions);
      } else {
        result = await launchImageLibrary(imagePickerOptions);
      }

      // Handle cancellation
      if (result.didCancel) {
        throw new Error('Photo capture cancelled');
      }

      // Handle errors
      if (result.errorCode) {
        throw new Error(`Photo capture failed: ${result.errorMessage || result.errorCode}`);
      }

      // Extract asset data
      const asset: Asset | undefined = result.assets?.[0];
      
      if (!asset || !asset.uri) {
        throw new Error('No photo data received');
      }

      // Validate file type
      const mimeType = asset.type || 'image/jpeg';
      if (!this.isValidImageType(mimeType)) {
        throw new Error('Invalid file type. Please select a JPG or PNG image.');
      }

      // Create PhotoData object
      const photoData: PhotoData = {
        uri: asset.uri,
        fileName: asset.fileName || `photo_${Date.now()}.jpg`,
        fileSize: asset.fileSize || 0,
        mimeType: mimeType,
        timestamp: new Date().toISOString(),
      };

      return photoData;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to capture photo');
    }
  }

  /**
   * Validate if the MIME type is a supported image format
   * @param mimeType - MIME type string to validate
   * @returns boolean - true if valid image type
   */
  private isValidImageType(mimeType: string): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    return validTypes.includes(mimeType.toLowerCase());
  }

  /**
   * Save a photo to local storage
   * @param photo - PhotoData object from capturePhoto
   * @param recordId - Delivery record ID
   * @param type - Photo type (bilty or signature)
   * @returns Promise<string> - Photo ID for reference
   * @throws Error if save fails
   */
  async savePhoto(photo: PhotoData, recordId: string, type: PhotoType): Promise<string> {
    try {
      // Generate unique photo ID
      const photoId = `${recordId}_${type}_${Date.now()}`;
      
      // Create directory path for this record
      const recordDir = `${RNFS.DocumentDirectoryPath}/delivery_photos/${recordId}`;
      
      // Ensure directory exists
      const dirExists = await RNFS.exists(recordDir);
      if (!dirExists) {
        await RNFS.mkdir(recordDir, { NSURLIsExcludedFromBackupKey: true });
      }
      
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const extension = photo.mimeType === 'image/png' ? 'png' : 'jpg';
      const fileName = `${type}_${timestamp}.${extension}`;
      const localPath = `${recordDir}/${fileName}`;
      
      // Copy photo from temporary location to app's private directory
      await RNFS.copyFile(photo.uri, localPath);
      
      // Create metadata object
      const metadata: PhotoMetadata = {
        id: photoId,
        recordId: recordId,
        photoType: type,
        localPath: localPath,
        fileName: fileName,
        fileSize: photo.fileSize,
        mimeType: photo.mimeType,
        timestamp: photo.timestamp,
      };
      
      // Save metadata to AsyncStorage
      await this.savePhotoMetadata(metadata);
      
      // Queue photo for upload
      await this.addToPendingUploads(photoId);
      
      console.log(`Photo saved and queued for upload: ${photoId}`);
      
      return photoId;
    } catch (error) {
      console.error('Failed to save photo:', error);
      throw new Error(`Failed to save ${type} photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save photo metadata to AsyncStorage
   * @param metadata - PhotoMetadata object
   */
  private async savePhotoMetadata(metadata: PhotoMetadata): Promise<void> {
    try {
      // Get existing metadata
      const existingData = await AsyncStorage.getItem(PHOTO_METADATA_KEY);
      const metadataMap: Record<string, PhotoMetadata> = existingData ? JSON.parse(existingData) : {};
      
      // Add new metadata
      metadataMap[metadata.id] = metadata;
      
      // Save back to AsyncStorage
      await AsyncStorage.setItem(PHOTO_METADATA_KEY, JSON.stringify(metadataMap));
    } catch (error) {
      console.error('Failed to save photo metadata:', error);
      throw error;
    }
  }
  /**
   * Retrieve a photo by its ID
   * @param photoId - Photo ID returned from savePhoto
   * @returns Promise<PhotoData | null> - PhotoData object or null if not found
   */
  async getPhoto(photoId: string): Promise<PhotoData | null> {
    try {
      // Get photo metadata from AsyncStorage
      const metadata = await this.getPhotoMetadata(photoId);

      if (!metadata) {
        console.warn(`Photo metadata not found for ID: ${photoId}`);
        return null;
      }

      // Check if local file exists
      const fileExists = await RNFS.exists(metadata.localPath);

      if (fileExists) {
        // Return PhotoData with local file URI
        return {
          uri: `file://${metadata.localPath}`,
          fileName: metadata.fileName,
          fileSize: metadata.fileSize,
          mimeType: metadata.mimeType,
          timestamp: metadata.timestamp,
        };
      }

      // If local file doesn't exist, fallback to remote URL if available
      if (metadata.remoteUrl) {
        console.log(`Using remote URL for photo: ${photoId}`);
        return {
          uri: metadata.remoteUrl,
          fileName: metadata.fileName,
          fileSize: metadata.fileSize,
          mimeType: metadata.mimeType,
          timestamp: metadata.timestamp,
        };
      }

      // Photo not found locally or remotely
      console.warn(`Photo not found locally or remotely: ${photoId}`);
      return null;

    } catch (error) {
      console.error('Failed to retrieve photo:', error);
      return null;
    }
  }

  /**
   * Get photo metadata from AsyncStorage
   * @param photoId - Photo ID
   * @returns Promise<PhotoMetadata | null> - Metadata object or null if not found
   */
  private async getPhotoMetadata(photoId: string): Promise<PhotoMetadata | null> {
    try {
      const existingData = await AsyncStorage.getItem(PHOTO_METADATA_KEY);
      if (!existingData) {
        return null;
      }

      const metadataMap: Record<string, PhotoMetadata> = JSON.parse(existingData);
      return metadataMap[photoId] || null;
    } catch (error) {
      console.error('Failed to get photo metadata:', error);
      return null;
    }
  }

  /**
   * Update photo metadata with remote URL after successful upload
   * @param photoId - Photo ID
   * @param remoteUrl - Remote URL from Supabase Storage
   */
  private async updatePhotoMetadata(photoId: string, remoteUrl: string): Promise<void> {
    try {
      const existingData = await AsyncStorage.getItem(PHOTO_METADATA_KEY);
      if (!existingData) {
        throw new Error('Photo metadata not found');
      }

      const metadataMap: Record<string, PhotoMetadata> = JSON.parse(existingData);
      
      if (!metadataMap[photoId]) {
        throw new Error(`Photo metadata not found for ID: ${photoId}`);
      }

      metadataMap[photoId].remoteUrl = remoteUrl;
      await AsyncStorage.setItem(PHOTO_METADATA_KEY, JSON.stringify(metadataMap));
    } catch (error) {
      console.error('Failed to update photo metadata:', error);
      throw error;
    }
  }

  /**
   * Get list of pending photo uploads
   * @returns Promise<string[]> - Array of photo IDs pending upload
   */
  private async getPendingUploads(): Promise<string[]> {
    try {
      const pendingData = await AsyncStorage.getItem(PENDING_PHOTO_UPLOADS_KEY);
      return pendingData ? JSON.parse(pendingData) : [];
    } catch (error) {
      console.error('Failed to get pending uploads:', error);
      return [];
    }
  }

  /**
   * Add photo ID to pending uploads queue
   * @param photoId - Photo ID to queue for upload
   */
  private async addToPendingUploads(photoId: string): Promise<void> {
    try {
      const pending = await this.getPendingUploads();
      if (!pending.includes(photoId)) {
        pending.push(photoId);
        await AsyncStorage.setItem(PENDING_PHOTO_UPLOADS_KEY, JSON.stringify(pending));
      }
    } catch (error) {
      console.error('Failed to add to pending uploads:', error);
      throw error;
    }
  }

  /**
   * Remove photo ID from pending uploads queue
   * @param photoId - Photo ID to remove from queue
   */
  private async removeFromPendingUploads(photoId: string): Promise<void> {
    try {
      const pending = await this.getPendingUploads();
      const filtered = pending.filter(id => id !== photoId);
      await AsyncStorage.setItem(PENDING_PHOTO_UPLOADS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove from pending uploads:', error);
      throw error;
    }
  }

  /**
   * Upload a single photo to Supabase Storage
   * @param photoId - Photo ID
   * @param metadata - Photo metadata
   * @param officeId - Office ID for path structure
   * @returns Promise<string> - Remote URL of uploaded photo
   * @throws Error if upload fails
   */
  private async uploadPhotoToStorage(
    photoId: string,
    metadata: PhotoMetadata,
    officeId: string
  ): Promise<string> {
    try {
      // Read photo file as base64
      const fileContent = await RNFS.readFile(metadata.localPath, 'base64');
      
      // Convert base64 to Uint8Array for upload
      const binaryString = atob(fileContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Generate storage path: {office_id}/{delivery_record_id}/{photo_type}_{timestamp}.jpg
      const timestamp = Date.now();
      const extension = metadata.mimeType === 'image/png' ? 'png' : 'jpg';
      const storagePath = `${officeId}/${metadata.recordId}/${metadata.photoType}_${timestamp}.${extension}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(DELIVERY_PHOTOS_BUCKET)
        .upload(storagePath, bytes, {
          contentType: metadata.mimeType,
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(DELIVERY_PHOTOS_BUCKET)
        .getPublicUrl(storagePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      return urlData.publicUrl;
    } catch (error) {
      console.error(`Failed to upload photo ${photoId}:`, error);
      throw error;
    }
  }

  /**
   * Sync pending photos to Supabase Storage with retry logic
   * Validates: Requirements 4.6, 4.7, 6.5
   * @returns Promise<SyncResult> - Result of sync operation
   */
  async syncPendingPhotos(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      uploaded: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Check if online
      const online = await isOnline();
      if (!online) {
        console.log('PhotoManager: Offline, skipping photo sync');
        return result;
      }

      // Get pending uploads
      const pendingPhotoIds = await this.getPendingUploads();
      
      if (pendingPhotoIds.length === 0) {
        console.log('PhotoManager: No pending photos to sync');
        return result;
      }

      console.log(`PhotoManager: Syncing ${pendingPhotoIds.length} pending photos...`);

      // Process each pending photo
      for (const photoId of pendingPhotoIds) {
        try {
          await this.syncSinglePhoto(photoId);
          result.uploaded++;
          console.log(`✅ PhotoManager: Photo ${photoId} uploaded successfully`);
        } catch (error) {
          result.failed++;
          result.success = false;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push({ photoId, error: errorMessage });
          console.error(`❌ PhotoManager: Failed to sync photo ${photoId}:`, errorMessage);
        }
      }

      console.log(`📊 PhotoManager: Sync complete. Uploaded: ${result.uploaded}, Failed: ${result.failed}`);
      return result;
    } catch (error) {
      console.error('❌ PhotoManager: Error during photo sync:', error);
      result.success = false;
      return result;
    }
  }

  /**
   * Sync a single photo with exponential backoff retry logic
   * Validates: Requirements 4.6, 4.7
   * @param photoId - Photo ID to sync
   * @param retryCount - Current retry attempt (default: 0)
   * @param maxRetries - Maximum number of retries (default: 3)
   */
  private async syncSinglePhoto(
    photoId: string,
    retryCount: number = 0,
    maxRetries: number = 3
  ): Promise<void> {
    try {
      // Get photo metadata
      const metadata = await this.getPhotoMetadata(photoId);
      
      if (!metadata) {
        throw new Error(`Photo metadata not found for ID: ${photoId}`);
      }

      // Skip if already uploaded
      if (metadata.remoteUrl) {
        console.log(`Photo ${photoId} already uploaded, removing from queue`);
        await this.removeFromPendingUploads(photoId);
        return;
      }

      // Check if local file exists
      const fileExists = await RNFS.exists(metadata.localPath);
      if (!fileExists) {
        throw new Error(`Local file not found: ${metadata.localPath}`);
      }

      // Get office ID from the delivery record
      const officeId = await this.getOfficeIdForDeliveryRecord(metadata.recordId);

      // Upload photo to Supabase Storage
      const remoteUrl = await this.uploadPhotoToStorage(photoId, metadata, officeId);

      // Update metadata with remote URL
      await this.updatePhotoMetadata(photoId, remoteUrl);

      // Update photo record in database
      await this.updatePhotoRecordInDatabase(photoId, remoteUrl);

      // Remove from pending uploads queue
      await this.removeFromPendingUploads(photoId);

      console.log(`✅ Successfully synced photo ${photoId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Retry with exponential backoff - Validates: Requirement 4.7
      if (retryCount < maxRetries) {
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
        console.log(`⏳ Retrying photo ${photoId} in ${backoffDelay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        await this.syncSinglePhoto(photoId, retryCount + 1, maxRetries);
      } else {
        console.error(`❌ Failed to sync photo ${photoId} after ${maxRetries} retries:`, errorMessage);
        throw error;
      }
    }
  }

  /**
   * Get office ID for a delivery record
   * @param deliveryRecordId - Delivery record ID
   * @returns Promise<string> - Office ID
   */
  private async getOfficeIdForDeliveryRecord(deliveryRecordId: string): Promise<string> {
    try {
      // Try to get from online database first
      const online = await isOnline();
      
      if (online) {
        const { data, error } = await supabase
          .from('agency_entries')
          .select('office_id')
          .eq('id', deliveryRecordId)
          .single();

        if (!error && data?.office_id) {
          return data.office_id;
        }
      }

      // Fallback to offline storage
      const { OFFLINE_KEYS } = await import('../data/Storage');
      const offlineData = await AsyncStorage.getItem(OFFLINE_KEYS.AGENCY_ENTRIES);
      
      if (offlineData) {
        const records = JSON.parse(offlineData);
        const record = records.find((r: any) => r.id === deliveryRecordId);
        
        if (record?.office_id) {
          return record.office_id;
        }
      }

      // If no office_id found, use a default
      console.warn(`⚠️ No office_id found for delivery record ${deliveryRecordId}, using default`);
      return 'default-office';
    } catch (error) {
      console.error('❌ Error getting office_id for delivery record:', error);
      return 'default-office';
    }
  }

  /**
   * Update photo record in database with upload URL
   * @param photoId - Photo ID
   * @param uploadUrl - Remote URL from Supabase Storage
   */
  private async updatePhotoRecordInDatabase(photoId: string, uploadUrl: string): Promise<void> {
    try {
      // Update the delivery_photos table with the upload URL
      const { error } = await supabase
        .from('delivery_photos')
        .update({
          uploaded: true,
          upload_url: uploadUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', photoId);

      if (error) {
        throw new Error(`Failed to update photo record: ${error.message}`);
      }

      console.log(`Updated photo record ${photoId} with upload URL`);
    } catch (error) {
      console.error(`Failed to update photo record in database:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const PhotoManager = new PhotoManagerService();
export default PhotoManager;
