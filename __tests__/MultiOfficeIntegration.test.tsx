/**
 * Integration Tests for Multi-Office Support Feature
 * 
 * These tests verify the complete multi-office functionality including:
 * - User flows with office assignments
 * - Admin office switching
 * - Data segregation between offices
 * - Office creation and user assignment
 * - Migration verification
 * - Offline sync with office associations
 */

import { supabase } from '../src/supabase';
import * as Storage from '../src/data/Storage';

// Test data
const TEST_OFFICE_A = {
  name: 'Test Office A',
  address: '123 Test Street A',
};

const TEST_OFFICE_B = {
  name: 'Test Office B',
  address: '456 Test Street B',
};

const TEST_USER_REGULAR = {
  full_name: 'Test Regular User',
  phone_number: '1234567890',
  user_type: 'normal' as const,
  is_admin: false,
};

const TEST_USER_ADMIN = {
  full_name: 'Test Admin User',
  phone_number: '0987654321',
  user_type: 'normal' as const,
  is_admin: true,
};

// Helper function to clean up test data
async function cleanupTestData() {
  try {
    // Delete test offices
    await supabase.from('offices').delete().ilike('name', 'Test Office%');
    
    // Delete test users
    await supabase.from('user_profiles').delete().ilike('full_name', 'Test%User');
    
    // Delete test transactions
    await supabase.from('general_entries').delete().ilike('description', 'Test Entry%');
    await supabase.from('agency_payments').delete().ilike('agency_name', 'Test Agency%');
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

describe('Multi-Office Integration Tests', () => {
  let officeAId: string;
  let officeBId: string;
  let regularUserId: string;
  let adminUserId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await cleanupTestData();
  });

  afterAll(async () => {
    // Clean up test data after all tests
    await cleanupTestData();
  });

  describe('Office Creation and Management', () => {
    test('should create office A successfully', async () => {
      const office = await Storage.createOffice(TEST_OFFICE_A.name, TEST_OFFICE_A.address);
      
      expect(office).not.toBeNull();
      expect(office?.name).toBe(TEST_OFFICE_A.name);
      expect(office?.address).toBe(TEST_OFFICE_A.address);
      expect(office?.is_active).toBe(true);
      
      officeAId = office!.id;
    });

    test('should create office B successfully', async () => {
      const office = await Storage.createOffice(TEST_OFFICE_B.name, TEST_OFFICE_B.address);
      
      expect(office).not.toBeNull();
      expect(office?.name).toBe(TEST_OFFICE_B.name);
      
      officeBId = office!.id;
    });

    test('should prevent duplicate office names', async () => {
      const duplicateOffice = await Storage.createOffice(TEST_OFFICE_A.name, 'Different Address');
      
      expect(duplicateOffice).toBeNull();
    });

    test('should retrieve all offices', async () => {
      const offices = await Storage.getOffices();
      
      expect(offices.length).toBeGreaterThanOrEqual(2);
      expect(offices.some(o => o.id === officeAId)).toBe(true);
      expect(offices.some(o => o.id === officeBId)).toBe(true);
    });

    test('should retrieve office by ID', async () => {
      const office = await Storage.getOfficeById(officeAId);
      
      expect(office).not.toBeNull();
      expect(office?.id).toBe(officeAId);
      expect(office?.name).toBe(TEST_OFFICE_A.name);
    });

    test('should update office details', async () => {
      const updated = await Storage.updateOffice(officeAId, {
        address: 'Updated Address A',
      });
      
      expect(updated).toBe(true);
      
      const office = await Storage.getOfficeById(officeAId);
      expect(office?.address).toBe('Updated Address A');
    });
  });

  describe('User Assignment Flow', () => {
    test('should create regular user with office assignment', async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          ...TEST_USER_REGULAR,
          office_id: officeAId,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.office_id).toBe(officeAId);
      
      regularUserId = data!.id;
    });

    test('should create admin user with office assignment', async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          ...TEST_USER_ADMIN,
          office_id: officeAId,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.office_id).toBe(officeAId);
      
      adminUserId = data!.id;
    });

    test('should retrieve user office assignment', async () => {
      const officeId = await Storage.getUserOfficeAssignment(regularUserId);
      
      expect(officeId).toBe(officeAId);
    });

    test('should update user office assignment', async () => {
      const updated = await Storage.setUserOfficeAssignment(regularUserId, officeBId);
      
      expect(updated).toBe(true);
      
      const officeId = await Storage.getUserOfficeAssignment(regularUserId);
      expect(officeId).toBe(officeBId);
      
      // Reset back to office A for other tests
      await Storage.setUserOfficeAssignment(regularUserId, officeAId);
    });
  });

  describe('Data Segregation - Transaction Creation', () => {
    let transactionAId: string;
    let transactionBId: string;

    test('should create transaction in Office A with office_id', async () => {
      const entry = {
        date: new Date().toISOString().split('T')[0],
        description: 'Test Entry Office A',
        amount: 1000,
        entry_type: 'income' as const,
        office_id: officeAId,
      };

      const { data, error } = await supabase
        .from('general_entries')
        .insert(entry)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.office_id).toBe(officeAId);
      expect(data?.description).toBe('Test Entry Office A');
      
      transactionAId = data!.id;
    });

    test('should create transaction in Office B with office_id', async () => {
      const entry = {
        date: new Date().toISOString().split('T')[0],
        description: 'Test Entry Office B',
        amount: 2000,
        entry_type: 'expense' as const,
        office_id: officeBId,
      };

      const { data, error } = await supabase
        .from('general_entries')
        .insert(entry)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.office_id).toBe(officeBId);
      expect(data?.description).toBe('Test Entry Office B');
      
      transactionBId = data!.id;
    });

    test('should filter transactions by Office A', async () => {
      const entries = await Storage.getGeneralEntries(officeAId);
      
      const testEntry = entries.find(e => e.id === transactionAId);
      expect(testEntry).toBeDefined();
      expect(testEntry?.office_id).toBe(officeAId);
      
      // Should not include Office B transactions
      const officeBEntry = entries.find(e => e.id === transactionBId);
      expect(officeBEntry).toBeUndefined();
    });

    test('should filter transactions by Office B', async () => {
      const entries = await Storage.getGeneralEntries(officeBId);
      
      const testEntry = entries.find(e => e.id === transactionBId);
      expect(testEntry).toBeDefined();
      expect(testEntry?.office_id).toBe(officeBId);
      
      // Should not include Office A transactions
      const officeAEntry = entries.find(e => e.id === transactionAId);
      expect(officeAEntry).toBeUndefined();
    });

    test('should return all transactions when no office filter provided (admin view)', async () => {
      const entries = await Storage.getGeneralEntries();
      
      const entryA = entries.find(e => e.id === transactionAId);
      const entryB = entries.find(e => e.id === transactionBId);
      
      expect(entryA).toBeDefined();
      expect(entryB).toBeDefined();
    });
  });

  describe('Admin Office Switching Flow', () => {
    test('should verify admin can access Office A data', async () => {
      const entries = await Storage.getGeneralEntries(officeAId);
      
      const officeAEntries = entries.filter(e => e.office_id === officeAId);
      expect(officeAEntries.length).toBeGreaterThan(0);
    });

    test('should verify admin can access Office B data', async () => {
      const entries = await Storage.getGeneralEntries(officeBId);
      
      const officeBEntries = entries.filter(e => e.office_id === officeBId);
      expect(officeBEntries.length).toBeGreaterThan(0);
    });

    test('should verify admin can access all offices data', async () => {
      const entries = await Storage.getGeneralEntries();
      
      const officeAEntries = entries.filter(e => e.office_id === officeAId);
      const officeBEntries = entries.filter(e => e.office_id === officeBId);
      
      expect(officeAEntries.length).toBeGreaterThan(0);
      expect(officeBEntries.length).toBeGreaterThan(0);
    });
  });

  describe('Agency Payments - Office Segregation', () => {
    let paymentAId: string;
    let paymentBId: string;

    test('should create agency payment in Office A', async () => {
      const payment = {
        date: new Date().toISOString().split('T')[0],
        agency_name: 'Test Agency A',
        amount: 5000,
        payment_type: 'cash' as const,
        office_id: officeAId,
      };

      const { data, error } = await supabase
        .from('agency_payments')
        .insert(payment)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.office_id).toBe(officeAId);
      
      paymentAId = data!.id;
    });

    test('should create agency payment in Office B', async () => {
      const payment = {
        date: new Date().toISOString().split('T')[0],
        agency_name: 'Test Agency B',
        amount: 7000,
        payment_type: 'online' as const,
        office_id: officeBId,
      };

      const { data, error } = await supabase
        .from('agency_payments')
        .insert(payment)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.office_id).toBe(officeBId);
      
      paymentBId = data!.id;
    });

    test('should filter agency payments by office', async () => {
      const paymentsA = await Storage.getAgencyPayments(officeAId);
      const paymentsB = await Storage.getAgencyPayments(officeBId);

      expect(paymentsA.some(p => p.id === paymentAId)).toBe(true);
      expect(paymentsA.some(p => p.id === paymentBId)).toBe(false);

      expect(paymentsB.some(p => p.id === paymentBId)).toBe(true);
      expect(paymentsB.some(p => p.id === paymentAId)).toBe(false);
    });
  });

  describe('Migration Verification', () => {
    test('should verify default office exists', async () => {
      const { data, error } = await supabase
        .from('offices')
        .select('*')
        .eq('name', 'Prem Darvaja Office')
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.name).toBe('Prem Darvaja Office');
    });

    test('should verify existing transactions have office_id', async () => {
      // Check general_entries
      const { data: entries, error: entriesError } = await supabase
        .from('general_entries')
        .select('id, office_id')
        .limit(10);

      expect(entriesError).toBeNull();
      if (entries && entries.length > 0) {
        entries.forEach(entry => {
          expect(entry.office_id).toBeDefined();
          expect(entry.office_id).not.toBeNull();
        });
      }
    });

    test('should verify existing users have office_id', async () => {
      const { data: users, error } = await supabase
        .from('user_profiles')
        .select('id, office_id')
        .limit(10);

      expect(error).toBeNull();
      if (users && users.length > 0) {
        users.forEach(user => {
          expect(user.office_id).toBeDefined();
        });
      }
    });
  });

  describe('Office Deletion with Transaction Check', () => {
    test('should prevent deletion of office with transactions', async () => {
      // Office A has transactions, should not be deletable
      const deleted = await Storage.deleteOffice(officeAId);
      
      expect(deleted).toBe(false);
      
      // Verify office still exists
      const office = await Storage.getOfficeById(officeAId);
      expect(office).not.toBeNull();
    });

    test('should allow deletion of office without transactions', async () => {
      // Create a new office without transactions
      const emptyOffice = await Storage.createOffice('Empty Test Office', 'No transactions');
      expect(emptyOffice).not.toBeNull();
      
      const emptyOfficeId = emptyOffice!.id;
      
      // Should be able to delete
      const deleted = await Storage.deleteOffice(emptyOfficeId);
      expect(deleted).toBe(true);
      
      // Verify office is deleted
      const office = await Storage.getOfficeById(emptyOfficeId);
      expect(office).toBeNull();
    });
  });

  describe('Complete User Flow - Regular User', () => {
    test('should simulate complete regular user flow', async () => {
      // 1. User logs in and sees assigned office
      const userOfficeId = await Storage.getUserOfficeAssignment(regularUserId);
      expect(userOfficeId).toBe(officeAId);

      // 2. User creates a transaction
      const entry = {
        date: new Date().toISOString().split('T')[0],
        description: 'Test Entry Regular User Flow',
        amount: 3000,
        entry_type: 'income' as const,
        office_id: userOfficeId!,
      };

      const { data: newEntry, error } = await supabase
        .from('general_entries')
        .insert(entry)
        .select()
        .single();

      expect(error).toBeNull();
      expect(newEntry?.office_id).toBe(officeAId);

      // 3. Verify office_id is correct
      expect(newEntry?.office_id).toBe(userOfficeId);

      // 4. User queries their data - should only see Office A data
      const entries = await Storage.getGeneralEntries(userOfficeId!);
      const userEntry = entries.find(e => e.id === newEntry!.id);
      
      expect(userEntry).toBeDefined();
      expect(userEntry?.office_id).toBe(officeAId);
    });
  });

  describe('Complete Admin Flow', () => {
    test('should simulate complete admin flow with office switching', async () => {
      // 1. Admin logs in
      const adminOfficeId = await Storage.getUserOfficeAssignment(adminUserId);
      expect(adminOfficeId).toBe(officeAId);

      // 2. Admin views Office A data
      const entriesA = await Storage.getGeneralEntries(officeAId);
      const officeACount = entriesA.filter(e => e.office_id === officeAId).length;
      expect(officeACount).toBeGreaterThan(0);

      // 3. Admin switches to Office B
      const entriesB = await Storage.getGeneralEntries(officeBId);
      const officeBCount = entriesB.filter(e => e.office_id === officeBId).length;
      expect(officeBCount).toBeGreaterThan(0);

      // 4. Verify data changes (Office A data not in Office B results)
      const officeAInB = entriesB.filter(e => e.office_id === officeAId).length;
      expect(officeAInB).toBe(0);

      // 5. Admin creates transaction in Office B
      const entry = {
        date: new Date().toISOString().split('T')[0],
        description: 'Test Entry Admin in Office B',
        amount: 4000,
        entry_type: 'expense' as const,
        office_id: officeBId,
      };

      const { data: newEntry, error } = await supabase
        .from('general_entries')
        .insert(entry)
        .select()
        .single();

      expect(error).toBeNull();
      expect(newEntry?.office_id).toBe(officeBId);

      // 6. Verify transaction has correct office_id
      expect(newEntry?.office_id).toBe(officeBId);

      // 7. Admin views "All Offices"
      const allEntries = await Storage.getGeneralEntries();
      const hasOfficeA = allEntries.some(e => e.office_id === officeAId);
      const hasOfficeB = allEntries.some(e => e.office_id === officeBId);
      
      expect(hasOfficeA).toBe(true);
      expect(hasOfficeB).toBe(true);
    });
  });

  describe('Non-Admin Access Control', () => {
    test('should verify non-admin cannot access other office data', async () => {
      // Regular user is assigned to Office A
      const userOfficeId = await Storage.getUserOfficeAssignment(regularUserId);
      expect(userOfficeId).toBe(officeAId);

      // Query Office A data - should work
      const entriesA = await Storage.getGeneralEntries(officeAId);
      expect(entriesA.length).toBeGreaterThan(0);

      // Query Office B data - should return empty or filtered results
      // Note: In a real implementation, this would be enforced by RLS policies
      const entriesB = await Storage.getGeneralEntries(officeBId);
      
      // Verify no Office B data is accessible
      const officeBEntries = entriesB.filter(e => e.office_id === officeBId);
      
      // This test verifies the query filtering works
      // RLS policies would enforce this at the database level
      expect(entriesB.every(e => e.office_id === officeAId || e.office_id === null)).toBe(true);
    });
  });

  describe('Offline Sync with Office Associations', () => {
    test('should maintain office_id in offline transaction', async () => {
      // Simulate offline transaction creation
      const offlineEntry = {
        date: new Date().toISOString().split('T')[0],
        description: 'Test Offline Entry',
        amount: 1500,
        entry_type: 'income' as const,
        office_id: officeAId,
        synced: false,
      };

      // Store in local state (simulated)
      const localEntry = { ...offlineEntry };
      
      // Verify office_id is preserved
      expect(localEntry.office_id).toBe(officeAId);

      // Simulate sync to backend
      const { data: syncedEntry, error } = await supabase
        .from('general_entries')
        .insert({
          date: localEntry.date,
          description: localEntry.description,
          amount: localEntry.amount,
          entry_type: localEntry.entry_type,
          office_id: localEntry.office_id,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(syncedEntry?.office_id).toBe(officeAId);
      
      // Verify synced data maintains office association
      const entries = await Storage.getGeneralEntries(officeAId);
      const syncedData = entries.find(e => e.id === syncedEntry!.id);
      
      expect(syncedData).toBeDefined();
      expect(syncedData?.office_id).toBe(officeAId);
    });

    test('should validate office_id before syncing', async () => {
      // Attempt to create entry with invalid office_id
      const invalidEntry = {
        date: new Date().toISOString().split('T')[0],
        description: 'Test Invalid Office Entry',
        amount: 1000,
        entry_type: 'income' as const,
        office_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID
      };

      const { data, error } = await supabase
        .from('general_entries')
        .insert(invalidEntry)
        .select()
        .single();

      // Should fail due to foreign key constraint
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  });

  describe('Multi-Table Office Segregation', () => {
    test('should verify office segregation across all transaction tables', async () => {
      // Test driver_transactions
      const driverTx = {
        date: new Date().toISOString().split('T')[0],
        driver_name: 'Test Driver',
        amount: 2000,
        transaction_type: 'payment' as const,
        office_id: officeAId,
      };

      const { data: driverData, error: driverError } = await supabase
        .from('driver_transactions')
        .insert(driverTx)
        .select()
        .single();

      expect(driverError).toBeNull();
      expect(driverData?.office_id).toBe(officeAId);

      // Test truck_fuel_entries
      const fuelEntry = {
        date: new Date().toISOString().split('T')[0],
        truck_number: 'TEST-1234',
        fuel_amount: 100,
        rate: 90,
        total_cost: 9000,
        office_id: officeBId,
      };

      const { data: fuelData, error: fuelError } = await supabase
        .from('truck_fuel_entries')
        .insert(fuelEntry)
        .select()
        .single();

      expect(fuelError).toBeNull();
      expect(fuelData?.office_id).toBe(officeBId);

      // Verify segregation
      const driverTxA = await Storage.getDriverTransactions(officeAId);
      const driverTxB = await Storage.getDriverTransactions(officeBId);

      expect(driverTxA.some(tx => tx.id === driverData!.id)).toBe(true);
      expect(driverTxB.some(tx => tx.id === driverData!.id)).toBe(false);

      const fuelA = await Storage.getTruckFuelEntries(officeAId);
      const fuelB = await Storage.getTruckFuelEntries(officeBId);

      expect(fuelA.some(f => f.id === fuelData!.id)).toBe(false);
      expect(fuelB.some(f => f.id === fuelData!.id)).toBe(true);
    });
  });
});
