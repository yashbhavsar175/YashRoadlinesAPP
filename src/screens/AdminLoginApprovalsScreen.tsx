// AdminLoginApprovalsScreen.tsx - Screen for admins to approve login requests
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import { supabase } from '../supabase';
import Icon from 'react-native-vector-icons/Ionicons';
import CommonHeader from '../components/CommonHeader';

type AdminLoginApprovalsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AdminLoginApprovals'
>;

interface AdminLoginApprovalsScreenProps {
  navigation: AdminLoginApprovalsScreenNavigationProp;
}

interface LoginRequest {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  otp_code?: string;
  created_at: string;
  expires_at: string;
}

function AdminLoginApprovalsScreen({ navigation }: AdminLoginApprovalsScreenProps): React.JSX.Element {
  const [requests, setRequests] = useState<LoginRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');

  const fetchLoginRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('login_requests')
        .select('*')
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching login requests:', error);
      Alert.alert('Error', 'Failed to load login requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLoginRequests();

    // Set up real-time subscription
    const subscription = supabase
      .channel('login_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'login_requests',
        },
        (payload) => {
          console.log('Login request change:', payload);
          fetchLoginRequests();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchLoginRequests]);

  const handleApprove = async (requestId: string) => {
    if (!otpInput.trim() || otpInput.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter a 6-digit OTP code');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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

      if (error) throw error;

      Alert.alert('Success', 'Login request approved! User can now login with the OTP.');
      setSelectedRequest(null);
      setOtpInput('');
      fetchLoginRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      Alert.alert('Error', 'Failed to approve login request');
    }
  };

  const handleReject = async (requestId: string) => {
    Alert.alert(
      'Reject Login Request',
      'Are you sure you want to reject this login request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('login_requests')
                .update({
                  status: 'rejected',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', requestId);

              if (error) throw error;

              Alert.alert('Success', 'Login request rejected');
              fetchLoginRequests();
            } catch (error) {
              console.error('Error rejecting request:', error);
              Alert.alert('Error', 'Failed to reject login request');
            }
          },
        },
      ]
    );
  };

  const getTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const renderRequest = ({ item }: { item: LoginRequest }) => {
    const isExpired = new Date(item.expires_at) < new Date();
    const isSelected = selectedRequest === item.id;
    const isPending = item.status === 'pending';

    return (
      <View style={[styles.requestCard, isExpired && styles.expiredCard]}>
        <View style={styles.requestHeader}>
          <View style={styles.userInfo}>
            <Icon name="person-circle-outline" size={40} color={Colors.primary} />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{item.user_name || 'Unknown User'}</Text>
              <Text style={styles.userEmail}>{item.user_email}</Text>
            </View>
          </View>
          <View style={styles.statusBadge}>
            <Text style={[
              styles.statusText,
              item.status === 'approved' && styles.approvedText,
              item.status === 'rejected' && styles.rejectedText,
              isExpired && styles.expiredText,
            ]}>
              {isExpired ? 'EXPIRED' : item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.requestInfo}>
          <Text style={styles.timeText}>
            <Icon name="time-outline" size={14} /> {getTimeAgo(item.created_at)}
          </Text>
          {item.status === 'approved' && item.otp_code && (
            <Text style={styles.otpDisplay}>
              OTP: <Text style={styles.otpCode}>{item.otp_code}</Text>
            </Text>
          )}
        </View>

        {isPending && !isExpired && (
          <View style={styles.actionContainer}>
            {isSelected ? (
              <View style={styles.otpInputContainer}>
                <TextInput
                  style={styles.otpInput}
                  placeholder="Enter 6-digit OTP"
                  value={otpInput}
                  onChangeText={setOtpInput}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                <View style={styles.otpActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    onPress={() => handleApprove(item.id)}
                  >
                    <Icon name="checkmark" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => {
                      setSelectedRequest(null);
                      setOtpInput('');
                    }}
                  >
                    <Icon name="close" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => setSelectedRequest(item.id)}
                >
                  <Icon name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Set OTP</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleReject(item.id)}
                >
                  <Icon name="close-circle-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <View style={GlobalStyles.container}>
        <CommonHeader title="Login Approvals" navigation={navigation} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={GlobalStyles.container}>
      <CommonHeader title="Login Approvals" navigation={navigation} />
      
      {pendingCount > 0 && (
        <View style={styles.pendingBanner}>
          <Icon name="notifications-outline" size={24} color={Colors.error} />
          <Text style={styles.pendingText}>
            {pendingCount} pending login request{pendingCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <FlatList
        data={requests}
        renderItem={renderRequest}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchLoginRequests();
            }}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="checkmark-done-circle-outline" size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>No pending login requests</Text>
            <Text style={styles.emptySubtext}>
              You'll be notified when someone tries to login
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    padding: 12,
    gap: 8,
  },
  pendingText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
  },
  requestCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expiredCard: {
    opacity: 0.6,
    backgroundColor: Colors.backgroundSecondary,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.warning,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  approvedText: {
    color: Colors.success,
  },
  rejectedText: {
    color: Colors.error,
  },
  expiredText: {
    color: Colors.textSecondary,
  },
  requestInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  otpDisplay: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  otpCode: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 2,
  },
  actionContainer: {
    marginTop: 8,
  },
  otpInputContainer: {
    gap: 12,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: '600',
  },
  otpActions: {
    flexDirection: 'row',
    gap: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: Colors.success,
  },
  rejectButton: {
    backgroundColor: Colors.error,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  cancelButton: {
    backgroundColor: Colors.textSecondary,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default AdminLoginApprovalsScreen;
