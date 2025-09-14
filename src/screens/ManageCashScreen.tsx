import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Text,
  Platform,
  TextInput, 
  TouchableOpacity, 
  Alert,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { supabase } from '../supabase';
import { useAlert } from '../context/AlertContext';

interface ManageCashParams {
  selectedDateKey: string; // yyyy-mm-dd
  initialAdjustment: number;
}

const ManageCashScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'ManageCash'>>();
  const { selectedDateKey, initialAdjustment } = (route.params || {}) as any as ManageCashParams;
  
  const [amount, setAmount] = useState<string>('');
  const [adjustment, setAdjustment] = useState<number>(initialAdjustment || 0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const alert = useAlert();

  const dateKey = selectedDateKey;

  const saveAdjustment = async (newAdjustment: number) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('daily_cash_adjustments')
        .upsert(
          { 
            date_key: dateKey, 
            adjustment: newAdjustment,
            updated_at: new Date().toISOString()
          }, 
          { onConflict: 'date_key' }
        );

      if (error) throw error;
      
      setAdjustment(newAdjustment);
      alert.showAlert('Cash adjustment saved successfully!');
      return true;
    } catch (error) {
      console.error('Error saving adjustment:', error);
      alert.showAlert('Failed to save adjustment');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    const amt = parseFloat(amount) || 0;
    if (!amt) return;
    
    const newAdjustment = adjustment + amt;
    await saveAdjustment(newAdjustment);
    setAmount('');
  };

  const handleSubtract = async () => {
    const amt = parseFloat(amount) || 0;
    if (!amt) return;
    
    const newAdjustment = adjustment - amt;
    await saveAdjustment(newAdjustment);
    setAmount('');
  };

  const handleClear = async () => {
    const success = await saveAdjustment(0);
    if (success) {
      alert.showAlert('Cash adjustment cleared!');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Cash</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.currentAdjustmentContainer}>
          <Text style={styles.currentLabel}>Current Adjustment:</Text>
          <Text style={[styles.currentAmount, adjustment >= 0 ? styles.positive : styles.negative]}>
            {adjustment >= 0 ? '+' : ''}{adjustment.toLocaleString('en-IN', { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })}
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.addButton]} 
            onPress={handleAdd}
            disabled={!amount || isLoading}
          >
            <Text style={styles.buttonText}>Add</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.subtractButton]} 
            onPress={handleSubtract}
            disabled={!amount || isLoading}
          >
            <Text style={styles.buttonText}>Subtract</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={handleClear}
          disabled={!adjustment || isLoading}
        >
          <Text style={styles.buttonText}>Clear Adjustment</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#3498db',
    borderBottomWidth: 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: '100%',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
    marginRight: 24, // To balance the back button space
  },
  content: {
    flex: 1,
    padding: 20,
  },
  currentAdjustmentContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  currentLabel: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  currentAmount: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  positive: {
    color: '#2ecc71',
  },
  negative: {
    color: '#e74c3c',
  },
  inputContainer: {
    marginBottom: 20,
  },
  amountInput: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#ddd',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  addButton: {
    backgroundColor: '#2ecc71',
    marginRight: 10,
  },
  subtractButton: {
    backgroundColor: '#e74c3c',
    marginLeft: 10,
  },
  clearButton: {
    backgroundColor: '#f39c12',
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ManageCashScreen;
