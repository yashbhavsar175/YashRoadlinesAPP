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

  // Initialize state when modal opens
  useEffect(() => {
    if (visible && deliveryRecord) {
      // Pre-fill with original amount
      setConfirmedAmount(deliveryRecord.amount.toString());
      
      // If read-only mode, we might want to load existing photos
      // This will be implemented when photo loading is added
      if (readOnly) {
        // TODO: Load existing photos from deliveryRecord
      } else {
        // Reset photos for new confirmation
        setBiltyPhoto(null);
        setSignaturePhoto(null);
      }
      // Debugging log to confirm modal visibility state
      console.log(
        'PaymentConfirmationPopup: Modal visibility changed to',
        visible,
        'for record', deliveryRecord.id
      );
    }
  }, [visible, deliveryRecord, readOnly]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setConfirmedAmount('');
      setBiltyPhoto(null);
      setSignaturePhoto(null);
      setConfirming(false);
    }
  }, [visible]);

  /**
   * Task 9.4: Handle photo capture
   * Opens camera or library to capture photo
   * Validates: Requirements 4.1, 4.2, 4.4, 10.6
   */
  const handleCapturePhoto = async (type: 'bilty' | 'signature') => {
    try {
      // Show action sheet to choose camera or library
      const photoManager = PhotoManager;
      
      // For now, we'll use camera by default
      // In a production app, you'd show an action sheet to let user choose
      const photoData = await photoManager.capturePhoto({
        source: 'camera',
        quality: 0.7,
        maxWidth: 1920,
      });

      // Update state with captured photo
      if (type === 'bilty') {
        setBiltyPhoto(photoData);
      } else {
        setSignaturePhoto(photoData);
      }
    } catch (error) {
      // Use AlertContext for all error messages (Requirement 10.6)
      if (error instanceof Error) {
        if (error.message !== 'Photo capture cancelled') {
          showAlert(error.message);
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

            {/* Bilty Photo Upload Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bilty Photo</Text>
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
                      {readOnly ? 'No photo' : 'Tap to capture'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Signature Photo Upload Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Signature Photo</Text>
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
                      {readOnly ? 'No photo' : 'Tap to capture'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
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
});

export default PaymentConfirmationPopup;
