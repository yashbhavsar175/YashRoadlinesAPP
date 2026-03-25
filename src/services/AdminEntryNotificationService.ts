import { supabase } from '../supabase';

export interface AdminNotificationParams {
  action: 'added' | 'updated' | 'deleted';
  entryType: string;
  userName: string;
  officeName?: string;
  // Specific fields for different entry types
  agencyName?: string;
  billNo?: string;
  amount?: number;
  description?: string;
  driverName?: string;
  truckNo?: string;
  litres?: number;
  fuelType?: string;
  entrySubType?: string; // for uppad/jama type (credit/debit)
  consigneeName?: string;
  itemDescription?: string;
}

/**
 * Send admin notification with FCM push and database record
 */
export const sendAdminNotification = async (params: AdminNotificationParams): Promise<void> => {
  console.log('🔔 sendAdminNotification called:', params.action, params.entryType);
  
  try {
    const supabaseClient = supabase;

    // Get current user info if not provided
    let userName = params.userName;
    if (!userName) {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        const { data: profile } = await supabaseClient
          .from('user_profiles')
          .select('full_name, username')
          .eq('id', user.id)
          .single();
        userName = profile?.full_name || profile?.username || user.email || 'Unknown User';
      } else {
        userName = 'Unknown User';
      }
    }

    // Step 1: Get admin FCM tokens from BOTH device_tokens AND user_profiles (fallback)
    // First, get all admin user IDs and their profile tokens
    const { data: adminProfiles, error: adminProfileError } = await supabaseClient
      .from('user_profiles')
      .select('id, fcm_token')
      .eq('is_admin', true);

    if (adminProfileError) {
      console.warn('Failed to get admin profiles:', adminProfileError);
      console.warn('Admin fetch error details:', JSON.stringify(adminProfileError));
      return;
    }

    if (!adminProfiles || adminProfiles.length === 0) {
      console.warn('No admin users found');
      return;
    }

    const adminIds = adminProfiles.map((p: any) => p.id);
    console.log(`Found ${adminIds.length} admin user(s)`);

    // Get tokens from device_tokens table (primary source - supports multiple devices)
    const { data: deviceTokens, error: tokenError } = await supabaseClient
      .from('device_tokens')
      .select('token')
      .in('user_id', adminIds);

    if (tokenError) {
      console.warn('Failed to get device tokens:', tokenError);
      console.warn('Token fetch error details:', JSON.stringify(tokenError));
      // Don't return - continue with user_profiles fallback
    }

    // Collect tokens from both sources
    const deviceTokenList = (deviceTokens || []).map((t: any) => t.token).filter(Boolean);
    const profileTokenList = (adminProfiles || [])
      .map((a: any) => a.fcm_token)
      .filter(Boolean); // Remove null/undefined

    // Merge both lists and remove duplicates using Set
    const tokens = [...new Set([...deviceTokenList, ...profileTokenList])];
    
    console.log('Admin tokens found:', {
      fromDeviceTokens: deviceTokenList.length,
      fromUserProfiles: profileTokenList.length,
      totalUnique: tokens.length
    });

    if (tokens.length === 0) {
      console.warn('No admin FCM tokens found');
      return;
    }

    // Step 2: Build notification
    const emoji = params.action === 'added' ? '➕' : params.action === 'updated' ? '✏️' : '🗑️';
    const title = `${emoji} ${params.entryType}` + (params.officeName ? ` - ${params.officeName}` : '');

    const lines: string[] = [];
    lines.push(`👤 ${userName}`);

    // Special format for delete actions
    if (params.action === 'deleted') {
      if (params.amount) {
        lines.push(`🗑️ Deleted ₹${params.amount.toLocaleString('en-IN')}`);
      } else {
        lines.push(`🗑️ Deleted`);
      }
    } else {
      // Add/Update actions - show details
      if (params.agencyName) lines.push(`🏢 ${params.agencyName}`);
      if (params.driverName) lines.push(`👷 ${params.driverName}`);
      if (params.truckNo) lines.push(`🚛 ${params.truckNo}`);
      if (params.billNo) lines.push(`🧾 Bill No: ${params.billNo}`);
      if (params.litres && params.fuelType) lines.push(`⛽ ${params.litres}L ${params.fuelType}`);
      if (params.consigneeName) lines.push(`📦 Consignee: ${params.consigneeName}`);
      if (params.itemDescription) lines.push(`📝 ${params.itemDescription}`);
      if (params.entrySubType) {
        const typeLabel = params.entrySubType === 'credit' ? 'Credit' : 'Debit';
        if (params.amount) {
          lines.push(`💰 ${typeLabel}: ₹${params.amount.toLocaleString('en-IN')}`);
        } else {
          lines.push(`💰 ${typeLabel}`);
        }
      } else if (params.amount) {
        lines.push(`💰 ₹${params.amount.toLocaleString('en-IN')}`);
      }
      if (params.description && !params.itemDescription) lines.push(`📝 ${params.description}`);
    }

    const body = lines.join('\n');

    // Step 3: Call edge function
    // ✅ DEBUG: Log notification content
    console.log('=== NOTIFICATION DEBUG ===');
    console.log('Title:', title);
    console.log('Body:', body);
    console.log('Body length:', body.length);
    console.log('Lines:', JSON.stringify(lines));
    console.log('Token count:', tokens.length);
    console.log('========================');
    
    const { data, error } = await supabaseClient.functions.invoke('quick-processor', {
      body: {
        action: 'send_push',
        tokens: tokens,
        title: title,
        body: body,        // ✅ Send as 'body' (edge function expects this)
        message: body,     // ✅ Also send as 'message' for backward compatibility
        data: {
          type: 'entry_notification',
          entryType: params.entryType,
          title: title,    // ✅ Include in data payload too
          body: body,      // ✅ Include in data payload too
          message: body,   // ✅ Include in data payload too
        },
      },
    });

    if (error) {
      console.warn('Edge function error:', error);
      console.warn('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('Edge function success:', data);
      
      // Log summary if available
      if (data?.summary) {
        console.log('📊 Notification Summary:', {
          total: data.summary.total,
          successful: data.summary.successful,
          failed: data.summary.failed,
          invalidTokensRemoved: data.summary.invalidTokensRemoved
        });
        
        if (data.summary.invalidTokensRemoved > 0) {
          console.log(`🧹 Cleaned up ${data.summary.invalidTokensRemoved} invalid FCM token(s)`);
        }
      }
      
      // Log individual failures for debugging
      if (data?.results) {
        const failures = data.results.filter((r: any) => !r.ok);
        if (failures.length > 0) {
          console.warn(`⚠️ ${failures.length} notification(s) failed to send:`, 
            failures.map((f: any) => ({
              status: f.status,
              error: f.body || f.error,
              token: f.token?.substring(0, 20) + '...'
            }))
          );
        }
      }
    }

    // Step 4: Save to admin_notifications table
    const notificationType = params.action === 'added' ? 'add' :
      params.action === 'updated' ? 'edit' : 'delete';

    await supabaseClient.from('admin_notifications').insert({
      title,
      message: body,
      type: notificationType,
      severity: 'info',
      is_read: false,
      user_name: userName,
      user_id: userName,
    });

    console.log('✅ Notification saved to database');

  } catch (err) {
    console.warn('sendAdminNotification failed:', err);
  }
};

/**
 * Helper to get office name by ID
 */
export const getOfficeName = async (officeId?: string): Promise<string | undefined> => {
  if (!officeId) return undefined;
  
  try {
    const { data } = await supabase
      .from('offices')
      .select('name')
      .eq('id', officeId)
      .single();
    return data?.name;
  } catch {
    return undefined;
  }
};
