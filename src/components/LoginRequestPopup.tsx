// LoginRequestPopup.tsx - Real-time popup for login requests
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { supabase } from '../supabase';

interface LoginRequestPopupProps {
  visible: boolean;
  requestId: string;
  userName: string;
  userEmail: string;
  onClose: () => void;
  onApproved: () => void;
}

export const LoginRequestPopup: React.FC<LoginRequestPopupProps> = ({
  visible,
  requestId,
  userName,
  userEmail,
  onClose,
  onApproved,
}) => {
  const [step, setStep] = useState<'confirm' | 'otp'>('confirm');
  const [otpInput, setOtpInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReject = async () => {
    Alert.alert(
      'Reject Login Request',
      `Are you sure you want to reject ${userName}'s login request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('login_requests')
                .update({
                  status: 'rejected',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', requestId);

              if (error) throw error;

              Alert.alert('Rejected', 'Login request has been rejected');
              onClose();
            } catch (error) {
              console.error('Error rejecting request:', error);
              Alert.alert('Error', 'Failed to reject login request');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAccept = () => {
    setStep('otp');
  };

  const handleApprove = async () => {
    if (!otpInput.trim() || otpInput.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter a 6-digit OTP code');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('📝 Approving login request with OTP:', otpInput.trim());

      const { error } = await supabase
        .from('login_requests')
        .update({
          status: 'approved',
          otp_code: otpInput.trim(),
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) {
        console.error('❌ Database update error:', error);
        throw error;
      }

      console.log('✅ Login request approved successfully');
      Alert.alert('Success', `${userName} can now login with OTP: ${otpInput.trim()}`);
      onApproved();
      onClose();
      
      // Reset state
      setStep('confirm');
      setOtpInput('');
    } catch (error) {
      console.error('❌ Error approving request:', error);
      Alert.alert('Error', 'Failed to approve login request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('confirm');
    setOtpInput('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.popup}>
          {/* Header */}
          <View style={styles.header}>
            <Icon name="lock-closed" size={40} color={Colors.primary} />
            <Text style={styles.title}>New Login Request</Text>
          </View>

          {/* User Info */}
          <View style={styles.userInfo}>
            <Icon name="person-circle-outline" size={60} color={Colors.textSecondary} />
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userEmail}>{userEmail}</Text>
          </View>

          {step === 'confirm' ? (
            /* Step 1: Accept/Reject */
            <>
              <Text style={styles.message}>
                This user is requesting access to the application. Do you want to approve this login?
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.rejectButton]}
                  onPress={handleReject}
                  disabled={loading}
                >
                  <Icon name="close-circle" size={24} color="#fff" />
                  <Text style={styles.buttonText}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.acceptButton]}
                  onPress={handleAccept}
                  disabled={loading}
                >
                  <Icon name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.buttonText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            /* Step 2: Enter OTP */
            <>
              <Text style={styles.message}>
                Enter a 6-digit OTP code that the user will use to complete their login.
              </Text>

              <View style={styles.otpContainer}>
                <Text style={styles.otpLabel}>OTP Code</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="Enter 6-digit OTP"
                  placeholderTextColor={Colors.placeholder}
                  value={otpInput}
                  onChangeText={setOtpInput}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                <Text style={styles.otpHint}>
                  Example: 123456
                </Text>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setStep('confirm')}
                  disabled={loading}
                >
                  <Icon name="arrow-back" size={24} color="#fff" />
                  <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.approveButton, loading && styles.disabledButton]}
                  onPress={handleApprove}
                  disabled={loading || otpInput.length !== 6}
                >
                  <Icon name="checkmark-done" size={24} color="#fff" />
                  <Text style={styles.buttonText}>
                    {loading ? 'Approving...' : 'Approve'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popup: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 12,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  message: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  otpContainer: {
    marginBottom: 24,
  },
  otpLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  otpInput: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  otpHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: Colors.error,
  },
  acceptButton: {
    backgroundColor: Colors.success,
  },
  cancelButton: {
    backgroundColor: Colors.textSecondary,
  },
  approveButton: {
    backgroundColor: Colors.primary,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
