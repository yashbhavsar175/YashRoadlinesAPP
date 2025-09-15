// HistoryScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, Text, TouchableOpacity, FlatList, ActivityIndicator, StatusBar, Platform, RefreshControl } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { getHistoryLogs, HistoryLog, syncAllDataFixed } from '../data/Storage';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from '../supabase';

type HistoryScreenNavigationProp = NavigationProp<RootStackParamList, 'History'>;

interface HistoryScreenProps {
  navigation: HistoryScreenNavigationProp;
}

const formatLogDetails = (details: any) => {
  if (!details) return 'No details available.';
  const data = details.deleted_data || details;
  return Object.keys(data).map(key => {
    if (key === 'created_at' || key === 'updated_at' || key === 'id' || key === 'created_by') {
      return '';
    }
    return `• ${key}: ${JSON.stringify(data[key])}`;
  }).join('\n');
};

const formatActionText = (action: string, table: string) => {
  const actionText = action.toUpperCase();
  const tableText = table.replace(/_/g, ' ');
  return `${actionText} on ${tableText}`;
};

function HistoryScreen({ navigation }: HistoryScreenProps): React.JSX.Element {
  const { goBack } = navigation;
  
  // Admin check
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminLoading, setAdminLoading] = useState<boolean>(true);
  
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Check admin status on mount
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert('Access Denied', 'Please login to access this feature.');
          goBack();
          return;
        }
        
        const ADMIN_EMAIL = 'yashbhavsar175@gmail.com';
        const isUserAdmin = user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        
        if (!isUserAdmin) {
          Alert.alert('Access Denied', 'This feature is only available to administrators.');
          goBack();
          return;
        }
        
        setIsAdmin(true);
      } catch (error) {
        console.error('Error checking admin access:', error);
        Alert.alert('Error', 'Failed to verify access permissions.');
        goBack();
      } finally {
        setAdminLoading(false);
      }
    };
    
    checkAdminAccess();
  }, [goBack]);

  const loadHistory = useCallback(async (dateToLoad: Date) => {
    setLoading(true);
    try {
      const logs = await getHistoryLogs();
      const filteredLogs = logs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate.toDateString() === dateToLoad.toDateString();
      });
      setHistoryLogs(filteredLogs);
    } catch (error) {
      console.error("Error loading history logs:", error);
      Alert.alert('Error', 'Failed to load history logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory(selectedDate);
      return () => {};
    }, [loadHistory, selectedDate])
  );
  
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await syncAllDataFixed();
    } catch (error) {
      console.error('Sync failed:', error);
    }
    await loadHistory(selectedDate);
  };
  
  const handleDateChange = (event: any, newDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (newDate) {
      setSelectedDate(newDate);
    }
  };

  const renderLogItem = ({ item }: { item: HistoryLog }) => (
    <View style={GlobalStyles.card}>
      <View style={styles.logHeader}>
        <Text style={[styles.actionText, item.action === 'add' ? styles.addText : styles.deleteText]}>
          {formatActionText(item.action, item.table_name)}
        </Text>
        <Text style={styles.logDate}>{new Date(item.created_at).toLocaleString()}</Text>
      </View>
      <View style={styles.logBody}>
        <Text style={styles.userName}>
          <Text style={{ fontWeight: 'bold' }}>User:</Text> {item.user_name}
        </Text>
        <Text style={styles.logDetails}>
          <Text style={{ fontWeight: 'bold' }}>Record ID:</Text> {item.record_id}
        </Text>
        <Text style={styles.logDetails}>
          <Text style={{ fontWeight: 'bold' }}>Details:</Text>
          {'\n'}{formatLogDetails(item.details)}
        </Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={[GlobalStyles.card, styles.emptyStateCard]}>
      <Icon name="archive-outline" size={48} color={Colors.textSecondary} style={styles.emptyIcon} />
      <Text style={[GlobalStyles.title, styles.emptyStateTitle]}>No History Found</Text>
      <Text style={[GlobalStyles.bodyText, styles.emptyStateText]}>
        It looks like no actions have been logged yet for this date.
      </Text>
      <TouchableOpacity
        onPress={handleRefresh}
        style={GlobalStyles.buttonPrimary}
      >
        <Text style={GlobalStyles.buttonPrimaryText}>Refresh Data</Text>
      </TouchableOpacity>
    </View>
  );

  // Show loading screen while checking admin access
  if (adminLoading) {
    return (
      <View style={[GlobalStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.loadingText, { marginTop: 10 }]}>Verifying access...</Text>
      </View>
    );
  }

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <View style={GlobalStyles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Access Denied</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>
    );
  }

  return (
    <View style={GlobalStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History Log</Text>
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
          <Text style={styles.datePickerButtonText}>{selectedDate.toLocaleDateString('en-IN')}</Text>
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : (
        <FlatList
          data={historyLogs}
          renderItem={renderLogItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
          }
        />
      )}

      <TouchableOpacity onPress={goBack} style={[GlobalStyles.buttonPrimary, styles.bottomBackButton]}>
        <Text style={GlobalStyles.buttonPrimaryText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    height: 56 + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0),
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    color: Colors.surface,
    fontWeight: 'bold',
    fontSize: 20,
    flex: 1,
    textAlign: 'center',
    marginRight: 32,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonText: {
    color: Colors.surface,
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 32,
  },
  listContent: {
    paddingVertical: 20,
    paddingHorizontal: 12,
    flexGrow: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  addText: {
    color: Colors.success,
  },
  deleteText: {
    color: Colors.error,
  },
  logDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  logBody: {
    //
  },
  userName: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 5,
  },
  logDetails: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  emptyStateCard: {
    marginHorizontal: 0,
    alignItems: 'center',
    paddingVertical: 30,
    marginTop: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    marginBottom: 10,
  },
  emptyStateText: {
    textAlign: 'center',
    marginBottom: 20,
  },
  bottomBackButton: {
    backgroundColor: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 16,
    marginHorizontal: 12,
  },
  datePickerButton: {
    backgroundColor: Colors.primaryDark,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  datePickerButtonText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default HistoryScreen;