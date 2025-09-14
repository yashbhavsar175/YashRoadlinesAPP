import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { getAgencyMajuri, AgencyMajuri } from '../data/Storage';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import Icon from 'react-native-vector-icons/Ionicons';

interface MajurHomeContentProps {
  navigation: NavigationProp<RootStackParamList>;
}

interface MajuriWithAgency extends AgencyMajuri {
  displayDate: string;
  isToday: boolean;
}

interface DatewiseSummary {
  date: string;
  displayDate: string;
  totalAmount: number;
  entriesCount: number;
  isToday: boolean;
  isYesterday: boolean;
}

function MajurHomeContent({ navigation }: MajurHomeContentProps): React.JSX.Element {
  const { navigate } = navigation;
  const [majuriData, setMajuriData] = useState<MajuriWithAgency[]>([]);
  const [dailySummary, setDailySummary] = useState<DatewiseSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [todayTotal, setTodayTotal] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string>('');

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

  const loadMajuriData = useCallback(async () => {
    try {
      const allMajuri: AgencyMajuri[] = await getAgencyMajuri();
      
      // Sort by date (newest first)
      const sortedMajuri = allMajuri.sort((a, b) => 
        new Date(b.majuri_date).getTime() - new Date(a.majuri_date).getTime()
      );

      // Filter today's entries
      const today = new Date();
      const todayEntries = sortedMajuri.filter(item => {
        const itemDate = new Date(item.majuri_date);
        return itemDate.toDateString() === today.toDateString();
      });

      // Add display properties for today's entries
      const majuriWithDisplay: MajuriWithAgency[] = todayEntries.map(item => {
        const date = new Date(item.majuri_date);
        const isToday = date.toDateString() === today.toDateString();

        return {
          ...item,
          displayDate: formatDate(item.majuri_date),
          isToday,
        };
      });

      setMajuriData(majuriWithDisplay);

      // Calculate daily summaries for last 7 days
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

      setDailySummary(summaryArray);

      // Calculate today's total
      const todayAmount = todayEntries.reduce((sum, item) => sum + item.amount, 0);
      setTodayTotal(todayAmount);

    } catch (error) {
      console.error('Error loading majuri data:', error);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMajuriData();
    setRefreshing(false);
  }, [loadMajuriData]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadMajuriData().finally(() => setLoading(false));
    }, [loadMajuriData])
  );

  const renderMajuriItem = ({ item }: { item: MajuriWithAgency }) => (
    <View style={styles.majuriCard}>
      <View style={styles.cardHeader}>
        <View style={styles.agencyInfo}>
          <Text style={styles.agencyName}>{item.agency_name}</Text>
          <Text style={styles.timeText}>
            {new Date(item.majuri_date).toLocaleTimeString('hi-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <Text style={styles.amountText}>₹{item.amount.toLocaleString('hi-IN')}</Text>
      </View>
      {item.description && (
        <Text style={styles.descriptionText}>{item.description}</Text>
      )}
    </View>
  );

  const renderDateSummary = ({ item }: { item: DatewiseSummary }) => (
    <View style={[
      styles.dateSummaryCard,
      item.isToday && styles.todayCard,
    ]}>
      <Text style={[
        styles.summaryDateText,
        item.isToday && styles.todayDateText,
      ]}>
        {item.displayDate}
      </Text>
      <Text style={[
        styles.summaryAmountText,
        item.isToday && styles.todayAmountText,
      ]}>
        ₹{item.totalAmount.toLocaleString('hi-IN')}
      </Text>
      <Text style={styles.entriesCountText}>
        {item.entriesCount} एंट्री
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>मजूरी डेटा लोड हो रहा है...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Today's Total Card */}
      <View style={styles.todayTotalCard}>
        <View style={styles.todayHeader}>
          <Icon name="today-outline" size={24} color={Colors.white} />
          <Text style={styles.todayLabel}>आज की कुल मजूरी</Text>
        </View>
        <Text style={styles.todayAmount}>₹{todayTotal.toLocaleString('hi-IN')}</Text>
        <Text style={styles.todayEntries}>
          {majuriData.length} एंट्री आज
        </Text>
      </View>

      {/* Weekly Summary */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>साप्ताहिक सारांश</Text>
        <TouchableOpacity 
          onPress={() => navigate('MajurDashboard')}
          style={styles.viewAllButton}
        >
          <Text style={styles.viewAllText}>सभी देखें</Text>
          <Icon name="chevron-forward" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={dailySummary}
        renderItem={renderDateSummary}
        keyExtractor={(item) => item.date}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dateSummaryList}
        contentContainerStyle={styles.dateSummaryContent}
      />

      {/* Today's Entries */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>आज की मजूरी एंट्री</Text>
      </View>

      <FlatList
        data={majuriData}
        renderItem={renderMajuriItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.majuriList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="document-text-outline" size={64} color={Colors.lightGray} />
            <Text style={styles.emptyText}>आज कोई मजूरी एंट्री नहीं मिली</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.darkGray,
    textAlign: 'center',
  },
  todayTotalCard: {
    backgroundColor: Colors.primary,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  todayLabel: {
    fontSize: 16,
    color: Colors.white,
    marginLeft: 8,
    fontWeight: '600',
  },
  todayAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  todayEntries: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
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
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 1,
  },
  viewAllText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  dateSummaryList: {
    flexGrow: 0,
    marginBottom: 8,
  },
  dateSummaryContent: {
    paddingHorizontal: 16,
  },
  dateSummaryCard: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 10,
    marginRight: 12,
    minWidth: 100,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    alignItems: 'center',
  },
  todayCard: {
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  summaryDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkGray,
    marginBottom: 8,
  },
  todayDateText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  summaryAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.success,
    marginBottom: 4,
  },
  todayAmountText: {
    color: Colors.primary,
  },
  entriesCountText: {
    fontSize: 12,
    color: Colors.mediumGray,
  },
  majuriList: {
    flex: 1,
    paddingHorizontal: 16,
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
  timeText: {
    fontSize: 12,
    color: Colors.mediumGray,
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.success,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.mediumGray,
    fontStyle: 'italic',
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

export default MajurHomeContent;
