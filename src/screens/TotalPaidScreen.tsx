// src/screens/TotalPaidScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity, StatusBar, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import { getAgencyPaymentsLocal, syncAllDataFixed, getAgencyEntry, AgencyPayment, AgencyEntry, clearPaymentCache } from '../data/Storage';
import { useAlert } from '../context/AlertContext';
import { supabase } from '../supabase';
import Icon from 'react-native-vector-icons/Ionicons';
import { GestureHandlerRootView, LongPressGestureHandler, State } from 'react-native-gesture-handler';

type TotalPaidScreenNavigationProp = NavigationProp<RootStackParamList, 'TotalPaid'>;

interface TotalPaidScreenProps {
  navigation: TotalPaidScreenNavigationProp;
}

interface DailyPaidSummary {
    date: string;
    total_paid_amount: number;
    total_delivery_amount: number;
    cash_adjustment: number;
    total_combined_amount: number;
    payments: AgencyPayment[];
    deliveries: AgencyEntry[];
}

function TotalPaidScreen({ navigation }: TotalPaidScreenProps): React.JSX.Element {
  const { goBack } = navigation;
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [dailySummaries, setDailySummaries] = useState<DailyPaidSummary[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const loadCashAdjustments = async (dates: string[]) => {
    const dateKeys = dates.map(date => {
      const [d, m, y] = date.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    });
    
    const { data, error } = await supabase
      .from('daily_cash_adjustments')
      .select('*')
      .in('date_key', dateKeys);
      
    if (error) {
      console.error('Error fetching cash adjustments:', error);
      return new Map<string, number>();
    }
    
    const adjustments = new Map<string, number>();
    data?.forEach(item => {
      const date = new Date(item.date_key);
      const formattedDate = date.toLocaleDateString('en-IN');
      adjustments.set(formattedDate, item.adjustment);
    });
    
    return adjustments;
  };

  const loadPaidData = useCallback(async (forceClearCache = false) => {
    setLoading(true);
    try {
      // Clear cache if requested to get fresh data
      if (forceClearCache) {
        console.log('🔄 Force clearing cache for fresh data...');
        await clearPaymentCache();
      }
      
      const allPayments = await getAgencyPaymentsLocal();
      const allAgencyEntries = await getAgencyEntry();
      
      console.log('📊 Total Paid Data:', {
        paymentsCount: allPayments.length,
        entriesCount: allAgencyEntries.length,
        sampledPayment: allPayments[0],
        sampledEntry: allAgencyEntries[0]
      });
      
      const paymentsMap = new Map<string, AgencyPayment[]>();
      const deliveriesMap = new Map<string, AgencyEntry[]>();
      
      // Process payments and remove duplicates by ID
      const uniquePayments = allPayments.filter((payment, index, self) => 
        index === self.findIndex(p => p.id === payment.id)
      );
      
      uniquePayments.forEach(payment => {
        const paymentDate = new Date(payment.payment_date).toLocaleDateString('en-IN');
        const currentPayments = paymentsMap.get(paymentDate) || [];
        paymentsMap.set(paymentDate, [...currentPayments, payment]);
      });

      // Filter Mumbai deliveries and remove duplicates by ID
      const mumbaiDeliveries = allAgencyEntries.filter(entry => 
        entry.agency_name === 'Mumbai' && 
        entry.delivery_status === 'yes' && 
        entry.entry_type === 'credit'
      );
      
      // Remove duplicates by ID
      const uniqueDeliveries = mumbaiDeliveries.filter((entry, index, self) => 
        index === self.findIndex(e => e.id === entry.id)
      );
      
      uniqueDeliveries.forEach(entry => {
        const entryDate = new Date(entry.entry_date).toLocaleDateString('en-IN');
        const currentDeliveries = deliveriesMap.get(entryDate) || [];
        deliveriesMap.set(entryDate, [...currentDeliveries, entry]);
      });
      
      const allDates = [...new Set([...paymentsMap.keys(), ...deliveriesMap.keys()])];
      
      // Get cash adjustments for all dates at once
      const cashAdjustmentMap = await loadCashAdjustments(allDates);

      // Sort dates in descending order
      allDates.sort((a, b) => {
        const dateA = new Date(a.split('/').reverse().join('-')).getTime();
        const dateB = new Date(b.split('/').reverse().join('-')).getTime();
        return dateB - dateA;
      });

      const summaries = allDates.map(date => {
        const paymentsOnDate = (paymentsMap.get(date) || [])
          .filter((payment, index, self) => 
            index === self.findIndex(p => p.id === payment.id)
          );
        const deliveriesOnDate = (deliveriesMap.get(date) || [])
          .filter((delivery, index, self) => 
            index === self.findIndex(d => d.id === delivery.id)
          );
        const cashAdjustment = cashAdjustmentMap.get(date) || 0;
        const totalPaid = paymentsOnDate.reduce((sum, p) => sum + p.amount, 0);
        const totalDelivery = deliveriesOnDate.reduce((sum, d) => d.entry_type === 'credit' ? sum + d.amount : sum - d.amount, 0);
        
        return {
          date: date,
          total_paid_amount: totalPaid,
          total_delivery_amount: totalDelivery,
          cash_adjustment: cashAdjustment,
          total_combined_amount: totalPaid + totalDelivery + cashAdjustment,
          payments: paymentsOnDate,
          deliveries: deliveriesOnDate,
        };
      });
      
      setDailySummaries(summaries);
    } catch (error) {
      console.error("Error loading paid data:", error);
      showAlert('Failed to load paid data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPaidData(true); // Force clear cache on focus
      return () => {};
    }, [loadPaidData])
  );
  
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await syncAllDataFixed();
      // Force clear cache and reload fresh data
      await loadPaidData(true);
      showAlert('Data synced successfully');
    } catch (error) {
      console.error('Sync failed:', error);
      showAlert('Sync failed. Using local data');
    }
  };
  
  const handleItemPress = (date: string) => {
    setExpandedDate(expandedDate === date ? null : date);
  };
  
  const renderDailySummaryItem = ({ item }: { item: DailyPaidSummary }) => (
    <View style={styles.summaryContainer}>
      <TouchableOpacity onPress={() => handleItemPress(item.date)} activeOpacity={0.8}>
        <View style={styles.dailySummaryItem}>
          <View style={styles.dateAndDayContainer}>
            <Text style={styles.dailyDateText}>{item.date}</Text>
            <Text style={styles.dayOfWeekText}>{new Date(item.date.split('/').reverse().join('-')).toLocaleString('en-IN', { weekday: 'long' })}</Text>
          </View>
          <View style={styles.rightContent}>
            <View style={styles.amountContainer}>
              <Text style={styles.totalAmountText}>₹{item.total_combined_amount.toLocaleString('en-IN')}</Text>
              <View style={styles.amountBadges}>
                {item.total_delivery_amount > 0 && (
                  <Text style={styles.deliveryBadge}>
                    Delivery
                  </Text>
                )}
                {item.cash_adjustment !== 0 && (
                  <Text style={[
                    styles.cashAdjustmentBadge,
                    item.cash_adjustment > 0 ? styles.creditBadge : styles.debitBadge
                  ]}>
                    {item.cash_adjustment > 0 ? 'Cash Add' : 'Cash Minus'}
                  </Text>
                )}
              </View>
            </View>
            <Icon
              name={expandedDate === item.date ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={20}
              color={Colors.textSecondary}
              style={{ marginLeft: 5, alignSelf: 'center' }}
            />
          </View>
        </View>
      </TouchableOpacity>

      {expandedDate === item.date && (
        <View style={styles.expandedSection}>
          <Text style={styles.expandedSectionTitle}>Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Paid:</Text>
            <Text style={styles.detailAmount}>₹{item.total_paid_amount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Sapan Delivery:</Text>
            <Text style={[styles.detailAmount, styles.deliveryAmount]}>
              ₹{item.total_delivery_amount.toLocaleString('en-IN')}
            </Text>
          </View>
          {item.cash_adjustment !== 0 && (
            <View style={[styles.detailRow, styles.cashAdjustmentRow]}>
              <Text style={styles.detailLabel}>
                {item.cash_adjustment > 0 ? 'Cash Add' : 'Cash Minus'}:
              </Text>
              <Text style={[
                styles.detailAmount, 
                item.cash_adjustment > 0 ? styles.creditAmount : styles.debitAmount
              ]}>
                {item.cash_adjustment > 0 ? '+' : '-'}₹{Math.abs(item.cash_adjustment).toLocaleString('en-IN')}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
  
  const renderEmptyState = () => (
    <View style={[GlobalStyles.card, styles.emptyStateCard]}>
      <Icon name="cash-outline" size={60} color={Colors.textSecondary} style={styles.emptyIcon} />
      <Text style={[GlobalStyles.title, styles.emptyStateTitle]}>No Payments Found</Text>
      <Text style={[GlobalStyles.bodyText, styles.emptyStateText]}>
        There are no payments recorded for any agencies yet.
      </Text>
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={GlobalStyles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Total Paid</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading paid data...</Text>
          </View>
        ) : (
          <FlatList
            data={dailySummaries}
            renderItem={renderDailySummaryItem}
            keyExtractor={(item) => item.date}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
            ListEmptyComponent={renderEmptyState}
          />
        )}

        <TouchableOpacity onPress={goBack} style={[GlobalStyles.buttonPrimary, styles.bottomBackButton]}>
          <Text style={GlobalStyles.buttonPrimaryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  listContent: {
    paddingVertical: 20,
    paddingHorizontal: 12,
    flexGrow: 1,
  },
  summaryContainer: {
    marginHorizontal: 0,
    marginBottom: 10,
    backgroundColor: Colors.surface,
    borderRadius: GlobalStyles.card.borderRadius,
    elevation: GlobalStyles.card.elevation,
    shadowColor: GlobalStyles.card.shadowColor,
    shadowOffset: GlobalStyles.card.shadowOffset,
    shadowOpacity: GlobalStyles.card.shadowOpacity,
    shadowRadius: GlobalStyles.card.shadowRadius,
  },
  dailySummaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  dateAndDayContainer: {
    flexDirection: 'column',
  },
  dailyDateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  dayOfWeekText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountBadges: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  deliveryBadge: {
    fontSize: 11,
    backgroundColor: '#e3f2fd',
    color: '#1565c0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    fontWeight: '500',
  },
  cashAdjustmentBadge: {
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    fontWeight: '500',
  },
  deliveryAmount: {
    color: '#1565c0',
    fontWeight: '600',
  },
  creditBadge: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  debitBadge: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  totalAmountText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.success,
  },
  expandedSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  expandedSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cashAdjustmentRow: {
    backgroundColor: 'rgba(255, 243, 224, 0.5)',
    padding: 6,
    borderRadius: 4,
    marginTop: 4,
  },
  creditAmount: {
    color: '#2e7d32',
  },
  debitAmount: {
    color: '#d32f2f',
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  detailAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  emptyStateCard: {
    alignItems: 'center',
    paddingVertical: 30,
    marginTop: 10,
    marginHorizontal: 0,
  },
  emptyIcon: {
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
    marginBottom: 16,
    marginHorizontal: 12,
  },
});

export default TotalPaidScreen;