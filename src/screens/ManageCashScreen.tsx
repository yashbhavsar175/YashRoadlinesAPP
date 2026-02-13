import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Platform,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { supabase } from '../supabase';
import { useAlert } from '../context/AlertContext';
import { useOffice } from '../context/OfficeContext';
import { CommonHeader, CommonInput } from '../components';

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
  const { getCurrentOfficeId } = useOffice();

  const dateKey = selectedDateKey;

  const saveAdjustment = async (newAdjustment: number) => {
    try {
      setIsLoading(true);
      
      const officeId = getCurrentOfficeId();
      if (!officeId) {
        alert.showAlert('No office selected. Please select an office first.');
        return false;
      }

      const { error } = await supabase
        .from('daily_cash_adjustments')
        .upsert(
          {
            date_key: dateKey,
            office_id: officeId,
            adjustment: newAdjustment,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'date_key,office_id' }
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
      <CommonHeader title="Manage Cash" onBackPress={() => navigation.goBack()} />

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
          <CommonInput
            label=""
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            keyboardType="numeric"
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
