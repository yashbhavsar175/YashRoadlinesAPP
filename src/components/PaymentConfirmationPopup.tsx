// PaymentConfirmationPopup.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { GlobalStyles } from '../theme/styles';
import { Colors } from '../theme/colors';
import { DeliveryRecord, PaymentConfirmation, PhotoData } from '../data/Storage';
import Icon from 'react-native-vector-icons/Ionicons';
import PhotoManager from '../services/PhotoManager';
import { useAlert } from '../context/AlertContext';

interface PaymentConfirmationPopupProps {
  visible: boolean;
  deliveryRecord: DeliveryRecord;
  onConfirm: (confirmation: PaymentConfirmation) => Promise<void>;
  onCancel: () => void;
  readOnly?: boolean;
}

const PaymentConfirmationPopup: React.FC<PaymentConfirmationPopupProps> = ({
  visible,
  deliveryRecord,
  onConfirm,
  onCancel,
  readOnly = false,
}) => {
  const { showAlert } = useAlert();
  
  // State management
  const [confirmedAmount, setConfirmedAmount] = useState<string>('');
  const [biltyPhoto, setBiltyPhoto] = useState<PhotoData | null>(null);
  const [signaturePhoto, setSignaturePhoto] = useState<PhotoData | null>(null);
  const [confirming, setConfirming] = useState<boolean>(false);
  const [paymentType, setPaymentType] = useState<'cash' | 'gpay_sapan' | 'gpay_yash'>('cash');
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(false);
  const [biltyPhotoUrl, setBiltyPhotoUrl] = useState<string | null>(null);
  const [signaturePhotoUrl, setSignaturePhotoUrl] = useState<string | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  
  // Track if we've initialized for this record to prevent re-initialization
  const initializedRecordRef = React.useRef<string | null>(null);

  // Initialize state when modal opens
  useEffect(() => {
    if (visible && deliveryRecord) {
      // Only initialize if this is a new record or we haven't initialized yet
      if (initializedRecordRef.current !== deliveryRecord.id) {
        console.log('📱 PaymentConfirmationPopup: Initializing for record', deliveryRecord.id);
        initializedRecordRef.current = deliveryRecord.id;
        
        // Pre-fill with original amount
        setConfirmedAmount(deliveryRecord.confirmed_amount?.toString() || deliveryRecord.amount.toString());
        
        // Set payment type from record if available
        if (deliveryRecord.payment_type) {
          setPaymentType(deliveryRecord.payment_type);
        } else {
          setPaymentType('cash'); // Default to cash
        }
        
        // If read-only mode, load existing photos
        if (readOnly && deliveryRecord.confirmation_status === 'confirmed') {
          loadExistingPhotos();
        } else {
          // Reset photos for new confirmation
          setBiltyPhoto(null);
          setSignaturePhoto(null);
          setBiltyPhotoUrl(null);
          setSignaturePhotoUrl(null);
        }
      } else {
        console.log('📱 PaymentConfirmationPopup: Already initialized for this record, skipping reset');
      }
    }
  }, [visible, deliveryRecord, readOnly]);

  // Load existing photos for confirmed records
  const loadExistingPhotos = async () => {
    try {
      setLoadingPhotos(true);
      console.log('📸 Loading existing photos for record:', deliveryRecord.id);
      console.log('📸 Bilty photo ID:', deliveryRecord.bilty_photo_id);
      console.log('📸 Signature photo ID:', deliveryRecord.signature_photo_id);
      
      const { supabase } = await import('../supabase');
      
      // Load bilty photo
      if (deliveryRecord.bilty_photo_id) {
        console.log('📸 Fetching bilty photo from database...');
        const { data: biltyPhotoData, error: biltyError } = await supabase
          .from('delivery_photos')
          .select('file_path, upload_url')
          .eq('id', deliveryRecord.bilty_photo_id)
          .single();
        
        console.log('📸 Bilty photo query result:', { data: biltyPhotoData, error: biltyError });
        
        if (biltyPhotoData) {
          // Check if photo is uploaded to storage
          if (biltyPhotoData.upload_url) {
            console.log('📸 Using upload_url:', biltyPhotoData.upload_url);
            setBiltyPhotoUrl(biltyPhotoData.upload_url);
          } else if (biltyPhotoData.file_path) {
            // Check if file_path is a local path or storage path
            if (biltyPhotoData.file_path.startsWith('file://') || biltyPhotoData.file_path.startsWith('/data/')) {
              console.log('⚠️ Photo not uploaded yet, using local path:', biltyPhotoData.file_path);
              // For local files, we can't display them in the web view
              // Show a message that photo needs to be synced
              setBiltyPhotoUrl(null);
              showAlert('Photos are stored locally. Please sync to view them.');
            } else {
              console.log('📸 Bilty photo storage path:', biltyPhotoData.file_path);
              // Get public URL for the photo from correct bucket
              const { data: { publicUrl } } = supabase.storage
                .from('delivery-photos')
                .getPublicUrl(biltyPhotoData.file_path);
              
              console.log('📸 Bilty photo public URL:', publicUrl);
              setBiltyPhotoUrl(publicUrl);
            }
          }
          console.log('✅ Bilty photo processed');
        } else {
          console.log('⚠️ No bilty photo data found');
        }
      } else {
        console.log('⚠️ No bilty_photo_id in delivery record');
      }
      
      // Load signature photo
      if (deliveryRecord.signature_photo_id) {
        console.log('📸 Fetching signature photo from database...');
        const { data: signaturePhotoData, error: signatureError } = await supabase
          .from('delivery_photos')
          .select('file_path, upload_url')
          .eq('id', deliveryRecord.signature_photo_id)
          .single();
        
        console.log('📸 Signature photo query result:', { data: signaturePhotoData, error: signatureError });
        
        if (signaturePhotoData) {
          // Check if photo is uploaded to storage
          if (signaturePhotoData.upload_url) {
            console.log('📸 Using upload_url:', signaturePhotoData.upload_url);
            setSignaturePhotoUrl(signaturePhotoData.upload_url);
          } else if (signaturePhotoData.file_path) {
            // Check if file_path is a local path or storage path
            if (signaturePhotoData.file_path.startsWith('file://') || signaturePhotoData.file_path.startsWith('/data/')) {
              console.log('⚠️ Photo not uploaded yet, using local path:', signaturePhotoData.file_path);
              setSignaturePhotoUrl(null);
            } else {
              console.log('📸 Signature photo storage path:', signaturePhotoData.file_path);
              // Get public URL for the photo from correct bucket
              const { data: { publicUrl } } = supabase.storage
                .from('delivery-photos')
                .getPublicUrl(signaturePhotoData.file_path);
              
              console.log('📸 Signature photo public URL:', publicUrl);
              setSignaturePhotoUrl(publicUrl);
            }
          }
          console.log('✅ Signature photo processed');
        } else {
          console.log('⚠️ No signature photo data found');
        }
      } else {
        console.log('⚠️ No signature_photo_id in delivery record');
      }
    } catch (error) {
      console.error('❌ Error loading photos:', error);
      showAlert('Failed to load photos');
    } finally {
      setLoadingPhotos(false);
      console.log('📸 Photo loading complete');
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      console.log('📱 PaymentConfirmationPopup: Closing, resetting state');
      setConfirmedAmount('');
      setBiltyPhoto(null);
      setSignaturePhoto(null);
      setBiltyPhotoUrl(null);
      setSignaturePhotoUrl(null);
      setConfirming(false);
      initializedRecordRef.current = null; // Reset the ref when closing
    }
  }, [visible]);

  /**
   * Task 9.4: Handle photo capture
   * Opens camera or library to capture photo
   * Validates: Requirements 4.1, 4.2, 4.4, 10.6
   */
  const handleCapturePhoto = async (type: 'bilty' | 'signature') => {
    try {
      console.log(`📸 Starting photo capture for ${type}`);
      
      // Show action sheet to choose camera or library
      const photoManager = PhotoManager;
      
      // For now, we'll use camera by default
      // In a production app, you'd show an action sheet to let user choose
      const photoData = await photoManager.capturePhoto({
        source: 'camera',
        quality: 0.7,
        maxWidth: 1920,
      });

      console.log(`✅ Photo captured successfully for ${type}`);

      // Update state with captured photo
      if (type === 'bilty') {
        setBiltyPhoto(photoData);
      } else {
        setSignaturePhoto(photoData);
      }
    } catch (error) {
      console.error(`❌ Photo capture error for ${type}:`, error);
      // Use AlertContext for all error messages (Requirement 10.6)
      if (error instanceof Error) {
        if (error.message !== 'Photo capture cancelled') {
          showAlert(error.message);
        } else {
          console.log('📸 Photo capture cancelled by user');
        }
      } else {
        showAlert('Failed to capture photo');
      }
    }
  };

  /**
   * Task 9.5: Validate confirmation data
   * Checks that all required fields are present and valid
   * Validates: Requirements 3.6, 10.6
   */
  const validateConfirmation = (): boolean => {
    // Check confirmed amount is valid positive number
    const amount = parseFloat(confirmedAmount);
    if (isNaN(amount) || amount <= 0) {
      showAlert('Enter valid amount');
      return false;
    }

    // Check bilty photo is not null (Requirement 3.6)
    if (!biltyPhoto) {
      showAlert('Please upload bilty photo');
      return false;
    }

    // Check signature photo is not null (Requirement 3.6)
    if (!signaturePhoto) {
      showAlert('Please upload signature photo');
      return false;
    }

    return true;
  };

  /**
   * Task 9.6: Handle confirmation
   * Validates data, saves photos, and calls onConfirm prop
   * Validates: Requirements 3.7, 10.6
   */
  const handleConfirm = async () => {
    try {
      // Validate confirmation data
      if (!validateConfirmation()) {
        return;
      }

      setConfirming(true);

      // Save photos using PhotoManager
      const photoManager = PhotoManager;
      
      const biltyPhotoId = await photoManager.savePhoto(
        biltyPhoto!,
        deliveryRecord.id,
        'bilty'
      );

      const signaturePhotoId = await photoManager.savePhoto(
        signaturePhoto!,
        deliveryRecord.id,
        'signature'
      );

      // Create PaymentConfirmation object
      const confirmation: PaymentConfirmation = {
        delivery_record_id: deliveryRecord.id,
        confirmed_amount: parseFloat(confirmedAmount),
        bilty_photo: biltyPhoto!,
        signature_photo: signaturePhoto!,
        confirmed_at: new Date().toISOString(),
        payment_type: paymentType,
      };

      // Call onConfirm prop with confirmation data
      await onConfirm(confirmation);

      // Close popup on success
      // The parent component will handle closing via onCancel or state management
    } catch (error) {
      // Display error message on failure using AlertContext (Requirement 10.6)
      if (error instanceof Error) {
        showAlert(error.message);
      } else {
        showAlert('Failed to confirm payment');
      }
    } finally {
      setConfirming(false);
    }
  };
console.log('PaymentConfirmationPopup RENDER - visible:', visible, '| record:', deliveryRecord?.id);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent={true}
      hardwareAccelerated={true}
      onDismiss={() => {
        console.log('📱 Modal dismissed');
      }}
    >
      {/* Removed temporary debug log and background colors */}
      <View style={styles.modalOverlay}>
        <View style={styles.keyboardAvoidingView}>
          <View style={styles.modalContainer}>
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>
                  {readOnly ? 'Payment Details' : 'Confirm Payment'}
                </Text>
                <TouchableOpacity
                  onPress={onCancel}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="close" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

            {/* Delivery Record Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery Details</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Billty No:</Text>
                <Text style={styles.detailValue}>{deliveryRecord.billty_no}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Consignee:</Text>
                <Text style={styles.detailValue}>{deliveryRecord.consignee_name}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Item:</Text>
                <Text style={styles.detailValue}>{deliveryRecord.item_description}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Original Amount:</Text>
                <Text style={styles.detailValue}>₹{deliveryRecord.amount.toFixed(2)}</Text>
              </View>
            </View>

            {/* Amount Confirmation Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Confirmed Amount</Text>
              <TextInput
                style={[
                  GlobalStyles.input,
                  styles.amountInput,
                  readOnly && styles.inputDisabled,
                ]}
                value={confirmedAmount}
                onChangeText={setConfirmedAmount}
                keyboardType="numeric"
                placeholder="Enter confirmed amount"
                placeholderTextColor={Colors.placeholder}
                editable={!readOnly && !confirming}
              />
            </View>

            {/* Payment Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Type</Text>
              <View style={styles.paymentTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.paymentTypeButton,
                    paymentType === 'cash' && styles.paymentTypeButtonActive,
                    readOnly && styles.buttonDisabled,
                  ]}
                  onPress={() => !readOnly && !confirming && setPaymentType('cash')}
                  disabled={readOnly || confirming}
                >
                  <Icon 
                    name="cash-outline" 
                    size={24} 
                    color={paymentType === 'cash' ? Colors.surface : Colors.textSecondary} 
                  />
                  <Text style={[
                    styles.paymentTypeText,
                    paymentType === 'cash' && styles.paymentTypeTextActive,
                  ]}>
                    Cash
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentTypeButton,
                    paymentType === 'gpay_sapan' && styles.paymentTypeButtonActive,
                    readOnly && styles.buttonDisabled,
                  ]}
                  onPress={() => !readOnly && !confirming && setPaymentType('gpay_sapan')}
                  disabled={readOnly || confirming}
                >
                  <Icon 
                    name="phone-portrait-outline" 
                    size={24} 
                    color={paymentType === 'gpay_sapan' ? Colors.surface : Colors.textSecondary} 
                  />
                  <Text style={[
                    styles.paymentTypeText,
                    paymentType === 'gpay_sapan' && styles.paymentTypeTextActive,
                  ]}>
                    GPay{'\n'}(Sapan)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentTypeButton,
                    paymentType === 'gpay_yash' && styles.paymentTypeButtonActive,
                    readOnly && styles.buttonDisabled,
                  ]}
                  onPress={() => !readOnly && !confirming && setPaymentType('gpay_yash')}
                  disabled={readOnly || confirming}
                >
                  <Icon 
                    name="phone-portrait-outline" 
                    size={24} 
                    color={paymentType === 'gpay_yash' ? Colors.surface : Colors.textSecondary} 
                  />
                  <Text style={[
                    styles.paymentTypeText,
                    paymentType === 'gpay_yash' && styles.paymentTypeTextActive,
                  ]}>
                    GPay{'\n'}(Yash Roadlines)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bilty Photo Upload Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bilty Photo</Text>
              {loadingPhotos ? (
                <View style={styles.photoLoadingBox}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.photoLoadingText}>Loading photo...</Text>
                </View>
              ) : readOnly && biltyPhotoUrl ? (
                <TouchableOpacity
                  style={styles.photoViewBox}
                  onPress={() => setFullScreenImage(biltyPhotoUrl)}
                >
                  <Image
                    source={{ uri: biltyPhotoUrl }}
                    style={styles.photoImage}
                    resizeMode="cover"
                  />
                  <View style={styles.photoOverlay}>
                    <Icon name="expand-outline" size={32} color={Colors.surface} />
                    <Text style={styles.photoOverlayText}>Tap to view full size</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.photoUploadBox,
                    biltyPhoto && styles.photoUploadBoxWithPhoto,
                    readOnly && styles.photoUploadBoxDisabled,
                  ]}
                  onPress={() => !readOnly && !confirming && handleCapturePhoto('bilty')}
                  disabled={readOnly || confirming}
                >
                  {biltyPhoto ? (
                    <View style={styles.photoPreview}>
                      <Icon name="image" size={48} color={Colors.success} />
                      <Text style={styles.photoPreviewText}>Photo captured</Text>
                    </View>
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Icon name="camera" size={48} color={Colors.textSecondary} />
                      <Text style={styles.photoPlaceholderText}>
                        {readOnly ? 'No photo available' : 'Tap to capture'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Signature Photo Upload Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Signature Photo</Text>
              {loadingPhotos ? (
                <View style={styles.photoLoadingBox}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.photoLoadingText}>Loading photo...</Text>
                </View>
              ) : readOnly && signaturePhotoUrl ? (
                <TouchableOpacity
                  style={styles.photoViewBox}
                  onPress={() => setFullScreenImage(signaturePhotoUrl)}
                >
                  <Image
                    source={{ uri: signaturePhotoUrl }}
                    style={styles.photoImage}
                    resizeMode="cover"
                  />
                  <View style={styles.photoOverlay}>
                    <Icon name="expand-outline" size={32} color={Colors.surface} />
                    <Text style={styles.photoOverlayText}>Tap to view full size</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.photoUploadBox,
                    signaturePhoto && styles.photoUploadBoxWithPhoto,
                    readOnly && styles.photoUploadBoxDisabled,
                  ]}
                  onPress={() => !readOnly && !confirming && handleCapturePhoto('signature')}
                  disabled={readOnly || confirming}
                >
                  {signaturePhoto ? (
                    <View style={styles.photoPreview}>
                      <Icon name="image" size={48} color={Colors.success} />
                      <Text style={styles.photoPreviewText}>Photo captured</Text>
                    </View>
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Icon name="camera" size={48} color={Colors.textSecondary} />
                      <Text style={styles.photoPlaceholderText}>
                        {readOnly ? 'No photo available' : 'Tap to capture'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              {!readOnly && (
                <TouchableOpacity
                  style={[
                    GlobalStyles.buttonPrimary,
                    styles.confirmButton,
                    confirming && styles.buttonDisabled,
                  ]}
                  onPress={handleConfirm}
                  disabled={confirming}
                >
                  {confirming ? (
                    <ActivityIndicator color={Colors.surface} />
                  ) : (
                    <Text style={GlobalStyles.buttonPrimaryText}>Confirm Payment</Text>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  GlobalStyles.buttonSecondary,
                  styles.cancelButton,
                  confirming && styles.buttonDisabled,
                ]}
                onPress={onCancel}
                disabled={confirming}
              >
                <Text style={GlobalStyles.buttonSecondaryText}>
                  {readOnly ? 'Close' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
    </View>

    {/* Full Screen Image Viewer */}
    {fullScreenImage && (
      <Modal
        visible={true}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}
        statusBarTranslucent={true}
      >
        <View style={styles.fullScreenOverlay}>
          <TouchableOpacity
            style={styles.fullScreenCloseButton}
            onPress={() => setFullScreenImage(null)}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Icon name="close-circle" size={40} color={Colors.surface} />
          </TouchableOpacity>
          
          <Image
            source={{ uri: fullScreenImage }}
            style={styles.fullScreenImage}
            resizeMode="contain"
          />
          
          <TouchableOpacity
            style={styles.fullScreenTapArea}
            onPress={() => setFullScreenImage(null)}
            activeOpacity={1}
          />
        </View>
      </Modal>
    )}
    </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,        // Add karo
  elevation: 9999,   
  },
keyboardAvoidingView: {
  width: '90%',
  maxWidth: 500,
  maxHeight: '90%',  // 85% se 90% karo
},
modalContainer: {
  backgroundColor: Colors.surface,
  borderRadius: 12,
  overflow: 'hidden',
  elevation: 20,
  width: '100%',
  maxHeight: '90%',
  minHeight: 500,    // yeh add karo — proper height milegi
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.4,
  shadowRadius: 10,
},
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    width: '35%',
  },
  detailValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  amountInput: {
    marginBottom: 0,
    fontSize: 16,
  },
  inputDisabled: {
    backgroundColor: Colors.background,
    color: Colors.textSecondary,
  },
  photoUploadBox: {
    height: 120,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  photoUploadBoxWithPhoto: {
    borderColor: Colors.success,
    borderStyle: 'solid',
    backgroundColor: '#f0f9f4',
  },
  photoUploadBoxDisabled: {
    opacity: 0.6,
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  photoPreview: {
    alignItems: 'center',
  },
  photoPreviewText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.success,
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  confirmButton: {
    marginBottom: 12,
  },
  cancelButton: {
    marginTop: 0,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  paymentTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  paymentTypeButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  paymentTypeButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  paymentTypeText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  paymentTypeTextActive: {
    color: Colors.surface,
  },
  photoLoadingBox: {
    height: 200,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  photoLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  photoViewBox: {
    height: 200,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.background,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOverlayText: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.surface,
    fontWeight: '600',
  },
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  fullScreenCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    elevation: 10,
  },
  fullScreenTapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
});

export default PaymentConfirmationPopup;
