// PushGateway.ts - Server push integration via Supabase Edge Function
import { supabase } from '../supabase';

type PlatformType = 'android' | 'ios' | 'web' | 'unknown';

export interface ServerPushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  target_email?: string; // if provided, push to devices of this email (admin)
}

class PushGateway {
  private static instance: PushGateway;
  static getInstance() {
    if (!PushGateway.instance) PushGateway.instance = new PushGateway();
    return PushGateway.instance;
  }

  // Register or refresh the device token for the current logged-in user
  async registerDeviceToken(token: string, platform: PlatformType) {
    try {
      console.log('📱 [PushGateway] Starting registerDeviceToken...');
      console.log('📱 [PushGateway] Token:', token.substring(0, 20) + '...');
      console.log('📱 [PushGateway] Platform:', platform);
      
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        console.log('⚠️ [PushGateway] No authenticated user; skip token register');
        return { ok: false, reason: 'no-user' };
      }

      console.log('📱 [PushGateway] User authenticated:', user.email);

      // Call edge function to register token securely using service role
      const { data, error } = await supabase.functions.invoke('quick-processor', {
        body: { action: 'register_token', token, platform },
      });

      if (error) {
        console.warn('❌ [PushGateway] register_token error', error);
        return { ok: false, error };
      }
      console.log('✅ [PushGateway] Token registered successfully');
      return { ok: true, data };
    } catch (e) {
      console.warn('❌ [PushGateway] registerDeviceToken exception', e);
      return { ok: false, error: e } as any;
    }
  }

  // Send a push to target devices (admin) via edge function
  async sendPushToAdmin(payload: ServerPushPayload) {
      try {
        console.log('📡 [PushGateway] Starting sendPushToAdmin...');
        const body = {
          action: 'send_push',
          title: payload.title,
          body: payload.body,
          data: payload.data || {},
          target_email: payload.target_email || 'yashbhavsar175@gmail.com', // Always target admin
        };
        console.log('   - Target:', body.target_email);
        console.log('   - Request Body:', JSON.stringify(body, null, 2));
        
        const { data, error } = await supabase.functions.invoke('quick-processor', { body });
        
        if (error) {
          console.warn('❌ [PushGateway] Edge function returned error:', error);
          return { ok: false, error };
        }
        console.log('✅ [PushGateway] Edge function returned success:', data);
        return { ok: true, data };
      } catch (e) {
        console.error('❌ [PushGateway] Exception during invoke:', e);
        return { ok: false, error: e } as any;
      }
  }
}

export default PushGateway.getInstance();
