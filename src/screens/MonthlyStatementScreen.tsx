// src/screens/MonthlyStatementScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  FlatList,
  Dimensions,
  PermissionsAndroid
} from 'react-native';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import {
  getAgencies,
  getMonthlyTransactions,
  Agency,
  AgencyPayment,
  AgencyMajuri,
  AgencyEntry,
  GeneralEntry,
  DriverTransaction,
  TruckFuelEntry,
  OFFLINE_KEYS
} from '../data/Storage';
import { Colors } from '../theme/colors';
import { GlobalStyles } from '../theme/styles';
import RNPrint from 'react-native-print';
import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/Ionicons';
import CheckBox from '@react-native-community/checkbox';

type MonthlyStatementScreenNavigationProp = NavigationProp<RootStackParamList, 'MonthlyStatement'>;

interface MonthlyStatementScreenProps {
  navigation: MonthlyStatementScreenNavigationProp;
}

// Custom Dropdown component
interface CustomDropdownProps {
  options: { label: string; value: string }[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  label: string;
  enabled?: boolean;
}

const CustomDropdown = ({ options, selectedValue, onValueChange, placeholder, label, enabled = true }: CustomDropdownProps) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, width: 0, left: 0 });
  const dropdownRef = useRef<View>(null);

  const toggleModal = () => {
    if (!enabled) return;
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
      <TouchableOpacity onPress={toggleModal} style={styles.dropdownToggle} ref={dropdownRef} disabled={!enabled}>
        <Text style={[styles.dropdownText, !enabled && { color: Colors.textSecondary }]}>{selectedLabel}</Text>
        <Icon name={isModalVisible ? 'chevron-up-outline' : 'chevron-down-outline'} size={20} color={!enabled ? Colors.textSecondary : Colors.textPrimary} />
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


function MonthlyStatementScreen({ navigation }: MonthlyStatementScreenProps): React.JSX.Element {
  const { goBack } = navigation;
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [agencyOptions, setAgencyOptions] = useState<{ label: string; value: string }[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  
  const [reportType, setReportType] = useState<'agency' | 'other'>('agency');

  const [includePaid, setIncludePaid] = useState(true);
  const [includeMajuri, setIncludeMajuri] = useState(true);
  const [includeGeneral, setIncludeGeneral] = useState(true);
  const [includeDrivers, setIncludeDrivers] = useState(true);
  const [includeFuel, setIncludeFuel] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [generatedPdfPath, setGeneratedPdfPath] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const date = new Date(2000, month - 1, 1);
    return {
      label: date.toLocaleString('default', { month: 'long' }),
      value: String(month).padStart(2, '0'),
    };
  });

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = currentYear - i;
    return { label: String(year), value: String(year) };
  });

  useEffect(() => {
    isMountedRef.current = true;
    setSelectedMonth(String(new Date().getMonth() + 1).padStart(2, '0'));
    setSelectedYear(String(currentYear));
    
    return () => { isMountedRef.current = false; };
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadAgencies = async () => {
        const storedAgencies = await getAgencies();
        if (isMountedRef.current) {
          setAgencies(storedAgencies);
          const options = storedAgencies.map(agency => ({ label: agency.name, value: agency.name }));
          setAgencyOptions(options);
          if (options.length > 0 && !selectedAgency) {
            setSelectedAgency(options[0].value);
          }
        }
      };
      loadAgencies();
    }, [selectedAgency])
  );
  
  const formatDateTime = (isoDate: string | Date): string => {
    try {
      const date = new Date(isoDate);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getMonthName = (monthNumber: string): string => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[parseInt(monthNumber) - 1] || 'Unknown';
  };

  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission',
          message: 'This app needs access to storage to save PDF files in Downloads folder.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Storage permission granted');
        return true;
      } else {
        console.log('Storage permission denied');
        Alert.alert(
          'Permission Required',
          'Storage permission is required to save PDF files. Please enable it in app settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (err) {
      console.warn('Permission request error:', err);
      return false;
    }
  };

  const sharePdf = async () => {
    // Validation checks
    if (!selectedMonth || !selectedYear) {
      Alert.alert('Selection Required', 'Please select a month and year.');
      return;
    }
    if (reportType === 'agency' && !selectedAgency) {
      Alert.alert('Selection Required', 'Please select an agency.');
      return;
    }
    const isAnySelected = (reportType === 'agency' && (includePaid || includeMajuri || includeGeneral)) ||
                          (reportType === 'other' && (includeGeneral || includeDrivers || includeFuel));

    if (!isAnySelected) {
      Alert.alert('Selection Required', 'Please select at least one transaction type.');
      return;
    }

    if (isGeneratingPdf) {
      Alert.alert('Please Wait', 'PDF is already being generated. Please wait...');
      return;
    }

    setIsGeneratingPdf(true);
    setLoading(true);

    try {
      // Generate PDF data (same logic as generateMonthlyStatementPdf)
      const transactions = await getMonthlyTransactions(selectedMonth, selectedYear);
      
      let paid: AgencyPayment[] = [];
      let majuri: AgencyMajuri[] = [];
      let agencyGeneral: AgencyEntry[] = [];
      let generalEntries: GeneralEntry[] = [];
      let driverTransactions: DriverTransaction[] = [];
      let fuelEntries: TruckFuelEntry[] = [];

      transactions.forEach(t => {
          if (t.type === 'paid') paid.push(t.data as AgencyPayment);
          if (t.type === 'majuri') majuri.push(t.data as AgencyMajuri);
          if (t.type === 'agency_general') agencyGeneral.push(t.data as AgencyEntry);
          if (t.type === 'general') generalEntries.push(t.data as GeneralEntry);
          if (t.type === 'driver') driverTransactions.push(t.data as DriverTransaction);
          if (t.type === 'fuel') fuelEntries.push(t.data as TruckFuelEntry);
      });

      // Filter based on selected report type and agency
      if (reportType === 'agency' && selectedAgency) {
          paid = paid.filter(t => t.agency_name === selectedAgency && includePaid);
          majuri = majuri.filter(t => t.agency_name === selectedAgency && includeMajuri);
          agencyGeneral = agencyGeneral.filter(t => t.agency_name === selectedAgency && includeGeneral);
          generalEntries = [];
          driverTransactions = [];
          fuelEntries = [];
      } else if (reportType === 'other') {
          paid = [];
          majuri = [];
          agencyGeneral = [];
          generalEntries = generalEntries.filter(t => includeGeneral);
          driverTransactions = driverTransactions.filter(t => includeDrivers);
          fuelEntries = fuelEntries.filter(t => includeFuel);
      }

      // Calculate totals (same logic as original function)
      const totalPaid = paid.reduce((sum, item) => sum + item.amount, 0);
      const totalMajuri = majuri.reduce((sum, item) => sum + item.amount, 0);
      const totalGeneralCredit = generalEntries.filter(t => t.entry_type === 'credit').reduce((sum, t) => sum + t.amount, 0);
      const totalGeneralDebit = generalEntries.filter(t => t.entry_type === 'debit').reduce((sum, t) => sum + t.amount, 0);
      const totalAgencyGeneralCredit = agencyGeneral.filter(t => t.entry_type === 'credit').reduce((sum, t) => sum + t.amount, 0);
      const totalAgencyGeneralDebit = agencyGeneral.filter(t => t.entry_type === 'debit').reduce((sum, t) => sum + t.amount, 0);
      const totalDriverCredit = driverTransactions.filter(t => t.transaction_type === 'credit').reduce((sum, t) => sum + t.amount, 0);
      const totalDriverDebit = driverTransactions.filter(t => t.transaction_type === 'debit').reduce((sum, t) => sum + t.amount, 0);
      const totalFuel = fuelEntries.reduce((sum, item) => sum + item.total_price, 0);
      
      const netGeneralTotal = totalGeneralCredit - totalGeneralDebit;
      const netDriverTotal = totalDriverCredit - totalDriverDebit;
      const netAgencyGeneralTotal = totalAgencyGeneralCredit - totalAgencyGeneralDebit;
      
      const totalCredit = totalPaid + totalGeneralCredit + totalDriverCredit + totalAgencyGeneralCredit;
      const totalDebit = totalMajuri + totalGeneralDebit + totalDriverDebit + totalFuel + totalAgencyGeneralDebit;
      const netBalance = totalCredit - totalDebit;

      // Generate HTML content (truncated for brevity - same as original function)
      const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
              <title>Monthly Statement</title>
              <meta charset="UTF-8">
              <style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
      font-family: Arial, sans-serif; 
      padding: 15px; 
      background: white; 
      color: #333; 
      line-height: 1.3;
      font-size: 12px;
  }
  .header { 
      text-align: center; 
      margin-bottom: 20px; 
      border-bottom: 2px solid #2196F3; 
      padding-bottom: 10px; 
  }
  .header h1 { 
      font-size: 20px; 
      color: #1976D2; 
      margin-bottom: 5px; 
      font-weight: bold; 
  }
  .header h2 { 
      font-size: 16px; 
      color: #555; 
      margin-bottom: 5px; 
  }
  .date-range { 
      font-size: 12px; 
      color: #666; 
      font-style: italic; 
  }
  .section { 
      margin-bottom: 25px; 
      border: 1px solid #ddd; 
      border-radius: 8px; 
      overflow: hidden; 
  }
  .section-title { 
      background: linear-gradient(135deg, #2196F3, #1976D2); 
      color: white; 
      padding: 8px 12px; 
      font-size: 14px; 
      font-weight: bold; 
      margin: 0; 
  }
  .table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 0; 
  }
  .table th, .table td { 
      padding: 6px 8px; 
      text-align: left; 
      border-bottom: 1px solid #eee; 
      font-size: 11px; 
  }
  .table th { 
      background-color: #f8f9fa; 
      font-weight: bold; 
      color: #333; 
  }
  .table tr:nth-child(even) { 
      background-color: #f9f9f9; 
  }
  .table tr:hover { 
      background-color: #f0f8ff; 
  }
  .amount { 
      text-align: right; 
      font-weight: bold; 
  }
  .credit { 
      color: #4CAF50; 
  }
  .debit { 
      color: #f44336; 
  }
  .summary { 
      background: linear-gradient(135deg, #f8f9fa, #e9ecef); 
      padding: 15px; 
      border-radius: 8px; 
      margin-top: 20px; 
  }
  .summary h3 { 
      color: #1976D2; 
      margin-bottom: 10px; 
      font-size: 16px; 
  }
  .summary-row { 
      display: flex; 
      justify-content: space-between; 
      margin-bottom: 5px; 
      padding: 2px 0; 
  }
  .summary-label { 
      font-weight: bold; 
  }
  .summary-value { 
      font-weight: bold; 
  }
  .net-balance { 
      border-top: 2px solid #2196F3; 
      padding-top: 8px; 
      margin-top: 8px; 
      font-size: 14px; 
  }
  .positive { 
      color: #4CAF50; 
  }
  .negative { 
      color: #f44336; 
  }
  .footer { 
      text-align: center; 
      margin-top: 30px; 
      padding-top: 15px; 
      border-top: 1px solid #ddd; 
      font-size: 10px; 
      color: #666; 
  }
  .no-data { 
      text-align: center; 
      padding: 20px; 
      color: #666; 
      font-style: italic; 
  }
              </style>
          </head>
          <body>
              <div class="header">
                  <h1>🚛 Yash Roadlines</h1>
                  <h2>Monthly Statement Report</h2>
                  <div class="date-range">
                      ${getMonthName(selectedMonth)} ${selectedYear}${selectedAgency ? ` - ${selectedAgency}` : ''}
                  </div>
              </div>

              ${paid.length > 0 ? `
              <div class="section">
                  <h3 class="section-title">💰 Agency Paid</h3>
                  <table class="table">
                      <thead>
                          <tr>
                              <th>Date</th>
                              <th>Bill No</th>
                              <th class="amount">Amount (₹)</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${paid.map(item => `
                              <tr>
                                  <td>${formatDateTime(item.payment_date)}</td>
                                  <td>${item.bill_no}</td>
                                  <td class="amount credit">₹${item.amount.toLocaleString()}</td>
                              </tr>
                          `).join('')}
                      </tbody>
                  </table>
              </div>
              ` : ''}

              ${majuri.length > 0 ? `
              <div class="section">
                  <h3 class="section-title">🔧 Agency Majuri</h3>
                  <table class="table">
                      <thead>
                          <tr>
                              <th>Date</th>
                              <th>Description</th>
                              <th class="amount">Amount (₹)</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${majuri.map(item => `
                              <tr>
                                  <td>${formatDateTime(item.majuri_date)}</td>
                                  <td>${item.description || 'N/A'}</td>
                                  <td class="amount debit">₹${item.amount.toLocaleString()}</td>
                              </tr>
                          `).join('')}
                      </tbody>
                  </table>
              </div>
              ` : ''}

              ${agencyGeneral.length > 0 ? `
              <div class="section">
                  <h3 class="section-title">📋 Agency General Entries</h3>
                  <table class="table">
                      <thead>
                          <tr>
                              <th>Date</th>
                              <th>Description</th>
                              <th>Type</th>
                              <th class="amount">Amount (₹)</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${agencyGeneral.map(item => `
                              <tr>
                                  <td>${formatDateTime(item.entry_date)}</td>
                                  <td>${item.description}</td>
                                  <td>${item.entry_type.toUpperCase()}</td>
                                  <td class="amount ${item.entry_type === 'credit' ? 'credit' : 'debit'}">₹${item.amount.toLocaleString()}</td>
                              </tr>
                          `).join('')}
                      </tbody>
                  </table>
              </div>
              ` : ''}

              ${generalEntries.length > 0 ? `
              <div class="section">
                  <h3 class="section-title">📝 General Entries</h3>
                  <table class="table">
                      <thead>
                          <tr>
                              <th>Date</th>
                              <th>Description</th>
                              <th>Type</th>
                              <th class="amount">Amount (₹)</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${generalEntries.map(item => `
                              <tr>
                                  <td>${formatDateTime(item.entry_date)}</td>
                                  <td>${item.description}</td>
                                  <td>${item.entry_type.toUpperCase()}</td>
                                  <td class="amount ${item.entry_type === 'credit' ? 'credit' : 'debit'}">₹${item.amount.toLocaleString()}</td>
                              </tr>
                          `).join('')}
                      </tbody>
                  </table>
              </div>
              ` : ''}

              ${driverTransactions.length > 0 ? `
              <div class="section">
                  <h3 class="section-title">🧾 Uppad/Jama Entries</h3>
                  <table class="table">
                      <thead>
                          <tr>
                              <th>Date</th>
                              <th>Type (Uppad/Jama - Name)</th>
                              <th>Description</th>
                              <th class="amount">Amount (₹)</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${driverTransactions.map(item => `
                              <tr>
                                  <td>${formatDateTime(item.transaction_date)}</td>
                                  <td>${item.transaction_type === 'debit' ? 'Uppad' : 'Jama'} - ${item.driver_name}</td>
                                  <td>${item.description || 'N/A'}</td>
                                  <td class="amount ${item.transaction_type === 'credit' ? 'credit' : 'debit'}">₹${item.amount.toLocaleString()}</td>
                              </tr>
                          `).join('')}
                      </tbody>
                  </table>
              </div>
              ` : ''}

              ${fuelEntries.length > 0 ? `
              <div class="section">
                  <h3 class="section-title">⛽ Fuel Entries</h3>
                  <table class="table">
                      <thead>
                          <tr>
                              <th>Date</th>
                              <th>Truck</th>
                              <th>Fuel Type</th>
                              <th>Quantity (L)</th>
                              <th>Price/L (₹)</th>
                              <th class="amount">Total (₹)</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${fuelEntries.map(item => `
                              <tr>
                                  <td>${formatDateTime(item.fuel_date)}</td>
                                  <td>${item.truck_number}</td>
                                  <td>${item.fuel_type}</td>
                                  <td>${item.quantity}</td>
                                  <td>₹${item.price_per_liter}</td>
                                  <td class="amount debit">₹${item.total_price.toLocaleString()}</td>
                              </tr>
                          `).join('')}
                      </tbody>
                  </table>
              </div>
              ` : ''}

              <div class="summary">
                  <h3>📊 Financial Summary</h3>
                  ${totalPaid > 0 ? `<div class="summary-row"><span class="summary-label">Total Paid:</span><span class="summary-value credit">₹${totalPaid.toLocaleString()}</span></div>` : ''}
                  ${totalMajuri > 0 ? `<div class="summary-row"><span class="summary-label">Total Majuri:</span><span class="summary-value debit">₹${totalMajuri.toLocaleString()}</span></div>` : ''}
                  ${totalGeneralCredit > 0 ? `<div class="summary-row"><span class="summary-label">General Credit:</span><span class="summary-value credit">₹${totalGeneralCredit.toLocaleString()}</span></div>` : ''}
                  ${totalGeneralDebit > 0 ? `<div class="summary-row"><span class="summary-label">General Debit:</span><span class="summary-value debit">₹${totalGeneralDebit.toLocaleString()}</span></div>` : ''}
                  ${totalAgencyGeneralCredit > 0 ? `<div class="summary-row"><span class="summary-label">Agency General Credit:</span><span class="summary-value credit">₹${totalAgencyGeneralCredit.toLocaleString()}</span></div>` : ''}
                  ${totalAgencyGeneralDebit > 0 ? `<div class="summary-row"><span class="summary-label">Agency General Debit:</span><span class="summary-value debit">₹${totalAgencyGeneralDebit.toLocaleString()}</span></div>` : ''}
                  ${totalDriverCredit > 0 ? `<div class="summary-row"><span class="summary-label">Jama Total:</span><span class="summary-value credit">₹${totalDriverCredit.toLocaleString()}</span></div>` : ''}
                  ${totalDriverDebit > 0 ? `<div class="summary-row"><span class="summary-label">Uppad Total:</span><span class="summary-value debit">₹${totalDriverDebit.toLocaleString()}</span></div>` : ''}
                  ${totalFuel > 0 ? `<div class="summary-row"><span class="summary-label">Total Fuel:</span><span class="summary-value debit">₹${totalFuel.toLocaleString()}</span></div>` : ''}
                  
                  <div class="net-balance">
                     
                      <div class="summary-row">
                          <span class="summary-label">Net Balance:</span>
                          <span class="summary-value ${netBalance >= 0 ? 'positive' : 'negative'}">₹${netBalance.toLocaleString()}</span>
                      </div>
                  </div>
              </div>

              <div class="footer">
                  <p>Generated on ${new Date().toLocaleString('en-IN')} | Yash Roadlines Management System</p>
              </div>
          </body>
          </html>
        `;

      // Generate PDF using HTML to PDF for better sharing support
      console.log('Starting PDF generation...');
      
      // Create PDF in temp directory first
      const tempPdfOptions = {
        html: htmlContent,
        fileName: `Monthly_Statement_${selectedMonth}_${selectedYear}${selectedAgency ? `_${selectedAgency}` : ''}`,
        directory: 'Documents',
        base64: false,
        width: 595,
        height: 842,
      };

      console.log('PDF Options:', tempPdfOptions);
      const tempPdf = await generatePDF(tempPdfOptions);
      console.log('Temp PDF conversion result:', tempPdf);
      
      if (tempPdf && tempPdf.filePath) {
        console.log('Temp PDF generated successfully at:', tempPdf.filePath);
        
        // Create organized folder structure inside Downloads
        const now = new Date();
        const fileName = `Monthly_Statement_${selectedMonth}_${selectedYear}${selectedAgency ? `_${selectedAgency}` : ''}_${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}.pdf`;
        const appFolderPath = `${RNFS.DownloadDirectoryPath}/Yash Roadlines`;
        const monthlyFolderPath = `${appFolderPath}/Monthly Statement`;
        const finalFilePath = `${monthlyFolderPath}/${fileName}`;
        
        // Create directories if they don't exist
        try {
          await RNFS.mkdir(appFolderPath);
          await RNFS.mkdir(monthlyFolderPath);
          console.log('Created folder structure in Downloads:', monthlyFolderPath);
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
          
          setGeneratedPdfPath(finalFilePath);
          
          // Try sharing the PDF file from organized Downloads folder
          try {
            console.log('Attempting to share PDF from organized Downloads folder:', finalFilePath);
            
            const shareOptions = {
              title: 'Share Monthly Statement',
              message: `Monthly Statement for ${getMonthName(selectedMonth)} ${selectedYear}${selectedAgency ? ` - ${selectedAgency}` : ''}`,
              url: `file://${finalFilePath}`,
              type: 'application/pdf',
            };

            await Share.open(shareOptions);
            console.log('PDF shared successfully from organized Downloads folder');
            
          } catch (shareError) {
            console.log('Sharing failed, showing organized Downloads location:', shareError);
            
            // Show success message with organized Downloads location
            Alert.alert(
              'PDF Saved Successfully! 📄',
              `Monthly statement has been saved to organized Downloads folder.\n\nFile: ${fileName}\n\nLocation: Downloads/Yash Roadlines/Monthly Statement/\n\nYou can find it in:\n• File Manager > Downloads > Yash Roadlines > Monthly Statement\n• Share it via WhatsApp, Gmail, etc.`,
              [{ text: 'OK', style: 'default' }]
            );
          }
          
        } catch (copyError) {
          console.log('Failed to copy to Downloads folder:', copyError);
          
          // Fallback to temp file sharing
          try {
            const shareOptions = {
              title: 'Share Monthly Statement',
              message: `Monthly Statement for ${getMonthName(selectedMonth)} ${selectedYear}${selectedAgency ? ` - ${selectedAgency}` : ''}`,
              url: `file://${tempPdf.filePath}`,
              type: 'application/pdf',
            };

            await Share.open(shareOptions);
            console.log('PDF shared successfully from temp location');
            
          } catch (shareError) {
            Alert.alert(
              'PDF Generated! 📄',
              `Monthly statement generated successfully!\n\nFile saved temporarily. Please try sharing again or check your file manager.`,
              [{ text: 'OK', style: 'default' }]
            );
          }
        }
        
      } else {
        console.log('PDF generation failed - no file path');
        Alert.alert(
          'Error', 
          'Failed to generate PDF for sharing. Please try again.'
        );
      }
      
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert(
        'Error', 
        'Failed to generate PDF. Please try again.'
      );
    } finally {
      setIsGeneratingPdf(false);
      setLoading(false);
    }
  };
  
  const generateMonthlyStatementPdf = async () => {
    if (!selectedMonth || !selectedYear) {
        Alert.alert('Selection Required', 'Please select a month and year.');
        return;
    }
    if (reportType === 'agency' && !selectedAgency) {
        Alert.alert('Selection Required', 'Please select an agency.');
        return;
    }
    const isAnySelected = (reportType === 'agency' && (includePaid || includeMajuri || includeGeneral)) ||
                          (reportType === 'other' && (includeGeneral || includeDrivers || includeFuel));

    if (!isAnySelected) {
        Alert.alert('Selection Required', 'Please select at least one transaction type.');
        return;
    }

    if (isGeneratingPdf) {
      Alert.alert('Please Wait', 'PDF is already being generated. Please wait...');
      return;
    }

    setIsGeneratingPdf(true);
    setLoading(true);

    try {
        const transactions = await getMonthlyTransactions(selectedMonth, selectedYear);
        
        let paid: AgencyPayment[] = [];
        let majuri: AgencyMajuri[] = [];
        let agencyGeneral: AgencyEntry[] = [];
        let generalEntries: GeneralEntry[] = [];
        let driverTransactions: DriverTransaction[] = [];
        let fuelEntries: TruckFuelEntry[] = [];

        transactions.forEach(t => {
            if (t.type === 'paid') paid.push(t.data as AgencyPayment);
            if (t.type === 'majuri') majuri.push(t.data as AgencyMajuri);
            if (t.type === 'agency_general') agencyGeneral.push(t.data as AgencyEntry);
            if (t.type === 'general') generalEntries.push(t.data as GeneralEntry);
            if (t.type === 'driver') driverTransactions.push(t.data as DriverTransaction);
            if (t.type === 'fuel') fuelEntries.push(t.data as TruckFuelEntry);
        });

        // Filter based on selected report type and agency
        if (reportType === 'agency' && selectedAgency) {
            paid = paid.filter(t => t.agency_name === selectedAgency && includePaid);
            majuri = majuri.filter(t => t.agency_name === selectedAgency && includeMajuri);
            agencyGeneral = agencyGeneral.filter(t => t.agency_name === selectedAgency && includeGeneral);
            generalEntries = [];
            driverTransactions = [];
            fuelEntries = [];
        } else if (reportType === 'other') {
            paid = [];
            majuri = [];
            agencyGeneral = [];
            generalEntries = generalEntries.filter(t => includeGeneral);
            driverTransactions = driverTransactions.filter(t => includeDrivers);
            fuelEntries = fuelEntries.filter(t => includeFuel);
        }

        // Calculate totals
        const totalPaid = paid.reduce((sum, item) => sum + item.amount, 0);
        const totalMajuri = majuri.reduce((sum, item) => sum + item.amount, 0);
        const totalGeneralCredit = generalEntries.filter(t => t.entry_type === 'credit').reduce((sum, t) => sum + t.amount, 0);
        const totalGeneralDebit = generalEntries.filter(t => t.entry_type === 'debit').reduce((sum, t) => sum + t.amount, 0);
        const totalAgencyGeneralCredit = agencyGeneral.filter(t => t.entry_type === 'credit').reduce((sum, t) => sum + t.amount, 0);
        const totalAgencyGeneralDebit = agencyGeneral.filter(t => t.entry_type === 'debit').reduce((sum, t) => sum + t.amount, 0);
        const totalDriverCredit = driverTransactions.filter(t => t.transaction_type === 'credit').reduce((sum, t) => sum + t.amount, 0);
        const totalDriverDebit = driverTransactions.filter(t => t.transaction_type === 'debit').reduce((sum, t) => sum + t.amount, 0);
        const totalFuel = fuelEntries.reduce((sum, item) => sum + item.total_price, 0);
        
        const netGeneralTotal = totalGeneralCredit - totalGeneralDebit;
        const netDriverTotal = totalDriverCredit - totalDriverDebit;
        const netAgencyGeneralTotal = totalAgencyGeneralCredit - totalAgencyGeneralDebit;
        
        const totalCredit = totalPaid + totalGeneralCredit + totalDriverCredit + totalAgencyGeneralCredit;
        const totalDebit = totalMajuri + totalGeneralDebit + totalDriverDebit + totalFuel + totalAgencyGeneralDebit;
        const netBalance = totalCredit - totalDebit;

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Monthly Statement</title>
                <meta charset="UTF-8">
                <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
        font-family: Arial, sans-serif; 
        padding: 15px; 
        background: white; 
        color: #333; 
        line-height: 1.3;
        font-size: 12px;
    }
    .header { 
        text-align: center; 
        margin-bottom: 20px; 
        border-bottom: 2px solid #2196F3; 
        padding-bottom: 10px; 
    }
    .header h1 { 
        font-size: 20px; 
        color: #1976D2; 
        margin-bottom: 5px; 
        font-weight: bold; 
    }
    .header h2 { 
        font-size: 16px; 
        color: #555; 
        margin-bottom: 5px; 
    }
    .date-range { 
        font-size: 12px; 
        color: #666; 
        font-style: italic; 
    }
    .section { 
        margin-bottom: 15px; 
        page-break-inside: avoid; 
    }
    .section h3 { 
        color: #1976D2; 
        font-size: 14px; 
        margin-bottom: 8px; 
        padding: 5px 0; 
        border-bottom: 1px solid #E3F2FD; 
    }
    table { 
        width: 100%; 
        border-collapse: collapse; 
        margin-bottom: 10px; 
        font-size: 10px; 
        page-break-inside: avoid; 
    }
    th, td { 
        border: 1px solid #ddd; 
        padding: 4px 6px; 
        text-align: left; 
        vertical-align: top; 
    }
    th { 
        background-color: #f8f9fa; 
        color: #333; 
        font-weight: bold; 
        font-size: 10px; 
    }
    .credit-amount { color: #2E7D32; font-weight: bold; }
    .debit-amount { color: #C62828; font-weight: bold; }
    .summary { 
        margin-top: 15px; 
        padding: 10px; 
        border: 2px solid #1976D2; 
        border-radius: 5px; 
        background-color: #f5f5f5; 
        page-break-inside: avoid; 
    }
    .summary h3 { 
        margin-top: 0; 
        margin-bottom: 10px; 
        text-align: center; 
        color: #1976D2; 
        border-bottom: none; 
        font-size: 14px;
    }
    .summary-row { 
        display: flex; 
        justify-content: space-between; 
        margin-bottom: 5px; 
        font-size: 12px; 
    }
    .net-balance { 
        font-size: 14px; 
        font-weight: bold; 
        color: ${netBalance >= 0 ? '#2E7D32' : '#C62828'}; 
        border-top: 1px solid #333; 
        padding-top: 8px; 
        margin-top: 8px; 
    }
    .no-data { 
        text-align: center; 
        color: #666; 
        font-style: italic; 
        padding: 10px; 
        background-color: #f9f9f9; 
        border-radius: 3px; 
        margin-bottom: 10px;
    }
    .footer { 
        text-align: center; 
        margin-top: 15px; 
        padding-top: 10px; 
        border-top: 1px solid #ddd; 
        font-size: 9px; 
        color: #666; 
    }
    /* Compact print styles */
    @media print { 
        body { 
            font-size: 10px; 
            padding: 10px;
        } 
        .section { 
            break-inside: avoid; 
            margin-bottom: 10px;
        } 
        table { 
            break-inside: avoid; 
            margin-bottom: 8px;
        }
        .header {
            margin-bottom: 15px;
        }
        .summary {
            margin-top: 10px;
        }
    }
    /* Remove extra spacing */
    .section:last-child {
        margin-bottom: 5px;
    }
    table tbody tr:last-child td {
        border-bottom: 1px solid #ddd;
    }
</style>
            </head>
            <body>
                <div class="header">
                    <h1>YASH ROADLINES</h1>
                    <h2>Monthly Statement Report</h2>
                    <p class="date-range">Report for ${monthOptions.find(m => m.value === selectedMonth)?.label}, ${selectedYear}</p>
                </div>
                
                ${reportType === 'agency' && selectedAgency ? `
                <div class="section">
                    <h3>Agency: ${selectedAgency}</h3>
                </div>
                ` : ''}

                ${reportType === 'agency' && includePaid && paid.length > 0 ? `
                <div class="section">
                    <h3>💰 Paid (Credit) - ${paid.length} entries</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 10%;">Sr.</th>
                                <th style="width: 50%;">Date & Time</th>
                                <th style="width: 40%;">Bill No.</th>
                                <th style="width: 40%;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${paid.map((item, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${formatDateTime(item.payment_date)}</td>
                                    <td>${item.bill_no || 'N/A'}</td>
                                    <td class="credit-amount">₹${item.amount.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</td>
                                </tr>
                            `).join('')}
                            <tr style="background-color: #f8f9fa; font-weight: bold;">
                                <td colspan="3" style="text-align: right; padding-right: 10px;">Total Paid:</td>
                                <td class="credit-amount">₹${totalPaid.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                ` : reportType === 'agency' && includePaid ? '<div class="section"><div class="no-data">No paid transactions found for this agency</div></div>' : ''}

                ${reportType === 'agency' && includeMajuri && majuri.length > 0 ? `
                <div class="section">
                    <h3>💸 Majuri (Debit) - ${majuri.length} entries</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 10%;">Sr.</th>
                                <th style="width: 50%;">Date & Time</th>
                                <th style="width: 40%;">Description</th>
                                <th style="width: 40%;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${majuri.map((item, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${formatDateTime(item.majuri_date)}</td>
                                    <td>${item.description || 'N/A'}</td>
                                    <td class="debit-amount">₹${item.amount.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</td>
                                </tr>
                            `).join('')}
                            <tr style="background-color: #f8f9fa; font-weight: bold;">
                                <td colspan="3" style="text-align: right; padding-right: 10px;">Total Majuri:</td>
                                <td class="debit-amount">₹${totalMajuri.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                ` : reportType === 'agency' && includeMajuri ? '<div class="section"><div class="no-data">No majuri transactions found for this agency</div></div>' : ''}
                
                ${reportType === 'agency' && includeGeneral && agencyGeneral.length > 0 ? `
                <div class="section">
                    <h3>🔄 General Entries (Agency) - ${agencyGeneral.length} entries</h3>
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
                                      ${item.entry_type === 'debit' ? '-' : ''} ₹${item.amount.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</td>
                                </tr>
                            `).join('')}
                            <tr style="background-color: #f8f9fa; font-weight: bold;">
                                <td colspan="3" style="text-align: right; padding-right: 10px;">Total General:</td>
                                <td class="${netAgencyGeneralTotal >= 0 ? 'credit-amount' : 'debit-amount'}">${netAgencyGeneralTotal < 0 ? '-' : ''}₹${Math.abs(netAgencyGeneralTotal).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                ` : reportType === 'agency' && includeGeneral ? '<div class="section"><div class="no-data">No general entries found for this agency</div></div>' : ''}
                
                ${reportType === 'other' && includeGeneral && generalEntries.length > 0 ? `
                <div class="section">
                    <h3>📝 General Entries - ${generalEntries.length} entries</h3>
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
                            ${generalEntries.map((item, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${item.entry_type}</td>
                                    <td>${item.description || 'N/A'}</td>
                                    <td class="${item.entry_type === 'credit' ? 'credit-amount' : 'debit-amount'}">
                                      ${item.entry_type === 'debit' ? '-' : ''} ₹${item.amount.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</td>
                                </tr>
                            `).join('')}
                            <tr style="background-color: #f8f9fa; font-weight: bold;">
                                <td colspan="3" style="text-align: right; padding-right: 10px;">Total General:</td>
                                <td class="${netGeneralTotal >= 0 ? 'credit-amount' : 'debit-amount'}">${netGeneralTotal < 0 ? '-' : ''}₹${Math.abs(netGeneralTotal).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                ` : reportType === 'other' && includeGeneral ? '<div class="section"><div class="no-data">No general entries found</div></div>' : ''}
                
                ${reportType === 'other' && includeDrivers && driverTransactions.length > 0 ? `
                <div class="section">
                    <h3>🧾 Uppad/Jama Entries - ${driverTransactions.length} entries</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 10%;">Sr.</th>
                                <th style="width: 40%;">Type (Uppad/Jama - Name)</th>
                                <th style="width: 30%;">Description</th>
                                <th style="width: 20%;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${driverTransactions.map((item, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${item.transaction_type === 'debit' ? 'Uppad' : 'Jama'} - ${item.driver_name}</td>
                                    <td>${item.description || 'N/A'}</td>
                                    <td class="${item.transaction_type === 'credit' ? 'credit-amount' : 'debit-amount'}">
                                      ${item.transaction_type === 'debit' ? '-' : ''} ₹${item.amount.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</td>
                                </tr>
                            `).join('')}
                            <tr style="background-color: #f8f9fa; font-weight: bold;">
                                <td colspan="3" style="text-align: right; padding-right: 10px;">Driver (Jama - Uppad) Net:</td>
                                <td class="${netDriverTotal >= 0 ? 'credit-amount' : 'debit-amount'}">${netDriverTotal < 0 ? '-' : ''}₹${Math.abs(netDriverTotal).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                ` : reportType === 'other' && includeDrivers ? '<div class="section"><div class="no-data">No Uppad/Jama entries found</div></div>' : ''}

                ${reportType === 'other' && includeFuel && fuelEntries.length > 0 ? `
                <div class="section">
                    <h3>⛽ Fuel Entries - ${fuelEntries.length} entries</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 10%;">Sr.</th>
                                <th style="width: 25%;">Truck</th>
                                <th style="width: 20%;">Fuel Type</th>
                                <th style="width: 15%;">Qty</th>
                                <th style="width: 15%;">Price/L</th>
                                <th style="width: 15%;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${fuelEntries.map((item, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${item.truck_number}</td>
                                    <td>${item.fuel_type}</td>
                                    <td>${item.quantity} L</td>
                                    <td>₹${item.price_per_liter.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</td>
                                    <td class="debit-amount">₹${item.total_price.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</td>
                                </tr>
                            `).join('')}
                            <tr style="background-color: #f8f9fa; font-weight: bold;">
                                <td colspan="5" style="text-align: right; padding-right: 10px;">Total Fuel:</td>
                                <td class="debit-amount">₹${totalFuel.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                ` : reportType === 'other' && includeFuel ? '<div class="section"><div class="no-data">No fuel entries found</div></div>' : ''}
                
                <div class="summary">
                    <h3>📊 Financial Summary</h3>
                    ${reportType === 'agency' ? `
                    <div class="summary-row"><span>Total Payments:</span><span class="credit-amount">₹${totalPaid.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</span></div>
                    <div class="summary-row"><span>Total Majuri:</span><span class="debit-amount">₹${totalMajuri.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</span></div>
                    <div class="summary-row"><span>Total General (Agency):</span><span class="${netAgencyGeneralTotal >= 0 ? 'credit-amount' : 'debit-amount'}">${netAgencyGeneralTotal < 0 ? '-' : ''}₹${Math.abs(netAgencyGeneralTotal).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</span></div>
                    ` : ''}

                    ${reportType === 'other' ? `
                    <div class="summary-row"><span>Total General:</span><span class="${netGeneralTotal >= 0 ? 'credit-amount' : 'debit-amount'}">${netGeneralTotal < 0 ? '-' : ''}₹${Math.abs(netGeneralTotal).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</span></div>
                    <div class="summary-row"><span>Driver (Jama - Uppad) Net:</span><span class="${netDriverTotal >= 0 ? 'credit-amount' : 'debit-amount'}">${netDriverTotal < 0 ? '-' : ''}₹${Math.abs(netDriverTotal).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</span></div>
                    <div class="summary-row"><span>Total Fuel:</span><span class="debit-amount">₹${totalFuel.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</span></div>
                    ` : ''}

                    <div class="summary-row" style="border-top: 1px solid #333; padding-top: 8px; margin-top: 8px;">
                        <span style="font-weight: bold;">Total Credit:</span>
                        <span class="credit-amount">₹${totalCredit.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</span>
                    </div>
                    <div class="summary-row">
                        <span style="font-weight: bold;">Total Debit:</span>
                        <span class="debit-amount">₹${totalDebit.toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}</span>
                    </div>

                    <div class="summary-row net-balance">
                        <span>Total Net Balance:</span>
                        <span>₹${Math.abs(netBalance).toLocaleString('en-IN', {maximumFractionDigits: 2, minimumFractionDigits: 2})}${netBalance < 0 ? ' (Due)' : ' (Credit)'}</span>
                    </div>
                </div>
                
                <div class="footer">
                    <div><strong>YASH ROADLINES</strong></div>
                    <div>Report Generated on: ${new Date().toLocaleString('en-IN', {
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

        const fileName = `Monthly_Statement_${selectedYear}-${selectedMonth}`;
        // Generate PDF and store file path
        const results = await RNPrint.print({ 
          html: htmlContent
        });
        
        // Store PDF path for sharing later
        if (results && results.filePath) {
          setGeneratedPdfPath(results.filePath);
          Alert.alert(
            'PDF Generated! 📄', 
            `Monthly statement generated successfully! You can now share it using the Share button.`,
            [{ text: 'OK', style: 'default' }]
          );
        } else {
          Alert.alert(
            'Success! 📄', 
            `Monthly statement report generated successfully!`,
            [{ text: 'OK', style: 'default' }]
          );
        }

    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert(
        'PDF Generation Error', 
        'Failed to generate the statement report. Please try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: generateMonthlyStatementPdf, style: 'default' }
        ]
      );
    } finally {
      setIsGeneratingPdf(false);
      setLoading(false);
    }
  };

  return (
    <View style={GlobalStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Monthly Statement</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={GlobalStyles.card}>
          <Text style={[GlobalStyles.title, styles.cardTitle]}>Generate Monthly Report</Text>
          <Text style={GlobalStyles.bodyText}>Select a month and year to create a detailed statement.</Text>

          <View style={styles.tabContainer}>
            <TouchableOpacity
                onPress={() => setReportType('agency')}
                style={[styles.tabButton, reportType === 'agency' ? styles.activeTab : styles.inactiveTab]}
            >
                <Text style={[styles.tabText, reportType === 'agency' ? styles.activeTabText : null]}>
                    Agency Monthly
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => setReportType('other')}
                style={[styles.tabButton, reportType === 'other' ? styles.activeTab : styles.inactiveTab]}
            >
                <Text style={[styles.tabText, reportType === 'other' ? styles.activeTabText : null]}>
                    Other Monthly
                </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerWrapper}>
              <CustomDropdown
                label="Select Month"
                options={monthOptions}
                selectedValue={selectedMonth}
                onValueChange={setSelectedMonth}
                placeholder="Month"
                enabled={!loading}
              />
            </View>
            <View style={styles.datePickerWrapper}>
              <CustomDropdown
                label="Select Year"
                options={yearOptions}
                selectedValue={selectedYear}
                onValueChange={setSelectedYear}
                placeholder="Year"
                enabled={!loading}
              />
            </View>
          </View>
          
          {reportType === 'agency' ? (
              <View style={styles.checkboxGroup}>
                <Text style={styles.checkboxTitle}>Agency Transactions:</Text>
                <CustomDropdown
                    label="Select Agency"
                    options={agencyOptions}
                    selectedValue={selectedAgency}
                    onValueChange={setSelectedAgency}
                    placeholder={agencyOptions.length > 0 ? "Choose Agency" : "No Agencies Available"}
                    enabled={!loading}
                />
                <View style={styles.checkboxWrapper}>
                  <CheckBox
                    value={includePaid}
                    onValueChange={setIncludePaid}
                    tintColors={{ true: Colors.primary, false: Colors.textSecondary }}
                    disabled={loading}
                  />
                  <Text style={styles.checkBoxText}>Paid (Credit)</Text>
                </View>
                <View style={styles.checkboxWrapper}>
                  <CheckBox
                    value={includeMajuri}
                    onValueChange={setIncludeMajuri}
                    tintColors={{ true: Colors.primary, false: Colors.textSecondary }}
                    disabled={loading}
                  />
                  <Text style={styles.checkBoxText}>Majuri (Debit)</Text>
                </View>
                <View style={styles.checkboxWrapper}>
                  <CheckBox
                    value={includeGeneral}
                    onValueChange={setIncludeGeneral}
                    tintColors={{ true: Colors.primary, false: Colors.textSecondary }}
                    disabled={loading}
                  />
                  <Text style={styles.checkBoxText}>General Entries (Agency)</Text>
                </View>
              </View>
          ) : (
            <View style={styles.checkboxGroup}>
              <Text style={styles.checkboxTitle}>Other Transactions:</Text>
              <View style={styles.checkboxWrapper}>
                <CheckBox
                  value={includeGeneral}
                  onValueChange={setIncludeGeneral}
                  tintColors={{ true: Colors.primary, false: Colors.textSecondary }}
                  disabled={loading}
                />
                <Text style={styles.checkBoxText}>General Entries</Text>
              </View>
              <View style={styles.checkboxWrapper}>
                <CheckBox
                  value={includeDrivers}
                  onValueChange={setIncludeDrivers}
                  tintColors={{ true: Colors.primary, false: Colors.textSecondary }}
                  disabled={loading}
                />
                <Text style={styles.checkBoxText}>Driver Transactions</Text>
              </View>
              <View style={styles.checkboxWrapper}>
                <CheckBox
                  value={includeFuel}
                  onValueChange={setIncludeFuel}
                  tintColors={{ true: Colors.primary, false: Colors.textSecondary }}
                  disabled={loading}
                />
                <Text style={styles.checkBoxText}>Fuel Entries</Text>
              </View>
            </View>
          )}
          
          {/* Share PDF Button */}
          <TouchableOpacity
            onPress={sharePdf}
            disabled={isGeneratingPdf || loading || (reportType === 'agency' && !selectedAgency) ||
                      (reportType === 'agency' && (!includePaid && !includeMajuri && !includeGeneral)) ||
                      (reportType === 'other' && (!includeGeneral && !includeDrivers && !includeFuel))}
            style={[
                GlobalStyles.buttonPrimary,
                styles.shareButton,
                (isGeneratingPdf || loading) && styles.disabledButton,
            ]}
          >
            <Icon name="share-outline" size={20} color={Colors.surface} style={styles.shareIcon} />
            <Text style={GlobalStyles.buttonPrimaryText}>
              {isGeneratingPdf ? 'Preparing to Share...' : 'Share PDF'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity
        onPress={goBack}
        style={[GlobalStyles.buttonPrimary, styles.bottomBackButton]}
      >
        <Text style={GlobalStyles.buttonPrimaryText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    paddingVertical: 20,
    flexGrow: 1,
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
  cardTitle: {
    marginBottom: 16,
    fontSize: 22,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 10,
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  datePickerWrapper: {
    flex: 1,
  },
  checkboxGroup: {
    marginTop: 10,
    marginBottom: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkboxTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  checkBoxText: {
    color: Colors.textPrimary,
    fontWeight: 'normal',
    fontSize: 15,
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.8,
    elevation: 1,
    shadowOpacity: 0.1,
  },
  shareButton: {
    backgroundColor: '#4CAF50', // Green color for share button
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIcon: {
    marginRight: 8,
  },
  bottomBackButton: {
    backgroundColor: Colors.textSecondary,
    marginBottom: 16,
    marginHorizontal: 12,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    position: 'absolute',
    maxHeight: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
});

export default MonthlyStatementScreen;