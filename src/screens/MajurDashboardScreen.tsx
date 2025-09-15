import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { getAgencyMajuri, AgencyMajuri } from '../data/Storage';
import { supabase } from '../supabase';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import Icon from 'react-native-vector-icons/Ionicons';

type MajurDashboardScreenNavigationProp = NavigationProp<RootStackParamList>;

interface MajurDashboardScreenProps {
  navigation: MajurDashboardScreenNavigationProp;
}

interface MajuriWithAgency extends AgencyMajuri {
  displayDate: string;
  isToday: boolean;
  isYesterday: boolean;
}

interface DatewiseSummary {
  date: string;
  displayDate: string;
  totalAmount: number;
  entriesCount: number;
  isToday: boolean;
  isYesterday: boolean;
}

interface PaymentData {
  majur_id: string;
  majur_name: string;
  received_amount: number;
  payment_count: number;
  last_payment_date: string | null;
}

function MajurDashboardScreen({ navigation }: MajurDashboardScreenProps): React.JSX.Element {
  const { goBack } = navigation;
  const [majuriData, setMajuriData] = useState<MajuriWithAgency[]>([]);
  const [datewiseSummary, setDatewiseSummary] = useState<DatewiseSummary[]>([]);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  // const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'all' | 'date'>('date'); // Default to date mode to show today's data
  const [dailyTotal, setDailyTotal] = useState<number>(0);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return 'आज';
    if (isYesterday) return 'कल';
    
    return date.toLocaleDateString('hi-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const loadPaymentData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ [MajurDashboard] No authenticated user found');
        return;
      }

      // Fetch current month payment totals for this majur
      const { data: paymentData, error } = await supabase
        .from('current_month_majur_totals')
        .select('*')
        .eq('majur_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ [MajurDashboard] Error fetching payment data:', error);
      } else if (paymentData) {
        console.log('💰 [MajurDashboard] Payment data loaded:', paymentData);
        setPaymentData(paymentData);
      } else {
        console.log('💰 [MajurDashboard] No payment data found for current month');
        setPaymentData(null);
      }
    } catch (error) {
      console.error('❌ [MajurDashboard] Error in loadPaymentData:', error);
    }
  }, []);

  const loadMajuriData = useCallback(async () => {
    try {
      const allMajuri: AgencyMajuri[] = await getAgencyMajuri();
      console.log('📊 [MajurDashboard] Loaded majuri data:', allMajuri.length, 'entries');
      
      // Sort by date (newest first)
      const sortedMajuri = allMajuri.sort((a, b) => 
        new Date(b.majuri_date).getTime() - new Date(a.majuri_date).getTime()
      );

      // Add display properties
      const majuriWithDisplay: MajuriWithAgency[] = sortedMajuri.map(item => {
        const date = new Date(item.majuri_date);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const isToday = date.toDateString() === today.toDateString();
        const isYesterday = date.toDateString() === yesterday.toDateString();

        return {
          ...item,
          displayDate: formatDate(item.majuri_date),
          isToday,
          isYesterday,
        };
      });

      setMajuriData(majuriWithDisplay);

      // Calculate datewise summary for last 7 days
      const last7Days = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date);
      }

      const summaryArray: DatewiseSummary[] = last7Days.map(date => {
        const dayEntries = allMajuri.filter(item => {
          const itemDate = new Date(item.majuri_date);
          return itemDate.toDateString() === date.toDateString();
        });

        const totalAmount = dayEntries.reduce((sum, item) => sum + item.amount, 0);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const isToday = date.toDateString() === today.toDateString();
        const isYesterday = date.toDateString() === yesterday.toDateString();

        return {
          date: date.toDateString(),
          displayDate: formatDate(date.toISOString()),
          totalAmount,
          entriesCount: dayEntries.length,
          isToday,
          isYesterday,
        };
      });

      setDatewiseSummary(summaryArray);

      // Calculate daily total for selected date
      const selectedDateEntries = allMajuri.filter(item => {
        const itemDate = new Date(item.majuri_date);
        return itemDate.toDateString() === selectedDate.toDateString();
      });
      const total = selectedDateEntries.reduce((sum, item) => sum + item.amount, 0);
      setDailyTotal(total);
      
      console.log('📊 [MajurDashboard] Daily total for', selectedDate.toDateString(), ':', total);

      // Load payment data
      await loadPaymentData();

    } catch (error) {
      console.error('❌ [MajurDashboard] Error loading majuri data:', error);
    }
  }, [selectedDate, loadPaymentData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMajuriData();
    setRefreshing(false);
  }, [loadMajuriData]);

  // const handleDateChange = useCallback((event: any, date?: Date) => {
  //   if (Platform.OS === 'android') {
  //     setShowDatePicker(false);
  //   }
  //   
  //   if (date) {
  //     setSelectedDate(date);
  //     setViewMode('date');
  //   }
  // }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadMajuriData().finally(() => setLoading(false));
    }, [loadMajuriData])
  );

  const filteredData = viewMode === 'all' 
    ? majuriData 
    : majuriData.filter(item => new Date(item.majuri_date).toDateString() === selectedDate.toDateString());

  const renderMajuriItem = ({ item }: { item: MajuriWithAgency }) => (
    <View style={styles.majuriCard}>
      <View style={styles.cardHeader}>
        <View style={styles.agencyInfo}>
          <Text style={styles.agencyName}>{item.agency_name}</Text>
          <Text style={styles.dateText}>{item.displayDate}</Text>
        </View>
        <Text style={styles.amountText}>₹{item.amount.toLocaleString('hi-IN')}</Text>
      </View>
      {item.description && (
        <Text style={styles.descriptionText}>{item.description}</Text>
      )}
      <View style={styles.cardFooter}>
        <Text style={styles.timeText}>
          {new Date(item.majuri_date).toLocaleTimeString('hi-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );

  const renderDateSummary = ({ item }: { item: DatewiseSummary }) => {
    const isSelected = viewMode === 'date' && selectedDate.toDateString() === item.date;
    return (
      <TouchableOpacity
        style={[
          styles.dateSummaryCard,
          isSelected && styles.selectedDateCard,
        ]}
        onPress={() => {
          if (isSelected) setViewMode('all');
          else {
            setSelectedDate(new Date(item.date));
            setViewMode('date');
          }
        }}
      >
        <View style={styles.dateSummaryHeader}>
          <Text style={[
            styles.summaryDateText,
            (item.isToday || item.isYesterday) && styles.highlightedDate,
            isSelected && { color: Colors.white },
          ]}>
            {item.displayDate}
          </Text>
          <Text style={[
            styles.summaryAmountText,
            isSelected && { color: Colors.white },
          ]}>
            ₹{item.totalAmount.toLocaleString('hi-IN')}
          </Text>
        </View>
        <Text style={[
          styles.entriesCountText,
          isSelected && { color: Colors.white },
        ]}>
          {item.entriesCount} एंट्री
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} translucent={true} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>मजूरी डेटा लोड हो रहा है...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} translucent={true} />      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>मजूर डैशबोर्ड</Text>
          {/* <TouchableOpacity 
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
          >
            <Text style={styles.dateButtonText}>
              {selectedDate.toLocaleDateString('hi-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
            <Icon name="calendar-outline" size={16} color={Colors.white} />
          </TouchableOpacity> */}
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Icon name="refresh" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Daily Total Card */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>
          {viewMode === 'date' ? `${formatDate(selectedDate.toISOString())} की मजूरी` : 'कुल मजूरी'}
        </Text>
        <Text style={styles.totalAmount}>₹{dailyTotal.toLocaleString('hi-IN')}</Text>
        <Text style={styles.totalEntries}>
          {filteredData.length} एंट्री
        </Text>
      </View>

      {/* Payment Received Card */}
      {paymentData && (
        <View style={styles.paymentCard}>
          <View style={styles.paymentHeader}>
            <Icon name="wallet-outline" size={24} color={Colors.primary} />
            <Text style={styles.paymentTitle}>इस महीने प्राप्त राशि</Text>
          </View>
          <Text style={styles.paymentAmount}>₹{paymentData.received_amount.toLocaleString('hi-IN')}</Text>
          <View style={styles.paymentDetails}>
            <Text style={styles.paymentCount}>
              {paymentData.payment_count} भुगतान
            </Text>
            {paymentData.last_payment_date && (
              <Text style={styles.lastPaymentDate}>
                अंतिम भुगतान: {formatDate(paymentData.last_payment_date)}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Date Summary Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>दिनवार सारांश</Text>
        {viewMode === 'date' && (
          <TouchableOpacity 
            onPress={() => setViewMode('all')}
            style={styles.clearFilterButton}
          >
            <Text style={styles.clearFilterText}>सभी दिखाएं</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={datewiseSummary}
        renderItem={renderDateSummary}
        keyExtractor={(item) => item.date}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dateSummaryList}
        contentContainerStyle={styles.dateSummaryContent}
      />

      {/* Majuri Entries */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {viewMode === 'all' ? 'सभी मजूरी एंट्री' : `${formatDate(selectedDate.toISOString())} की मजूरी`}
        </Text>
      </View>

      <FlatList
        data={filteredData}
        renderItem={renderMajuriItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.majuriList}
        contentContainerStyle={styles.majuriListContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="document-text-outline" size={64} color={Colors.lightGray} />
            <Text style={styles.emptyText}>कोई मजूरी एंट्री नहीं मिली</Text>
          </View>
        }
      />

      {/* Date Picker */}
      {/* {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          is24Hour={true}
          display="default"
          onChange={handleDateChange}
        />
      )} */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.darkGray,
  },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateButtonText: {
    color: Colors.white,
    fontSize: 12,
    marginRight: 4,
  },
  refreshButton: {
    padding: 8,
  },
  totalCard: {
    backgroundColor: Colors.white,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  paymentCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkGray,
    marginLeft: 8,
  },
  paymentAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  paymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentCount: {
    fontSize: 14,
    color: Colors.mediumGray,
    fontWeight: '500',
  },
  lastPaymentDate: {
    fontSize: 12,
    color: Colors.mediumGray,
    fontStyle: 'italic',
  },
  totalLabel: {
    fontSize: 16,
    color: Colors.darkGray,
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.success,
    marginBottom: 4,
  },
  totalEntries: {
    fontSize: 14,
    color: Colors.mediumGray,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkGray,
  },
  clearFilterButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearFilterText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  dateSummaryList: {
    flexGrow: 0,
  },
  dateSummaryContent: {
    paddingHorizontal: 16,
  },
  dateSummaryCard: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 10,
    marginRight: 12,
    minWidth: 120,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedDateCard: {
    backgroundColor: Colors.primary,
  },
  dateSummaryHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkGray,
    marginBottom: 4,
  },
  highlightedDate: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  summaryAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.success,
  },
  entriesCountText: {
    fontSize: 12,
    color: Colors.mediumGray,
    textAlign: 'center',
  },
  majuriList: {
    flex: 1,
  },
  majuriListContent: {
    padding: 16,
  },
  majuriCard: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  agencyInfo: {
    flex: 1,
  },
  agencyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkGray,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.success,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.mediumGray,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  timeText: {
    fontSize: 12,
    color: Colors.mediumGray,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.mediumGray,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default MajurDashboardScreen;
