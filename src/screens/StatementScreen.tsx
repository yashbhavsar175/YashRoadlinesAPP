// StatementScreen.tsx
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Platform, StatusBar, Alert, ActivityIndicator, TextInput, Text, Modal, Dimensions, ScrollView } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import {
  getAgencies,
  getAgencyMajuri,
  getDriverTransactions,
  deleteTransactionByIdImproved,
  getAgencyPaymentsLocal,
  syncAllDataFixed,
  getAgencyEntry,
  AgencyPayment,
  AgencyMajuri,
  DriverTransaction,
  AgencyEntry
} from '../data/Storage';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import Share from 'react-native-share';
import RNPrint from 'react-native-print';
import { generatePDF } from 'react-native-html-to-pdf';
import RNFS from 'react-native-fs';
import { GestureHandlerRootView, LongPressGestureHandler, State } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';

// Debounce utility function
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

type PaidEntry = AgencyPayment & { type: 'paid' };
type MajuriEntry = AgencyMajuri & { type: 'majuri' };
type DriverEntry = DriverTransaction & { type: 'driver_transaction' };
type AgencyGeneralEntry = AgencyEntry & { type: 'agency_general' };
type CombinedEntry = PaidEntry | MajuriEntry | DriverEntry | AgencyGeneralEntry;
type PaidEntryWithDate = Omit<PaidEntry, 'date'> & { date: Date };
type MajuriEntryWithDate = Omit<MajuriEntry, 'date'> & { date: Date };
type DriverEntryWithDate = Omit<DriverEntry, 'date'> & { date: Date };
type AgencyGeneralEntryWithDate = AgencyGeneralEntry & { date: Date };
type CombinedEntryWithDate =
  | PaidEntryWithDate
  | MajuriEntryWithDate
  | DriverEntryWithDate
  | AgencyGeneralEntryWithDate;

type StatementScreenProps = { navigation: NavigationProp<RootStackParamList, 'Statement'> };

interface CustomDropdownProps {
  options: { label: string; value: string }[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  label: string;
}

const CustomDropdown = ({ options, selectedValue, onValueChange, placeholder, label }: CustomDropdownProps) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, width: 0, left: 0 });
  const dropdownRef = useRef<View>(null);

  const toggleModal = () => {
    if (isModalVisible) {
      setIsModalVisible(false);
    } else {
      dropdownRef.current?.measureInWindow((x, y, width, height) => {
        setDropdownPosition({ top: y + height, width, left: x });
        setIsModalVisible(true);
      });
    }
  };

  const handleSelect = (value: string) => {
    onValueChange(value);
    setIsModalVisible(false);
  };

  const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || placeholder;

  return (
    <View style={{ zIndex: isModalVisible ? 100 : 0 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity onPress={toggleModal} style={styles.dropdownToggle} ref={dropdownRef}>
        <Text style={styles.dropdownText}>{selectedLabel}</Text>
        <Icon name={isModalVisible ? 'chevron-up-outline' : 'chevron-down-outline'} size={20} color={Colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="none"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setIsModalVisible(false)}>
          <View style={[styles.dropdownList, { top: dropdownPosition.top, width: dropdownPosition.width, left: dropdownPosition.left }]}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleSelect(item.value)} style={styles.dropdownItem}>
                  <Text style={styles.dropdownItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

function StatementScreen({ navigation }: StatementScreenProps): React.JSX.Element {
  const { goBack } = navigation;
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [agencyOptions, setAgencyOptions] = useState<{ label: string; value: string }[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<CombinedEntryWithDate[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'paid' | 'majuri' | 'agency_general'>('all');
  const [statementType, setStatementType] = useState<'agency' | 'driver'>('agency');
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const isMountedRef = useRef(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCalculatedAmount, setTotalCalculatedAmount] = useState<number>(0);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);


  const filterOptions = useMemo(() => [
    { label: 'All Entries', value: 'all' },
    { label: 'Paid', value: 'paid' },
    { label: 'Majuri', value: 'majuri' },
    { label: 'General Entries', value: 'agency_general' },
  ], []);

  const loadData = useCallback(async (showLoading = true) => {
    if (!isMountedRef.current) return;
    if (showLoading) setLoading(true);
    setError('');

    try {
      let allData: CombinedEntryWithDate[] = [];
      let options: { label: string; value: string }[] = [];
      let currentSelectedEntity = '';

      if (statementType === 'agency') {
        const storedAgencies = await getAgencies();
        options = storedAgencies.map(agency => ({ label: agency.name, value: agency.name }));
        setAgencyOptions(options);

        currentSelectedEntity = selectedAgency;
        if (!currentSelectedEntity && options.length > 0) {
          currentSelectedEntity = options[0].value;
          setSelectedAgency(currentSelectedEntity);
        }

        if (currentSelectedEntity) {
          const [allPaid, allMajuri, allAgencyEntries] = await Promise.all([
            getAgencyPaymentsLocal(),
            getAgencyMajuri(),
            getAgencyEntry()
          ]);

          const agencyPaid: CombinedEntryWithDate[] = allPaid
            .filter(paid => paid.agency_name === currentSelectedEntity)
            .map(p => ({ ...p, type: 'paid' as const, date: new Date(p.payment_date) }));

          const agencyMajuri: CombinedEntryWithDate[] = allMajuri
            .filter(majuri => majuri.agency_name === currentSelectedEntity)
            .map(m => ({ ...m, type: 'majuri' as const, date: new Date(m.majuri_date) }));

          const agencyGeneralEntries: CombinedEntryWithDate[] = allAgencyEntries
            .filter(entry => entry.agency_name === currentSelectedEntity)
            .map(e => ({ ...e, type: 'agency_general' as const, date: new Date(e.entry_date) }));
          
          allData = [...agencyPaid, ...agencyMajuri, ...agencyGeneralEntries];
        }

      } else if (statementType === 'driver') {
        const allTransactions = await getDriverTransactions();
        allData = allTransactions.map(t => ({
          ...t,
          type: 'driver_transaction' as const,
          date: new Date(t.transaction_date)
        }));
      }

      let combinedData: CombinedEntryWithDate[] = allData;
      if (filterType !== 'all' && statementType === 'agency') {
        combinedData = combinedData.filter(entry => {
          if (filterType === 'paid') return entry.type === 'paid';
          if (filterType === 'majuri') return entry.type === 'majuri';
          if (filterType === 'agency_general') return entry.type === 'agency_general';
          return false;
        });
      }

      if (debouncedSearchTerm) {
        const lowerCaseSearchTerm = debouncedSearchTerm.toLowerCase();
        combinedData = combinedData.filter(entry => {
          if (entry.type === 'paid') {
            return entry.bill_no?.toLowerCase().includes(lowerCaseSearchTerm) || entry.date.toLocaleDateString('en-IN').includes(lowerCaseSearchTerm);
          } else if (entry.type === 'majuri') {
            return entry.description?.toLowerCase().includes(lowerCaseSearchTerm) || entry.date.toLocaleDateString('en-IN').includes(lowerCaseSearchTerm);
          } else if (entry.type === 'driver_transaction') {
            return entry.driver_name?.toLowerCase().includes(lowerCaseSearchTerm) || entry.description?.toLowerCase().includes(lowerCaseSearchTerm) || entry.date.toLocaleDateString('en-IN').includes(lowerCaseSearchTerm);
          } else if (entry.type === 'agency_general') {
            return entry.description?.toLowerCase().includes(lowerCaseSearchTerm) || entry.date.toLocaleDateString('en-IN').includes(lowerCaseSearchTerm);
          }
          return false;
        });
      }

      combinedData.sort((a, b) => b.date.getTime() - a.date.getTime());

      if (isMountedRef.current) {
        setFilteredEntries(combinedData);
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  }, [selectedAgency, filterType, statementType, debouncedSearchTerm]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {};
    }, [loadData])
  );
  
  const handleCalculateTotal = useCallback(() => {
      let newTotal = 0;
      if (statementType === 'agency') {
        const paid = filteredEntries.filter((t): t is PaidEntryWithDate => t.type === 'paid');
        const majuri = filteredEntries.filter((t): t is MajuriEntryWithDate => t.type === 'majuri');
        const agencyGeneral = filteredEntries.filter((t): t is AgencyGeneralEntryWithDate => t.type === 'agency_general');
        
        if (filterType === 'all') {
          const totalPaid = paid.reduce((sum, entry) => sum + entry.amount, 0);
          const totalMajuriAmount = majuri.reduce((sum, entry) => sum + entry.amount, 0);
          const totalAgencyGeneralCredit = agencyGeneral.filter(t => t.entry_type === 'credit').reduce((sum, t) => sum + t.amount, 0);
          const totalAgencyGeneralDebit = agencyGeneral.filter(t => t.entry_type === 'debit').reduce((sum, t) => sum + t.amount, 0);
          newTotal = (totalPaid + totalAgencyGeneralCredit) - (totalMajuriAmount + totalAgencyGeneralDebit);
        } else if (filterType === 'paid') {
          newTotal = paid.reduce((sum, entry) => sum + entry.amount, 0);
        } else if (filterType === 'majuri') {
          newTotal = majuri.reduce((sum, entry) => sum + entry.amount, 0);
        } else if (filterType === 'agency_general') {
            const creditTotal = agencyGeneral.filter(t => t.entry_type === 'credit').reduce((sum, t) => sum + t.amount, 0);
            const debitTotal = agencyGeneral.filter(t => t.entry_type === 'debit').reduce((sum, t) => sum + t.amount, 0);
            newTotal = creditTotal - debitTotal;
        }
      }
      setTotalCalculatedAmount(newTotal);
  }, [filteredEntries, filterType, statementType]);

  useEffect(() => {
    handleCalculateTotal();
  }, [handleCalculateTotal]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await syncAllDataFixed();
    } catch (error) {
      console.error('Sync failed:', error);
    }
    await loadData(false);
  };

  const handleAgencyChange = (itemValue: string) => {
    setSelectedAgency(itemValue);
  };

  const handleDeleteEntry = (id: string, type: 'paid' | 'majuri' | 'driver_transaction' | 'agency_general') => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to permanently delete this entry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            let storageKey = '';
            switch (type) {
              case 'paid':
                storageKey = 'offline_agency_paid';
                break;
              case 'majuri':
                storageKey = 'offline_agency_majuri';
                break;
              case 'driver_transaction':
                storageKey = 'offline_driver_transactions';
                break;
              case 'agency_general':
                storageKey = 'offline_agency_entries';
                break;
            }
            try {
              const success = await deleteTransactionByIdImproved(id, storageKey);
              if (success) {
                const updatedEntries = filteredEntries.filter(entry => entry.id !== id);
                setFilteredEntries(updatedEntries);
                Alert.alert('Success! ✅', 'Entry deleted successfully!');
              } else {
                Alert.alert('Error', 'Failed to delete entry. Please try again.');
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'An error occurred while deleting the entry.');
            }
          }
        }
      ]
    );
  };

  const renderEntryItem = useCallback(({ item }: { item: CombinedEntryWithDate }) => {
    let title = '';
    let subLabel = '' as string;
    let amountSign = '';
    let colorStyle = styles.creditAmount;
    let typeChipText = '';

    if (item.type === 'paid') {
      title = 'Paid';
      subLabel = `Bill No: ${item.bill_no || 'N/A'}`;
      amountSign = '';
      colorStyle = styles.creditAmount;
      typeChipText = 'Paid';
    } else if (item.type === 'majuri') {
      title = 'Majuri';
      subLabel = `Desc: ${item.description || 'N/A'}`;
      amountSign = '-';
      colorStyle = styles.debitAmount;
      typeChipText = 'Majuri';
    } else if (item.type === 'driver_transaction') {
      const isDebit = item.transaction_type === 'debit';
      title = `${isDebit ? 'Uppad' : 'Jama'} ${item.driver_name || 'N/A'}`;
      subLabel = `Desc: ${item.description || 'N/A'}`;
      amountSign = isDebit ? '-' : '+';
      colorStyle = isDebit ? styles.debitAmount : styles.creditAmount;
      typeChipText = isDebit ? 'Uppad' : 'Jama';
    } else {
      // agency_general
      title = `Agency Entry`;
      subLabel = `Desc: ${item.description || 'N/A'}`;
      amountSign = item.entry_type === 'debit' ? '-' : '';
      colorStyle = item.entry_type === 'debit' ? styles.debitAmount : styles.creditAmount;
      typeChipText = item.entry_type === 'debit' ? 'Debit' : 'Credit';
    }
    const amountStyle = filterType === 'all' ? colorStyle : styles.defaultAmount;

    return (
        <LongPressGestureHandler
            onHandlerStateChange={({ nativeEvent }) => {
                if (nativeEvent.state === State.ACTIVE) {
                    handleDeleteEntry(item.id, item.type);
                }
            }}
            minDurationMs={800}
        >
            <View style={[GlobalStyles.card, styles.entryCard]}>
                <View style={styles.entryHeader}>
                    <View style={styles.entryInfo}>
                        <View
                            style={[
                                styles.typeChip,
                                typeChipText === 'Paid' || typeChipText === 'Credit' ? styles.paidChip : styles.majuriChip
                            ]}
                            >
                            <Text style={styles.chipText}>{typeChipText}</Text>
                        </View>
                        <Text style={styles.entryDate}>{item.date.toLocaleDateString('en-IN')}</Text>
                    </View>
                    <Text style={styles.dateText}>{item.date.toLocaleTimeString('en-IN')}</Text>
                </View>
                <View style={styles.entryContent}>
                    <View>
                        <Text style={styles.entryTitle}>{title}</Text>
                        <Text style={styles.entrySubLabel}>{subLabel}</Text>
                    </View>
                    <Text style={[styles.entryAmount, amountStyle]}>{amountSign} ₹{item.amount.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</Text>
                </View>
            </View>
        </LongPressGestureHandler>
    );
  }, [filterType, handleDeleteEntry]);
    
  const renderEmptyState = () => (
      <View style={[GlobalStyles.card, styles.emptyStateCard]}>
          <Text style={styles.emptyStateIcon}>📄</Text>
          <Text style={[GlobalStyles.title, styles.emptyStateTitle]}>No Transactions</Text>
          <Text style={[GlobalStyles.bodyText, styles.emptyStateText]}>
              {!selectedAgency && statementType === 'agency'
                ? 'Please select an agency to view statements'
                : `No ${filterOptions.find(opt => opt.value === filterType)?.label.toLowerCase()} found for the selected filter.`
              }
          </Text>
          {selectedAgency && (
              <TouchableOpacity
                  onPress={handleRefresh}
                  style={GlobalStyles.buttonPrimary}
              >
                  <Text style={GlobalStyles.buttonPrimaryText}>Refresh Data</Text>
              </TouchableOpacity>
          )}
      </View>
  );

  const formatDateTime = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      return date.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const generateAgencyReportPdf = async () => {
    if (!selectedAgency || filteredEntries.length === 0) {
      Alert.alert('No Data', 'Please select an agency with transactions to generate a report.');
      return;
    }
    if (isGeneratingPdf) {
      Alert.alert('Please Wait', 'PDF is already being generated. Please wait...');
      return;
    }
    try {
      if (isMountedRef.current) {
        setIsGeneratingPdf(true);
      }
      console.log('Starting PDF generation...');
      const paid = filteredEntries.filter((t): t is PaidEntryWithDate => t.type === 'paid');
      const majuri = filteredEntries.filter((t): t is MajuriEntryWithDate => t.type === 'majuri');
      const agencyGeneral = filteredEntries.filter((t): t is AgencyGeneralEntryWithDate => t.type === 'agency_general');

      const totalPaid = paid.reduce((sum, item) => sum + item.amount, 0);
      const totalMajuri = majuri.reduce((sum, item) => sum + item.amount, 0);
      const totalGeneralCredit = agencyGeneral.filter(t => t.entry_type === 'credit').reduce((sum, t) => sum + t.amount, 0);
      const totalGeneralDebit = agencyGeneral.filter(t => t.entry_type === 'debit').reduce((sum, t) => sum + t.amount, 0);
      const netGeneralTotal = totalGeneralCredit - totalGeneralDebit;

      const showPayments = filterType === 'all' || filterType === 'paid';
      const showMajuri = filterType === 'all' || filterType === 'majuri';
      const showGeneral = filterType === 'all' || filterType === 'agency_general';
      const showColor = filterType === 'all';
      const amountColorClass = showColor ? '' : 'amount-black';
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${selectedAgency} Statement</title>
            <meta charset="UTF-8">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: Arial, sans-serif; 
                    padding: 20px; 
                    background: white;
                    color: #333;
                    line-height: 1.4;
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 30px; 
                    border-bottom: 3px solid #2196F3;
                    padding-bottom: 15px;
                }
                .header h1 { 
                    font-size: 24px; 
                    color: #1976D2; 
                    margin-bottom: 8px; 
                    font-weight: bold;
                }
                .header h2 { 
                    font-size: 18px; 
                    color: #555; 
                    margin-bottom: 10px; 
                }
                .date-range {
                    font-size: 14px;
                    color: #666;
                    font-style: italic;
                }
                
                .section {
                    margin-bottom: 30px;
                    page-break-inside: avoid;
                }
                .section h3 {
                    color: #1976D2;
                    font-size: 16px;
                    margin-bottom: 15px;
                    padding: 8px 0;
                    border-bottom: 2px solid #E3F2FD;
                }
                
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 20px;
                    font-size: 12px;
                    page-break-inside: avoid;
                }
                th, td { 
                    border: 1px solid #ddd; 
                    padding: 8px 6px; 
                    text-align: left; 
                    vertical-align: top;
                }
                th { 
                    background-color: #f8f9fa; 
                    color: #333; 
                    font-weight: bold;
                    font-size: 12px;
                }
                
                .credit-amount { 
                    color: #2E7D32; 
                    font-weight: bold; 
                }
                .debit-amount { 
                    color: #C62828; 
                    font-weight: bold; 
                }
                .amount-black {
                    color: black;
                    font-weight: bold;
                }
                
                .summary { 
                    margin-top: 30px; 
                    padding: 15px; 
                    border: 2px solid #1976D2; 
                    border-radius: 8px;
                    background-color: #f5f5f5;
                    page-break-inside: avoid;
                }
                .summary h3 {
                    margin-top: 0;
                    margin-bottom: 15px;
                    text-align: center;
                    color: #1976D2;
                    border-bottom: none;
                }
                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-size: 14px;
                }
                .net-balance { 
                    font-size: 16px;
                    font-weight: bold;
                    color: ${totalCalculatedAmount >= 0 ? '#2E7D32' : '#C62828'}; 
                    border-top: 2px solid #333;
                    padding-top: 10px;
                    margin-top: 10px;
                }
                
                .no-data {
                    text-align: center;
                    color: #666;
                    font-style: italic;
                    padding: 20px;
                    background-color: #f9f9f9;
                    border-radius: 5px;
                }
                
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 15px;
                    border-top: 1px solid #ddd;
                    font-size: 10px;
                    color: #666;
                }
                
                @media print {
                    body { font-size: 11px; }
                    .section { break-inside: avoid; }
                    table { break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>YASH ROADLINES</h1>
                <h2>${selectedAgency} - Statement Report</h2>
            </div>
            
            ${showPayments ? `
            <div class="section">
                <h3>💰 Paid ${showColor ? '(Credit)' : ''} - ${paid.length} entries</h3>
                ${paid.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th style="width: 10%;">Sr.</th>
                            <th style="width: 40%;">Date & Time</th>
                            <th style="width: 25%;">Bill No.</th>
                            <th style="width: 25%;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paid.map((item, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${formatDateTime('payment_date' in item ? item.payment_date : '')}</td>
                                <td>${'bill_no' in item ? item.bill_no || 'N/A' : 'N/A'}</td>
                                <td class="${showColor ? 'credit-amount' : amountColorClass}">₹${item.amount.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</td>
                            </tr>
                        `).join('')}
                        <tr style="background-color: #f8f9fa; font-weight: bold;">
                            <td colspan="3" style="text-align: right; padding-right: 10px;">Total Paid:</td>
                            <td class="${showColor ? 'credit-amount' : amountColorClass}">₹${paid.reduce((sum, item) => sum + item.amount, 0).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</td>
                        </tr>
                    </tbody>
                </table>
                ` : '<div class="no-data">No paid transactions found</div>'}
            </div>
            ` : ''}

            ${showMajuri ? `
            <div class="section">
                <h3>💸 Majuri ${showColor ? '(Debit)' : ''} - ${majuri.length} entries</h3>
                ${majuri.length > 0 ? ` 
                <table>
                    <thead>
                        <tr>
                            <th style="width: 10%;">Sr.</th>
                            <th style="width: 40%;">Date & Time</th>
                            <th style="width: 25%;">Description</th>
                            <th style="width: 25%;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${majuri.map((item, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${formatDateTime('majuri_date' in item ? item.majuri_date : '')}</td>
                                <td>${'description' in item ? item.description || 'N/A' : 'N/A'}</td>
                                <td class="${showColor ? 'debit-amount' : amountColorClass}">₹${item.amount.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</td>
                            </tr>
                        `).join('')}
                        <tr style="background-color: #f8f9fa; font-weight: bold;">
                            <td colspan="3" style="text-align: right; padding-right: 10px;">Total Majuri:</td>
                            <td class="${showColor ? 'debit-amount' : amountColorClass}">₹${majuri.reduce((sum, item) => sum + item.amount, 0).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</td>
                        </tr>
                    </tbody>
                </table>
                ` : '<div class="no-data">No majuri transactions found</div>'}
            </div>
            ` : ''}
            
            ${showGeneral ? `
            <div class="section">
                <h3>🔄 General Entries - ${agencyGeneral.length} entries</h3>
                ${agencyGeneral.length > 0 ? ` 
                <table>
                    <thead>
                        <tr>
                            <th style="width: 10%;">Sr.</th>
                            <th style="width: 20%;">Type</th>
                            <th style="width: 40%;">Description</th>
                            <th style="width: 30%;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${agencyGeneral.map((item, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${item.entry_type}</td>
                                <td>${item.description || 'N/A'}</td>
                                <td class="${item.entry_type === 'credit' ? 'credit-amount' : 'debit-amount'}">
                                  ${item.entry_type === 'debit' ? '-' : ''} ₹${item.amount.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ` : '<div class="no-data">No general entries found</div>'}
            </div>
            ` : ''}

            <div class="summary">
                <h3>📊 Financial Summary</h3>
                <div class="summary-row">
                    <span>Total Paid:</span>
                    <span class="credit-amount">₹${totalPaid.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</span>
                </div>
                <div class="summary-row">
                    <span>Total Majuri:</span>
                    <span class="debit-amount">₹${totalMajuri.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</span>
                </div>
                <div class="summary-row">
                    <span>Total General:</span>
                    <span class="${netGeneralTotal >= 0 ? 'credit-amount' : 'debit-amount'}">${netGeneralTotal < 0 ? '-' : ''}₹${Math.abs(netGeneralTotal).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</span>
                </div>
                <div class="summary-row net-balance">
                    <span>Net Balance:</span>
                    <span>₹${Math.abs(totalCalculatedAmount).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}${totalCalculatedAmount < 0 ? ' (Due)' : ''}</span>
                </div>
            </div>
            
            <div class="footer">
                <div><strong>YASH ROADLINES</strong></div>
                <div>Statement Report Generated on: ${new Date().toLocaleString('en-IN', {
                    year: 'numeric',
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                })}</div>
            </div>
        </body>
        </html>
      `;
      if (!isMountedRef.current) {
        console.log('Component unmounted, cancelling PDF generation');
        return;
      }
      const fileName = `${selectedAgency.replace(/[^a-zA-Z0-9]/g, '_')}_Statement_${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
      console.log('Generating PDF with filename:', fileName);
      
      // Create PDF in temp directory first
      const tempPdfOptions = {
        html: htmlContent,
        fileName: fileName,
        directory: 'Documents',
        base64: false,
        width: 595,
        height: 842,
      };

      console.log('Generating Statement PDF...');
      const tempPdf = await generatePDF(tempPdfOptions);
      
      if (tempPdf && tempPdf.filePath) {
        console.log('Temp PDF generated successfully at:', tempPdf.filePath);
        
        // Create organized folder structure inside Downloads
        const now = new Date();
        const fileName = `${selectedAgency}_Statement_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}.pdf`;
        const appFolderPath = `${RNFS.DownloadDirectoryPath}/Yash Roadlines`;
        const statementFolderPath = `${appFolderPath}/Statement`;
        const finalFilePath = `${statementFolderPath}/${fileName}`;
        
        // Create directories if they don't exist
        try {
          await RNFS.mkdir(appFolderPath);
          await RNFS.mkdir(statementFolderPath);
          console.log('Created folder structure in Downloads:', statementFolderPath);
        } catch (dirError) {
          console.log('Folders might already exist:', dirError);
        }
        
        try {
          // Copy file to organized folder in Downloads
        await RNFS.copyFile(tempPdf.filePath, finalFilePath);
        console.log('PDF copied to organized Downloads folder:', finalFilePath);
          
          // Clean up temp file
          await RNFS.unlink(tempPdf.filePath).catch(() => {
            console.log('Could not delete temp file');
          });
          
          // Try sharing the PDF file from organized Downloads folder
        try {
          console.log('Attempting to share PDF from organized Downloads folder:', finalFilePath);
            
            const shareOptions = {
              title: 'Share Statement Report',
              message: `Statement Report for ${selectedAgency}`,
              url: `file://${finalFilePath}`,
              type: 'application/pdf',
            };

            await Share.open(shareOptions);
            console.log('Statement PDF shared successfully from Downloads folder');
            
          } catch (shareError) {
            console.log('Sharing failed, showing Downloads location:', shareError);
            
            // Show success message with organized Downloads location
          Alert.alert(
            'PDF Saved Successfully! 📄',
            `Statement has been saved to organized Downloads folder.\n\nFile: ${fileName}\n\nLocation: Downloads/Yash Roadlines/Statement/\n\nYou can find it in:\n• File Manager > Downloads > Yash Roadlines > Statement\n• Share it via WhatsApp, Gmail, etc.`,
            [{ text: 'OK', style: 'default' }]
          );
          }
          
        } catch (copyError) {
          console.log('Failed to copy to Downloads folder:', copyError);
          
          // Fallback to temp file sharing
          try {
            const shareOptions = {
              title: 'Share Statement Report',
              message: `Statement Report for ${selectedAgency}`,
              url: `file://${tempPdf.filePath}`,
              type: 'application/pdf',
            };

            await Share.open(shareOptions);
            console.log('Statement PDF shared successfully from temp location');
            
          } catch (shareError) {
            Alert.alert(
              'PDF Generated! 📄',
              `Statement report generated successfully!\n\nFile saved temporarily. Please try sharing again or check your file manager.`,
              [{ text: 'OK', style: 'default' }]
            );
          }
        }
        
      } else {
        throw new Error("PDF file path is null.");
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      if (isMountedRef.current) {
        Alert.alert(
          'PDF Generation Error', 
          'Failed to generate the statement report. Please try again.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Retry',
              onPress: () => generateAgencyReportPdf(),
              style: 'default'
            }
          ]
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsGeneratingPdf(false);
      }
    }
  };
  const shareStatementAsText = async () => {
    if (!selectedAgency || filteredEntries.length === 0) {
      Alert.alert('No Data', 'Please select an agency with transactions to generate a report.');
      return;
    }
    try {
      const credits = filteredEntries.filter((t): t is PaidEntryWithDate => t.type === 'paid');
      const majuri = filteredEntries.filter((t): t is MajuriEntryWithDate => t.type === 'majuri');
      const agencyGeneral = filteredEntries.filter((t): t is AgencyGeneralEntryWithDate => t.type === 'agency_general');
      
      const textContent = `
🏢 YASH ROADLINES
📊 ${selectedAgency} - Statement Report
${filterType === 'all' ? `
💰 PAID (CREDIT) - ${credits.length} entries
${credits.length > 0 ? 
  credits.map((item, index) => 
    `${index + 1}. ${formatDateTime('payment_date' in item ? item.payment_date : '')}
   Bill No: ${'bill_no' in item ? item.bill_no || 'N/A' : 'N/A'}
   Amount: ₹${item.amount.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}
`).join('') + 
`
📈 Total Paid: ₹${credits.reduce((sum, item) => sum + item.amount, 0).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}
` : 'No paid transactions found'}

💸 MAJURI (DEBIT) - ${majuri.length} entries
${majuri.length > 0 ? 
  majuri.map((item, index) => 
    `${index + 1}. ${formatDateTime('majuri_date' in item ? item.majuri_date : '')}
   Description: ${'description' in item ? item.description || 'N/A' : 'N/A'}
   Amount: ₹${item.amount.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}
`).join('') + 
`
📉 Total Majuri: ₹${majuri.reduce((sum, item) => sum + item.amount, 0).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}
` : 'No majuri transactions found'}

🔄 GENERAL ENTRIES - ${agencyGeneral.length} entries
${agencyGeneral.length > 0 ? 
  agencyGeneral.map((item, index) => 
    `${index + 1}. ${formatDateTime(item.entry_date)}
   Type: ${item.entry_type}
   Description: ${item.description || 'N/A'}
   Amount: ${item.entry_type === 'debit' ? '-' : ''}₹${item.amount.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}
`).join('') + 
`
📈 Total General Entries: ₹${(agencyGeneral.filter(t => t.entry_type === 'credit').reduce((sum, t) => sum + t.amount, 0) - agencyGeneral.filter(t => t.entry_type === 'debit').reduce((sum, t) => sum + t.amount, 0)).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}
` : 'No general transactions found'}

📊 FINANCIAL SUMMARY
Total Paid: ₹${credits.reduce((sum, item) => sum + item.amount, 0).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}
Total Majuri: ₹${majuri.reduce((sum, item) => sum + item.amount, 0).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}
Total General Credit: ₹${agencyGeneral.filter(t => t.entry_type === 'credit').reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}
Total General Debit: ₹${agencyGeneral.filter(t => t.entry_type === 'debit').reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}
Net Balance: ₹${Math.abs(totalCalculatedAmount).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}${totalCalculatedAmount < 0 ? ' (Due)' : ''}

` : `
${filterType === 'paid' ? `
💰 PAID - ${credits.length} entries
${credits.length > 0 ? 
  credits.map((item, index) => 
    `${index + 1}. ${formatDateTime('payment_date' in item ? item.payment_date : '')}
   Bill No: ${'bill_no' in item ? item.bill_no || 'N/A' : 'N/A'}
   Amount: ₹${item.amount.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}
`).join('') + 
`
📈 Total Paid: ₹${credits.reduce((sum, item) => sum + item.amount, 0).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}
` : 'No paid transactions found'}
` : ''}
${filterType === 'majuri' ? `
💸 MAJURI - ${majuri.length} entries
${majuri.length > 0 ? 
  majuri.map((item, index) => 
    `${index + 1}. ${formatDateTime('majuri_date' in item ? item.majuri_date : '')}
   Description: ${'description' in item ? item.description || 'N/A' : 'N/A'}
   Amount: ₹${item.amount.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}
`).join('') + 
`
📉 Total Majuri: ₹${majuri.reduce((sum, item) => sum + item.amount, 0).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}
` : 'No majuri transactions found'}
` : ''}
${filterType === 'agency_general' ? `
🔄 GENERAL ENTRIES - ${agencyGeneral.length} entries
${agencyGeneral.length > 0 ? 
  agencyGeneral.map((item, index) => 
    `${index + 1}. ${formatDateTime(item.entry_date)}
   Type: ${item.entry_type}
   Description: ${item.description || 'N/A'}
   Amount: ${item.entry_type === 'debit' ? '-' : ''}₹${item.amount.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}
`).join('') + 
`
📈 Total General Entries: ₹${(agencyGeneral.filter(t => t.entry_type === 'credit').reduce((sum, t) => sum + t.amount, 0) - agencyGeneral.filter(t => t.entry_type === 'debit').reduce((sum, t) => sum + t.amount, 0)).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}
` : 'No general transactions found'}
` : ''}

📊 FINANCIAL SUMMARY
Total Amount: ₹${totalCalculatedAmount.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}
`}
Generated on: ${new Date().toLocaleString('en-IN')}
      `;
      await Share.open({
        message: textContent,
        title: `${selectedAgency} Statement Report`,
        subject: `${selectedAgency} Statement Report - ${new Date().toLocaleDateString('en-IN')}`,
      });
      Alert.alert(
        'Success! 📄', 
        `Statement report for ${selectedAgency} shared successfully!`,
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share statement report.');
    }
  };
  const handleSharePress = () => {
    Alert.alert(
      'Share Statement',
      'Choose how you want to share the statement:',
      [
        {
          text: 'PDF Format',
          onPress: generateAgencyReportPdf,
          style: 'default'
        },
        {
          text: 'Text Format',
          onPress: shareStatementAsText,
          style: 'default'
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };
const renderListHeaderComponent = useMemo(() => {
    let summaryTitle = '';
    let summaryAmount = 0;
    
    if (filterType === 'all') {
      const paid = filteredEntries
        .filter((t): t is PaidEntryWithDate => t.type === 'paid')
        .reduce((sum, t) => sum + t.amount, 0);
      const majuri = filteredEntries
        .filter((t): t is MajuriEntryWithDate => t.type === 'majuri')
        .reduce((sum, t) => sum + t.amount, 0);
      const agencyGeneral = filteredEntries
        .filter((t): t is AgencyGeneralEntryWithDate => t.type === 'agency_general');
      const agencyGeneralCredit = agencyGeneral
        .filter(t => t.entry_type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);
      const agencyGeneralDebit = agencyGeneral
        .filter(t => t.entry_type === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);
      summaryAmount = (paid + agencyGeneralCredit) - (majuri + agencyGeneralDebit);
      summaryTitle = 'Net Balance';
    } else if (filterType === 'paid') {
      summaryAmount = filteredEntries.filter(t => t.type === 'paid').reduce((sum, t) => sum + t.amount, 0);
      summaryTitle = 'Total Paid';
    } else if (filterType === 'majuri') {
      summaryAmount = filteredEntries.filter(t => t.type === 'majuri').reduce((sum, t) => sum + t.amount, 0);
      summaryTitle = 'Total Majuri';
    } else if (filterType === 'agency_general') {
        const agencyGeneral = filteredEntries
          .filter((t): t is AgencyGeneralEntryWithDate => t.type === 'agency_general');
        const creditTotal = agencyGeneral
          .filter(t => t.entry_type === 'credit')
          .reduce((sum, t) => sum + t.amount, 0);
        const debitTotal = agencyGeneral
          .filter(t => t.entry_type === 'debit')
          .reduce((sum, t) => sum + t.amount, 0);
        summaryAmount = creditTotal - debitTotal;
        summaryTitle = 'Net General Entries';
    }

    const totalCardStyle = summaryAmount < 0 ? styles.negativeCard : styles.totalCard;
    const totalAmountStyle = summaryAmount < 0 ? styles.negativeTotal : styles.totalAmount;

    const selectedFilterLabel = filterOptions.find(opt => opt.value === filterType)?.label || 'All Entries';

    return (
        <View>
            <View style={GlobalStyles.card}>
                <View style={styles.cardContent}>
                    <Text style={[GlobalStyles.title, styles.cardInnerTitle]}>View Statements</Text>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            onPress={() => {
                                setStatementType('agency');
                                setSearchTerm('');
                            }}
                            style={[styles.tabButton, statementType === 'agency' ? styles.activeTab : styles.inactiveTab]}
                        >
                            <Text style={[styles.tabText, statementType === 'agency' ? styles.activeTabText : null]}>
                                Agency
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                setStatementType('driver');
                                setSearchTerm('');
                            }}
                            style={[styles.tabButton, statementType === 'driver' ? styles.activeTab : styles.inactiveTab]}
                        >
                            <Text style={[styles.tabText, statementType === 'driver' ? styles.activeTabText : null]}>
                                Driver
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {statementType === 'agency' && (
                        <View style={styles.dropdownContainer}>
                            <CustomDropdown
                                label="Select Agency"
                                options={agencyOptions}
                                selectedValue={selectedAgency}
                                onValueChange={handleAgencyChange}
                                placeholder={agencyOptions.length > 0 ? "Choose Agency" : "No Agencies Available"}
                            />
                        </View>
                    )}
                    {statementType === 'agency' && (
                        <View style={styles.filterContainer}>
                             <CustomDropdown
                                label="Filter by Entry Type"
                                options={filterOptions}
                                selectedValue={filterType}
                                onValueChange={(v) => setFilterType(v as 'all' | 'paid' | 'majuri' | 'agency_general')}
                                placeholder="Choose Filter"
                             />
                         </View>
                     )}
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by bill no, description or date"
                            placeholderTextColor={Colors.textSecondary}
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                        />
                    </View>
                </View>
            </View>
            {error ? (
                <View style={[GlobalStyles.card, styles.errorCard]}>
                    <View style={styles.cardContent}>
                        <Text style={styles.errorText}>⚠️ {error}</Text>
                    </View>
                </View>
            ) : null}
            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading data...</Text>
                </View>
            )}
            {!loading && filteredEntries.length > 0 && (
                <View style={styles.listHeader}>
                    <Text style={GlobalStyles.subtitle}>
                        {statementType === 'agency'
                            ? `${selectedAgency} - ${filterOptions.find(opt => opt.value === filterType)?.label}`
                            : 'Driver Entries'}
                    </Text>
                    <Text style={styles.entryCount}>
                        {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
                    </Text>
                </View>
            )}
        </View>
    );
}, [selectedAgency, filterType, statementType, searchTerm, agencyOptions, loading, error, filteredEntries.length]);

return (
  <GestureHandlerRootView style={{ flex: 1 }}>
  <View style={styles.container}>
    <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

    {/* Header - Fixed at top */}
    <View style={styles.header}>
      <TouchableOpacity onPress={goBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>{'<'}</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Statement</Text>
      {statementType === 'agency' && selectedAgency && filteredEntries.length > 0 && (
          <TouchableOpacity 
            onPress={handleSharePress} 
            style={[styles.shareButton, isGeneratingPdf && styles.shareButtonDisabled]}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? (
              <ActivityIndicator size="small" color={Colors.surface} />
            ) : (
              <Icon name="share-social-outline" size={20} color={Colors.primaryDark} />
            )}
          </TouchableOpacity>
        )}
      {(!selectedAgency || filteredEntries.length === 0 || statementType === 'driver') && <View style={styles.headerSpacer} />}
    </View>

    {/* Middle Content - Scrollable area */}
    <View style={styles.middleContainer}>
      <FlatList<CombinedEntryWithDate>
        data={filteredEntries}
        renderItem={renderEntryItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        
        ListHeaderComponent={renderListHeaderComponent}

        ListEmptyComponent={() => {
          if (loading) return null;
          return renderEmptyState();
        }}
      />
    </View>

    <View style={styles.bottomSection}>
      <TouchableOpacity
        onPress={goBack}
        style={[GlobalStyles.buttonPrimary, styles.stickyBackButton]}
      >
        <Text style={GlobalStyles.buttonPrimaryText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  </View>
  </GestureHandlerRootView>
);
}

const styles = StyleSheet.create({
   container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  middleContainer: {
    flex: 1,
  },
  bottomSection: {
    backgroundColor: Colors.background,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  stickyTotalCard: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 0,
    backgroundColor: Colors.surface,
    borderRadius: GlobalStyles.card.borderRadius,
    elevation: GlobalStyles.card.elevation + 1,
    shadowColor: GlobalStyles.card.shadowColor,
    shadowOffset: GlobalStyles.card.shadowOffset,
    shadowOpacity: GlobalStyles.card.shadowOpacity,
    shadowRadius: GlobalStyles.card.shadowRadius,
    paddingVertical: 18,
  },
  stickyBackButton: {
    backgroundColor: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 8,
    marginHorizontal: 12,
  },
   listContent: {
    paddingBottom: 10,
    paddingHorizontal: 12,
    paddingTop: 20,
  },
  scrollViewContent: {
    paddingVertical: 20,
  },
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
  shareButton: {
    backgroundColor: Colors.accent,
    width: 50,
    height: 35,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  shareButtonText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: 0,
  },
  cardInnerTitle: {
    marginBottom: 16,
    fontSize: 22,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 5,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  inactiveTab: {
    backgroundColor: Colors.background,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  activeTabText: {
    color: Colors.surface,
  },
  dateFilterContainer: {
      marginBottom: 20,
  },
  dateInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  dateInput: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 50,
      borderColor: Colors.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      backgroundColor: Colors.surface,
  },
  dateInputText: {
      fontSize: 16,
      color: Colors.textPrimary,
  },
  clearDateButton: {
      marginTop: 8,
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: Colors.background,
      borderRadius: 5,
  },
  clearDateText: {
      fontSize: 12,
      color: Colors.textSecondary,
  },
  dropdownContainer: {
    marginBottom: 20,
  },
  filterContainer: {
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonInactive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  filterButtonTextActive: {
    color: Colors.surface,
  },
  filterButtonTextInactive: {
    color: Colors.textPrimary,
  },
  errorCard: {
    marginHorizontal: 12,
    backgroundColor: Colors.error,
    borderRadius: GlobalStyles.card.borderRadius,
    elevation: GlobalStyles.card.elevation,
    shadowColor: GlobalStyles.card.shadowColor,
    shadowOffset: GlobalStyles.card.shadowOffset,
    shadowOpacity: GlobalStyles.card.shadowOpacity,
    shadowRadius: GlobalStyles.card.shadowRadius,
    paddingVertical: 15,
    alignItems: 'center',
  },
  errorText: {
    color: Colors.surface,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
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
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    marginHorizontal: 12,
    borderTopLeftRadius: GlobalStyles.card.borderRadius,
    borderTopRightRadius: GlobalStyles.card.borderRadius,
    marginTop: 8,
    elevation: GlobalStyles.card.elevation,
    shadowColor: GlobalStyles.card.shadowColor,
    shadowOffset: GlobalStyles.card.shadowOffset,
    shadowOpacity: GlobalStyles.card.shadowOpacity,
    shadowRadius: GlobalStyles.card.shadowRadius,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  entryCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    fontWeight: '600',
  },
  entryCard: {
    marginHorizontal: 12,
    marginVertical: 4,
    backgroundColor: Colors.surface,
    borderRadius: GlobalStyles.card.borderRadius,
    elevation: 3,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    padding: 18,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 0.5,
    borderColor: Colors.border,
    paddingBottom: 8,
  },
  entryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  serialNumber: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeChip: {
    height: 28,
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 10,
  },
  paidChip: {
    backgroundColor: Colors.success,
  },
  majuriChip: {
    backgroundColor: Colors.warning,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.surface,
  },
  dateText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  entryDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  entryDetails: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
    lineHeight: 22,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  amountText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  entryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  defaultAmount: {
    color: Colors.textPrimary,
  },
  creditAmount: {
    color: Colors.success,
  },
  debitAmount: {
    color: Colors.error,
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.error,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: Colors.surface,
    fontWeight: 'bold',
    fontSize: 18,
  },
  listContainer: {
    flex: 1,
  },
  emptyStateCard: {
    marginHorizontal: 12,
    alignItems: 'center',
    paddingVertical: 30,
    marginTop: 8,
  },
  emptyStateIcon: {
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
  totalCard: {
    marginHorizontal: 12,
    marginTop: 8,
    backgroundColor: Colors.surface,
    borderRadius: GlobalStyles.card.borderRadius,
    elevation: GlobalStyles.card.elevation,
    shadowColor: GlobalStyles.card.shadowColor,
    shadowOffset: GlobalStyles.card.shadowOffset,
    shadowOpacity: GlobalStyles.card.shadowOpacity,
    shadowRadius: GlobalStyles.card.shadowRadius,
    paddingVertical: 18,
  },
  negativeCard: {
    backgroundColor: Colors.error,
    elevation: GlobalStyles.card.elevation + 2,
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.25,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  negativeTotal: {
    color: Colors.surface,
  },
  bottomBackButton: {
    backgroundColor: Colors.textSecondary,
    marginBottom: 16,
    marginHorizontal: 12,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 10,
  },
  requiredStar: {
    color: Colors.error,
    fontSize: 14,
  },
  pdfButton: {
    marginBottom: 8,
    marginHorizontal: 12,
  },
  shareButtonDisabled: {
  backgroundColor: Colors.textSecondary,
  opacity: 0.6,
},
  searchContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  searchInput: {
    height: 50,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  entrySubLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  entryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 10,
  },
  dropdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    position: 'absolute',
    top: 55, // Position below the dropdown toggle
    left: 0,
    right: 0,
    zIndex: 100,
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});

export default StatementScreen;