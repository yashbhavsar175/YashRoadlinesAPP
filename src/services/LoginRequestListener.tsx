// LoginRequestListener.tsx - Global listener for login requests
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { LoginRequestPopup } from '../components/LoginRequestPopup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

interface LoginRequest {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  status: string;
  created_at: string;
}

export const LoginRequestListener: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<LoginRequest | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);



  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAdmin(false);
          return;
        }

        // Check is_admin flag from database
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('❌ Error fetching user profile:', error);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(profile?.is_admin === true);
        console.log('✅ Admin status checked:', profile?.is_admin === true);
      } catch (error) {
        console.error('❌ Error checking admin status:', error);
        setIsAdmin(false);
      }
    };

    checkAdmin();

    // Listen to app state changes
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Set up real-time subscription for login requests
  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    // Polling approach (more reliable than real-time)
    let pollingInterval: ReturnType<typeof setInterval>;
    let lastCheckedId: string | null = null;

    const checkForNewRequests = async () => {
      try {
        // Get the most recent pending request
        const { data, error } = await supabase
          .from('login_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          // No pending requests
          return;
        }

        if (data && data.id !== lastCheckedId) {
          lastCheckedId = data.id;
          
          // Only show if app is in foreground
          if (appState === 'active') {
            setCurrentRequest(data as LoginRequest);
            setShowPopup(true);
          }
        }
      } catch (error) {
        console.error('Error checking for login requests:', error);
      }
    };

    // Check immediately
    checkForNewRequests();

    // Then poll every 2 seconds
    pollingInterval = setInterval(checkForNewRequests, 2000);

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [isAdmin, appState]);

  const handleClose = () => {
    setShowPopup(false);
    setCurrentRequest(null);
  };

  const handleApproved = () => {
    // Popup will close automatically
  };

  if (!isAdmin || !currentRequest) {
    return null;
  }

  return (
    <LoginRequestPopup
      visible={showPopup}
      requestId={currentRequest.id}
      userName={currentRequest.user_name}
      userEmail={currentRequest.user_email}
      onClose={handleClose}
      onApproved={handleApproved}
    />
  );
};
