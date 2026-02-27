/**
 * Debug utility to check delivery data in database and cache
 */

import { supabase } from '../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OFFLINE_KEYS } from '../data/Storage';

export const debugDeliveryData = async () => {
  console.log('🔍 ===== DELIVERY DATA DEBUG =====');
  
  try {
    // Check online data
    const { data: onlineData, error } = await supabase
      .from('agency_entries')
      .select('id, agency_name, billty_no, amount, confirmation_status, entry_date, office_id')
      .eq('agency_name', 'Mumbai')
      .order('entry_date', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Error fetching online data:', error);
    } else {
      console.log('📊 Online Mumbai Deliveries (last 10):');
      onlineData?.forEach((record, index) => {
        console.log(`  ${index + 1}. ID: ${record.id}`);
        console.log(`     Billty: ${record.billty_no}`);
        console.log(`     Amount: ₹${record.amount}`);
        console.log(`     Status: ${record.confirmation_status || 'NULL'}`);
        console.log(`     Date: ${record.entry_date}`);
        console.log(`     Office: ${record.office_id || 'NULL'}`);
        console.log('     ---');
      });
      
      // Count by status
      const { data: statusCounts } = await supabase
        .from('agency_entries')
        .select('confirmation_status', { count: 'exact' })
        .eq('agency_name', 'Mumbai');
      
      const pending = statusCounts?.filter(r => r.confirmation_status === 'pending').length || 0;
      const confirmed = statusCounts?.filter(r => r.confirmation_status === 'confirmed').length || 0;
      const nullStatus = statusCounts?.filter(r => !r.confirmation_status).length || 0;
      
      console.log('📈 Status Summary:');
      console.log(`   Pending: ${pending}`);
      console.log(`   Confirmed: ${confirmed}`);
      console.log(`   NULL (Legacy): ${nullStatus}`);
      console.log(`   Total: ${statusCounts?.length || 0}`);
    }
    
    // Check cache data
    const deliveryCache = await AsyncStorage.getItem(OFFLINE_KEYS.DELIVERY_RECORDS);
    const agencyCache = await AsyncStorage.getItem(OFFLINE_KEYS.AGENCY_ENTRIES);
    
    if (deliveryCache) {
      const deliveryRecords = JSON.parse(deliveryCache);
      const mumbaiRecords = deliveryRecords.filter((r: any) => r.agency_name === 'Mumbai');
      console.log(`💾 DELIVERY_RECORDS Cache: ${mumbaiRecords.length} Mumbai records`);
    } else {
      console.log('💾 DELIVERY_RECORDS Cache: Empty');
    }
    
    if (agencyCache) {
      const agencyRecords = JSON.parse(agencyCache);
      const mumbaiRecords = agencyRecords.filter((r: any) => r.agency_name === 'Mumbai');
      console.log(`💾 AGENCY_ENTRIES Cache: ${mumbaiRecords.length} Mumbai records`);
      
      // Show first 5 from cache
      console.log('📋 Cache Sample (first 5):');
      mumbaiRecords.slice(0, 5).forEach((record: any, index: number) => {
        console.log(`  ${index + 1}. Billty: ${record.billty_no}, Status: ${record.confirmation_status || 'NULL'}, Date: ${record.entry_date}`);
      });
    } else {
      console.log('💾 AGENCY_ENTRIES Cache: Empty');
    }
    
    console.log('🔍 ===== DEBUG COMPLETE =====');
    
    return {
      onlineCount: onlineData?.length || 0,
      cacheCount: agencyCache ? JSON.parse(agencyCache).filter((r: any) => r.agency_name === 'Mumbai').length : 0,
    };
  } catch (error) {
    console.error('❌ Debug failed:', error);
    return null;
  }
};

/**
 * Clear all caches to force fresh data load
 */
export const clearAllCaches = async () => {
  try {
    console.log('🧹 Clearing all caches...');
    await AsyncStorage.removeItem(OFFLINE_KEYS.DELIVERY_RECORDS);
    await AsyncStorage.removeItem(OFFLINE_KEYS.AGENCY_ENTRIES);
    console.log('✅ Caches cleared');
  } catch (error) {
    console.error('❌ Failed to clear caches:', error);
  }
};
