// DriverStatementScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, StatusBar, RefreshControl } from 'react-native';
import { Text } from 'react-native';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { getDriverTransactions, DriverTransaction, syncAllDataFixed } from '../data/Storage';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import { GestureHandlerRootView, LongPressGestureHandler, State } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';

type DriverStatementScreenNavigationProp = NavigationProp<RootStackParamList, 'DriverStatement'>;

interface DriverStatementScreenProps {
  navigation: DriverStatementScreenNavigationProp;
}

const DriverStatementScreen = ({ navigation }: DriverStatementScreenProps): React.JSX.Element => {
  const { goBack } = navigation;
  const [driverTransactions, setDriverTransactions] = useState<DriverTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const transactions = await getDriverTransactions();
      setDriverTransactions(transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (error) {
      console.error('Error loading driver transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
      return () => {};
    }, [loadTransactions])
  );
  
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await syncAllDataFixed();
    } catch (error) {
      console.error('Sync failed:', error);
    }
    await loadTransactions();
  };
  
  const renderItem = ({ item, index }: { item: DriverTransaction; index: number }) => (
    <View style={GlobalStyles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.transactionIndex}>Transaction #{String(driverTransactions.length - index)}</Text>
        <View
          style={[
            styles.chip,
            item.transaction_type === 'credit' ? styles.chipCredit : styles.chipDebit
          ]}
        >
          <Text style={styles.chipText}>
            {item.transaction_type.charAt(0).toUpperCase() + item.transaction_type.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Driver Name:</Text>
        <Text style={styles.detailValue}>{item.driver_name || ''}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Description:</Text>
        <Text style={styles.detailValue}>{item.description || ''}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Amount:</Text>
        <Text style={[
          styles.amountText,
          item.transaction_type === 'debit' ? styles.amountDebit : styles.amountCredit
        ]}>
          ₹{item.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Recorded By:</Text>
        <Text style={styles.detailValue}>{item.recorded_by || ''}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Recorded At:</Text>
        <Text style={styles.detailValue}>
          {String(new Date(item.created_at).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }))}
        </Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={[GlobalStyles.card, styles.emptyStateCard]}>
      <Text style={styles.emptyIcon}>📊</Text>
      <Text style={[GlobalStyles.title, styles.emptyStateTitle]}>No Driver Transactions Yet!</Text>
      <Text style={[GlobalStyles.bodyText, styles.emptyStateText]}>
        It looks like no transactions have been recorded for drivers.
        Start by adding a new driver transaction from the "Driver Account" section.
      </Text>
      <TouchableOpacity
        onPress={() => goBack()}
        style={GlobalStyles.buttonPrimary}
      >
        <Text style={GlobalStyles.buttonPrimaryText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={GlobalStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Statement</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : driverTransactions.length > 0 ? (
        <>
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              Total Transactions: <Text style={styles.summaryCount}>{driverTransactions.length}</Text>
            </Text>
          </View>
          <FlatList
            data={driverTransactions}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            style={styles.listContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
          />
        </>
      ) : (
        renderEmptyState()
      )}
      
      {driverTransactions.length > 0 && (
        <TouchableOpacity
          onPress={goBack}
          style={[GlobalStyles.buttonPrimary, styles.bottomBackButton]}
        >
          <Text style={GlobalStyles.buttonPrimaryText}>Go Back</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

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
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  summaryContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
    marginBottom: 8,
    marginHorizontal: 12,
    borderRadius: GlobalStyles.card.borderRadius,
    elevation: GlobalStyles.card.elevation,
    shadowColor: GlobalStyles.card.shadowColor,
    shadowOffset: GlobalStyles.card.shadowOffset,
    shadowOpacity: GlobalStyles.card.shadowOpacity,
    shadowRadius: GlobalStyles.card.shadowRadius,
  },
  summaryText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  summaryCount: {
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  listContent: {
    paddingBottom: 20,
  },
  listContainer: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  transactionIndex: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chip: {
    height: 28,
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 8,
  },
  chipCredit: {
    backgroundColor: Colors.success,
  },
  chipDebit: {
    backgroundColor: Colors.error,
  },
  chipText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.surface,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '400',
    flex: 2,
    textAlign: 'right',
  },
  amountText: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  amountDebit: {
    color: Colors.error,
  },
  amountCredit: {
    color: Colors.success,
  },
  emptyStateCard: {
    marginHorizontal: 12,
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyIcon: {
    fontSize: 60,
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

export default DriverStatementScreen;