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
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        return { ok: false, reason: 'no-user' };
      }

      // Call edge function to register token securely using service role
      const { data, error } = await supabase.functions.invoke('quick-processor', {
        body: { action: 'register_token', token, platform },
      });

      if (error) {
        return { ok: false, error };
      }
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: e } as any;
    }
  }

  // Send a push to target devices (admin) via edge function
  async sendPushToAdmin(payload: ServerPushPayload) {
      try {
        console.log('🚀 [PushGateway] Sending push to admin:', payload.title);
        
        const body = {
          action: 'send_push',
          title: payload.title,
          body: payload.body,
          data: payload.data || {},
          target_email: payload.target_email || 'yashbhavsar175@gmail.com',
        };
        
        console.log('📦 [PushGateway] Request body:', JSON.stringify(body, null, 2));
        
        const { data, error } = await supabase.functions.invoke('quick-processor', { body });
        
        if (error) {
          console.error('❌ [PushGateway] Edge function error:', error);
          return { ok: false, error };
        }
        
        console.log('✅ [PushGateway] Push sent successfully:', data);
        return { ok: true, data };
      } catch (e) {
        console.error('❌ [PushGateway] Exception:', e);
        return { ok: false, error: e } as any;
      }
  }
}

export default PushGateway.getInstance();
