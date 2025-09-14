// src/context/AlertContext.tsx
import React, { createContext, useState, useContext, ReactNode, useRef } from 'react';
import CustomAlert from '../components/CustomAlert';

interface AlertContextType {
  showAlert: (message: string, duration?: number) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [alert, setAlert] = useState<{ visible: boolean; message: string }>({ 
    visible: false, 
    message: '' 
  });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showAlert = (message: string, duration: number = 3000) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setAlert({ visible: true, message });
    
    // Set new timeout to hide alert
    timeoutRef.current = setTimeout(() => {
      hideAlert();
    }, duration);
  };

  const hideAlert = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setAlert({ visible: false, message: '' });
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <CustomAlert
        visible={alert.visible}
        message={alert.message}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
};
