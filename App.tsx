// App.tsx
import 'react-native-url-polyfill/auto';
import React, { useState, useEffect, useRef, useCallback } from 'react';
// Lightweight safe math evaluator — replaces mathjs (avoids Metro ESM resolution issues)
// Only allows digits, operators, decimals and parentheses — no arbitrary code execution
function safeEval(expr: string): number {
  if (!/^[\d\s+\-*/().]+$/.test(expr)) throw new Error('Invalid expression');
  // Recursive descent parser: handles +, -, *, / and parentheses
  let pos = 0;
  const peek = () => expr[pos];
  const consume = () => expr[pos++];
  const skipSpaces = () => { while (expr[pos] === ' ') pos++; };

  function parseExpr(): number {
    let left = parseTerm();
    skipSpaces();
    while (peek() === '+' || peek() === '-') {
      const op = consume(); skipSpaces();
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
      skipSpaces();
    }
    return left;
  }
  function parseTerm(): number {
    let left = parseFactor();
    skipSpaces();
    while (peek() === '*' || peek() === '/') {
      const op = consume(); skipSpaces();
      const right = parseFactor();
      if (op === '/' && right === 0) throw new Error('Division by zero');
      left = op === '*' ? left * right : left / right;
      skipSpaces();
    }
    return left;
  }
  function parseFactor(): number {
    skipSpaces();
    if (peek() === '(') {
      consume(); // '('
      const val = parseExpr();
      skipSpaces();
      if (peek() === ')') consume();
      return val;
    }
    if (peek() === '-') { consume(); return -parseFactor(); }
    let num = '';
    while (peek() !== undefined && /[\d.]/.test(peek())) num += consume();
    if (num === '') throw new Error('Unexpected token');
    return parseFloat(num);
  }
  return parseExpr();
}

// Dev-only logger (Issue 5)
const log = (...args: any[]) => { if (__DEV__) { console.log(...args); } };
const warn = (...args: any[]) => { if (__DEV__) { console.warn(...args); } };
const err = (...args: any[]) => { if (__DEV__) { console.error(...args); } };
import { AppState, Alert, View, Text, TouchableOpacity, StyleSheet, Modal, PanResponder, Dimensions, Platform, AppStateStatus } from 'react-native';
import { NavigationContainer, CommonActions, NavigationContainerRef, NavigationState } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
// Create navigation reference
import { createStackNavigator } from '@react-navigation/stack';
import type { InitialState } from '@react-navigation/native';
import { GestureHandlerRootView, PinchGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
// App.tsx
import Icon from 'react-native-vector-icons/Ionicons';
// No need for enableScreens with stack navigator
import { supabase } from './src/supabase';
import { getProfile, initializeSupabaseStorage, getSyncStatus, syncAllDataFixed } from './src/data/Storage';
import NotificationService from './src/services/NotificationService';
import PushNotificationService from './src/services/PushNotificationService';
import NotificationListener from './src/services/NotificationListener';
import PushNotification from 'react-native-push-notification';
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import BiometricAuthScreen from './src/screens/BiometricAuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import PaidSectionScreen from './src/screens/PaidSectionScreen';
import AddAgencyScreen from './src/screens/AddAgencyScreen';
import AddMajuriScreen from './src/screens/AddMajuriScreen';
import DriverDetailsScreen from './src/screens/DriverDetailsScreen';
import AddTruckFuelScreen from './src/screens/AddTruckFuelScreen';
import StatementScreen from './src/screens/StatementScreen';
import MonthlyStatementScreen from './src/screens/MonthlyStatementScreen';
import AdminPanelScreen from './src/screens/AdminPanelScreen';
import DailyReportScreen from './src/screens/DailyReportScreen';
import ManageCashScreen from './src/screens/ManageCashScreen';
import AddGeneralEntryScreen from './src/screens/AddGeneralEntryScreen';
import DriverStatementScreen from './src/screens/DriverStatementScreen';
import AgencyEntryScreen from './src/screens/AgencyEntryScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import TotalPaidScreen from './src/screens/TotalPaidScreen';
import EWayBillConsolidatedScreen from './src/screens/EWayBillConsolidatedScreen';
import AdminNotificationScreen from './src/screens/AdminNotificationScreen';
import SendNotificationScreen from './src/screens/SendNotificationScreen';
import NotificationPasswordScreen from './src/screens/NotificationPasswordScreen';
import AdminPasswordResetScreen from './src/screens/AdminPasswordResetScreen';
import PageBuilderScreen from './src/screens/PageBuilderScreen';
import PageManagementScreen from './src/screens/PageManagementScreen';
import UppadJamaScreen from './src/screens/UppadJamaScreen';
import UserUppadJamaScreen from './src/screens/UserUppadJamaScreen';
import MumbaiDeliveryEntryScreen from './src/screens/MumbaiDeliveryEntryScreen';
import PaymentConfirmationScreen from './src/screens/PaymentConfirmationScreen';
import MumbaiDeliveryNavigator from './src/navigation/MumbaiDeliveryNavigator';
import BackdatedEntryScreen from './src/screens/BackdatedEntryScreen';
import DailyEntriesScreen from './src/screens/DailyEntriesScreen';
import NotificationTestScreen from './src/screens/NotificationTestScreen';
import ComprehensiveNotificationTest from './src/screens/ComprehensiveNotificationTest';
import LeaveCashSetupScreen from './src/screens/LeaveCashSetupScreen';
import CashVerificationScreen from './src/screens/CashVerificationScreen';
import CashHistoryScreen from './src/screens/CashHistoryScreen';
import UserAccessManagementScreen from './src/screens/UserAccessManagementScreen';
import AdminPasswordChangeScreen from './src/screens/AdminPasswordChangeScreen';
import AdminUserManagementScreen from './src/screens/AdminUserManagementScreen';
import MajurDashboardScreen from './src/screens/MajurDashboardScreen';
import OfficeManagementScreen from './src/screens/OfficeManagementScreen';
import { Colors } from './src/theme/colors';
import { AlertProvider } from './src/context/AlertContext';
import { UserAccessProvider } from './src/context/UserAccessContext';
import { OfficeProvider } from './src/context/OfficeContext';
import AuthLogoutService from './src/services/AuthLogoutService';
import { LoginRequestListener } from './src/services/LoginRequestListener';

// Define the root navigator's param list and export it for usage across screens
type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  BiometricAuth: undefined;
  Home: undefined;
  AddAgency: undefined;
  PaidSection: undefined;
  AddMajuri: undefined;
  DriverDetails: undefined;
  AddTruckFuel: undefined;
  Statement: undefined;
  MonthlyStatement: undefined;
  DailyReport: undefined;
  ManageCash: {
    selectedDate: Date;
    initialAdjustment: number;
    onSave: (amount: number) => void;
  };
  AdminPanel: undefined;
  AddGeneralEntry: undefined;
  DriverStatement: undefined;
  History: undefined;
  AgencyEntry: undefined;
  TotalPaid: undefined;
  EWayBillConsolidated: undefined;
  AdminNotifications: undefined;
  SendNotification: undefined;
  NotificationPassword: { 
    notificationId?: string;
    title?: string;
    message?: string;
  };
  AdminPasswordReset: undefined;
  PageBuilder: undefined;
  PageManagement: undefined;
  UppadJama: undefined;
  UserUppadJama: undefined;
  CashBalance: undefined;
  MumbaiDelivery: undefined;
  PaymentConfirmation: undefined;
  BackdatedEntry: undefined;
  DailyEntries: undefined;
  NotificationTest: undefined;
  ComprehensiveNotificationTest: undefined;
  LeaveCashSetupScreen: undefined;
  CashVerificationScreen: undefined;
  CashHistoryScreen: undefined;
  UserAccessManagementScreen: undefined;
  AdminPasswordChangeScreen: undefined;
  AdminUserManagement: undefined;
  MajurDashboard: undefined;
  DebugScreenAccess: undefined;
  OfficeManagement: undefined;
};

export type { RootStackParamList };

// Enable native screens implementation
// No need for enableScreens with stack navigator
// enableScreens();

// Create a typed stack navigator
const Stack = createStackNavigator<RootStackParamList>();

export const navigationRef = React.createRef<NavigationContainerRef<RootStackParamList>>();
// Key component moved outside to prevent re-rendering issues
const Key = ({ label, onPress, type, style }: { 
  label: string; 
  onPress: () => void; 
  type?: 'op' | 'num' | 'util';
  style?: any;
}) => (
  <TouchableOpacity 
    onPress={onPress} 
    style={[
      stylesCalc.key, 
      type === 'op' && stylesCalc.keyOp, 
      type === 'util' && stylesCalc.keyUtil,
      style
    ]}
  >
    <Text style={stylesCalc.keyText}>{label}</Text>
  </TouchableOpacity>
);

function CalculatorOverlay({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    useEffect(() => {
      log('[CALC] overlay component mounted');
      return () => log('[CALC] overlay component unmounted');
    }, []);
    useEffect(() => {
      log('[CALC] visible =', visible);
    }, [visible]);
    const [expr, setExpr] = useState<string>('');
    const [display, setDisplay] = useState<string>('0');
    
    // Debounced size state for smoother updates
    const [displaySize, setDisplaySize] = useState<{ w: number; h: number }>({ w: 320, h: 480 });
    const sizeUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
    // Draggable overlay position with better sizing
    const MARGIN = 20;
    const CARD_W_DEF = 320;
    const CARD_H_DEF = 480;
    const MIN_W = 150; // Allow very small size
    const MIN_H = 200; // Allow very small size
    
    const getMaxSize = useCallback(() => {
      const { width, height } = getWin();
      return {
        w: width - (MARGIN * 2), // Screen width minus margins
        h: height - (MARGIN * 2)  // Screen height minus margins
      };
    }, []);
    
    const [size, setSize] = useState<{ w: number; h: number }>({ w: CARD_W_DEF, h: CARD_H_DEF });
    
    // Issue 2: sizeRef keeps resizePan closure in sync with latest size
    const sizeRef = useRef(size);
    useEffect(() => { sizeRef.current = size; }, [size]);
    
    const getWin = () => Dimensions.get('window');
    
    const defaultPos = useCallback(() => {
      const { width, height } = getWin();
      const x = Math.max(MARGIN, (width - size.w) / 2); // Center horizontally
      const y = Math.max(MARGIN, (height - size.h) / 2); // Center vertically
      return { x, y };
    }, [size.w, size.h]);
    
    const [pos, setPos] = useState<{ x: number; y: number }>(() => defaultPos());
    const posRef = useRef<{ x: number; y: number }>(pos);
    
    useEffect(() => { 
      posRef.current = pos; 
    }, [pos]);
  
    const clamp = useCallback((x: number, y: number, currentSize = size) => {
      const { width, height } = getWin();
      const maxX = width - currentSize.w - MARGIN;
      const maxY = height - currentSize.h - MARGIN;
      return { 
        x: Math.min(Math.max(x, MARGIN), Math.max(MARGIN, maxX)), 
        y: Math.min(Math.max(y, MARGIN), Math.max(MARGIN, maxY)) 
      };
    }, [size]);

    // Load saved position and size
    useEffect(() => {
      let isMounted = true;
      (async () => {
        try {
          const [sx, sy, sw, sh] = await Promise.all([
            AsyncStorage.getItem('calc_overlay_x'),
            AsyncStorage.getItem('calc_overlay_y'),
            AsyncStorage.getItem('calc_overlay_w'),
            AsyncStorage.getItem('calc_overlay_h'),
          ]);
          
          // Load saved size first
          let newSize = { w: CARD_W_DEF, h: CARD_H_DEF };
          if (sw != null && sh != null) {
            const w = parseFloat(sw);
            const h = parseFloat(sh);
            if (!Number.isNaN(w) && !Number.isNaN(h) && w >= MIN_W && h >= MIN_H) {
              newSize = { w, h };
              if (isMounted) setSize(newSize);
            }
          }
          
          // Load saved position
          if (sx != null && sy != null) {
            const x = parseFloat(sx);
            const y = parseFloat(sy);
            if (!Number.isNaN(x) && !Number.isNaN(y)) { 
              const clampedPos = clamp(x, y, newSize);
              if (isMounted) setPos(clampedPos);
              return; 
            }
          }
          
          // Set default position based on current size
          if (isMounted) setPos(defaultPos());
        } catch {
          if (isMounted) setPos(defaultPos());
        }
      })();
      return () => { isMounted = false; };
    }, [clamp, defaultPos]);
  
    const dragOrigin = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const isDragging = useRef(false);
    // Resize and pinch state
    const [isResizing, setIsResizing] = useState(false);
    const pinchStartSize = useRef<{ w: number; h: number }>({ w: CARD_W_DEF, h: CARD_H_DEF });
    const pinchCenter = useRef<{ cx: number; cy: number }>({ cx: 0, cy: 0 });
    const handlePinchEvent = (evt: any) => {
      if (!isResizing) return;
      const scale = evt?.nativeEvent?.scale ?? 1;
      if (scale < 0.1 || scale > 5) return; // Allow wider scaling range
      
      const baseW = pinchStartSize.current.w;
      const baseH = pinchStartSize.current.h;
      const maxSize = getMaxSize();
      const newW = Math.max(MIN_W, Math.min(maxSize.w, baseW * scale));
      const newH = Math.max(MIN_H, Math.min(maxSize.h, baseH * scale));
      
      // Remove threshold to make resizing smooth
      const newSize = { w: newW, h: newH };
      setSize(newSize);
      
      const centerX = pinchCenter.current.cx || (posRef.current.x + baseW / 2);
      const centerY = pinchCenter.current.cy || (posRef.current.y + baseH / 2);
      const newX = centerX - newW / 2;
      const newY = centerY - newH / 2;
      const clampedPos = clamp(newX, newY, newSize);
      
      setPos(clampedPos);
    };
    const handlePinchStateChange = async ({ nativeEvent }: any) => {
      log('[PINCH] state change -> state:', nativeEvent.state, 'oldState:', nativeEvent.oldState);
      // When gesture becomes active, capture base size and center
      if (nativeEvent.state === State.ACTIVE) {
        setIsResizing(true);
        pinchStartSize.current = { w: size.w, h: size.h };
        pinchCenter.current = { cx: posRef.current.x + size.w / 2, cy: posRef.current.y + size.h / 2 };
        log('[PINCH] ACTIVE -> base size', pinchStartSize.current);
      }
      // When gesture ends
      if (
        nativeEvent.state === State.END ||
        nativeEvent.state === State.CANCELLED ||
        nativeEvent.oldState === State.ACTIVE
      ) {
        setIsResizing(false);
        const { w, h } = size;
        await AsyncStorage.multiSet([
          ['calc_overlay_w', String(w)],
          ['calc_overlay_h', String(h)],
        ]).catch(() => {});
        log('[PINCH] END -> saved size', w, h);
      }
    };
    
    // Header drag with RNGH PanGestureHandler
    const headerPanRef = useRef<any>(null);
    const pinchRef = useRef<any>(null);
    const onHeaderPanEvent = (evt: any) => {
      const { translationX, translationY } = evt.nativeEvent;
      const next = clamp(dragOrigin.current.x + translationX, dragOrigin.current.y + translationY);
      setPos(next);
      log('[DRAG-H] event tx,ty=', translationX, translationY, ' -> pos ', next);
    };
    const onHeaderPanStateChange = async ({ nativeEvent }: any) => {
      const { state, translationX, translationY } = nativeEvent;
      log('[DRAG-H] state change ->', state, 'tx,ty=', translationX, translationY);
      if (state === State.BEGAN) {
        isDragging.current = true;
        dragOrigin.current = { x: posRef.current.x, y: posRef.current.y };
        log('[DRAG-H] BEGAN at', dragOrigin.current);
      }
      if (state === State.ACTIVE) {
        const next = clamp(dragOrigin.current.x + translationX, dragOrigin.current.y + translationY);
        setPos(next);
      }
      if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
        isDragging.current = false;
        const next = clamp(dragOrigin.current.x + translationX, dragOrigin.current.y + translationY);
        setPos(next);
        const p = next;
        await AsyncStorage.multiSet([
          ['calc_overlay_x', String(p.x)],
          ['calc_overlay_y', String(p.y)],
        ]).catch(() => {});
        log('[DRAG-H] END saved pos', p);
      }
    };

    const resizeOrigin = useRef<{ w: number; h: number; startX: number; startY: number }>({ w: size.w, h: size.h, startX: 0, startY: 0 });
    const resizePan = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
        onPanResponderGrant: (evt) => {
          setIsResizing(true);
          resizeOrigin.current = {
            w: sizeRef.current.w,
            h: sizeRef.current.h,
            startX: evt.nativeEvent.pageX,
            startY: evt.nativeEvent.pageY,
          };
          log('[RESIZE-HANDLE] grant origin', resizeOrigin.current);
        },
        onPanResponderMove: (evt) => {
          const deltaX = evt.nativeEvent.pageX - resizeOrigin.current.startX;
          const deltaY = evt.nativeEvent.pageY - resizeOrigin.current.startY;
          const maxSize = getMaxSize();
          const newW = Math.max(MIN_W, Math.min(maxSize.w, resizeOrigin.current.w + deltaX));
          const newH = Math.max(MIN_H, Math.min(maxSize.h, resizeOrigin.current.h + deltaY));
          const newSize = { w: newW, h: newH };
          setSize(newSize);
          const clampedPos = clamp(posRef.current.x, posRef.current.y, newSize);
          setPos(clampedPos);
          // console.log('[RESIZE-HANDLE] move size', newSize, 'pos', clampedPos);
        },
        onPanResponderRelease: async () => {
          setIsResizing(false);
          const { w, h } = sizeRef.current;
          await AsyncStorage.multiSet([
            ['calc_overlay_w', String(w)],
            ['calc_overlay_h', String(h)],
          ]).catch(() => {});
          log('[RESIZE-HANDLE] release saved size', w, h);
        },
      })
    ).current;
  
    const append = (t: string) => {
      const next = expr + t;
      setExpr(next);
    };
    
    const clearAll = () => { 
      setExpr(''); 
      setDisplay('0'); 
    };
    
    const back = () => { 
      const next = expr.slice(0, -1); 
      setExpr(next); 
    };
    
    const evaluate = () => {
      try {
        const safe = expr.replace(/×/g, '*').replace(/÷/g, '/');
        const val = safeEval(safe || '0');
        const out = (Number.isFinite(val) ? val : 0).toString();
        setDisplay(out);
        setExpr(out);
      } catch {
        setDisplay('Error');
      }
    };
  
  
    return (
      <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
        <GestureHandlerRootView>
          <View style={stylesCalc.backdrop}>
            <View 
            style={[
              stylesCalc.dragContainer, 
              { 
                top: pos.y, 
                left: pos.x,
                width: size.w,
                height: size.h,
              }
            ]}
          >
            <PinchGestureHandler ref={pinchRef} simultaneousHandlers={headerPanRef} onGestureEvent={handlePinchEvent} onHandlerStateChange={handlePinchStateChange}>
              <View style={[stylesCalc.card, { width: size.w, height: size.h }]}>
                <PanGestureHandler
                  ref={headerPanRef}
                  simultaneousHandlers={pinchRef}
                  hitSlop={{ top: 8, bottom: size.h, left: 16, right: 16 }}
                  activeOffsetX={[-6, 6]}
                  activeOffsetY={[-6, 6]}
                  onGestureEvent={onHeaderPanEvent}
                  onHandlerStateChange={onHeaderPanStateChange}
                >
                  <View style={stylesCalc.header}>
                    <View style={stylesCalc.dragHandle}>
                      <View style={stylesCalc.dragHandleIndicator} />
                    </View>
                    <Text style={stylesCalc.title}>Calculator</Text>
                    <TouchableOpacity onPress={onClose} style={stylesCalc.closeBtn}>
                      <Text style={stylesCalc.closeText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </PanGestureHandler>

                <View style={stylesCalc.displayBox}>
                  <Text style={stylesCalc.displayMain}>{display}</Text>
                  <Text style={stylesCalc.displayExpr}>{expr}</Text>
                </View>

                {/* Calculator buttons */}
                <View style={[stylesCalc.buttonsContainer, { flex: 1 }]}>
                  <View style={stylesCalc.row}>
                    <Key label="C" onPress={clearAll} type="util" />
                    <Key label="⌫" onPress={back} type="util" />
                    <Key label="÷" onPress={() => append('÷')} type="op" />
                    <Key label="×" onPress={() => append('×')} type="op" />
                  </View>
                  <View style={stylesCalc.row}>
                    <Key label="7" onPress={() => append('7')} />
                    <Key label="8" onPress={() => append('8')} />
                    <Key label="9" onPress={() => append('9')} />
                    <Key label="-" onPress={() => append('-')} type="op" />
                  </View>
                  <View style={stylesCalc.row}>
                    <Key label="4" onPress={() => append('4')} />
                    <Key label="5" onPress={() => append('5')} />
                    <Key label="6" onPress={() => append('6')} />
                    <Key label="+" onPress={() => append('+')} type="op" />
                  </View>
                  <View style={stylesCalc.row}>
                    <Key label="1" onPress={() => append('1')} />
                    <Key label="2" onPress={() => append('2')} />
                    <Key label="3" onPress={() => append('3')} />
                    <Key label="." onPress={() => append('.')} />
                  </View>
                  <View style={stylesCalc.row}>
                    <Key label="0" onPress={() => append('0')} />
                    <Key label="00" onPress={() => append('00')} />
                    <Key label="=" onPress={evaluate} type="op" style={stylesCalc.keyEquals} />
                  </View>
                </View>

                {/* Reset button - Clear calculator */}
                <TouchableOpacity
                  style={stylesCalc.resetHandle}
                  onPress={() => {
                    clearAll();
                    log('[CALC] Reset button pressed - calculator cleared');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={stylesCalc.resetIcon}>
                    <Text style={stylesCalc.resetText}>⟲</Text>
                  </View>
                </TouchableOpacity>
                
                {/* Resize handle - Bottom right corner for dragging */}
                <View
                  style={stylesCalc.resizeHandle}
                  {...resizePan.panHandlers}
                >
                  <View style={stylesCalc.resizeIcon}>
                    <Text style={stylesCalc.resizeText}>⋱</Text>
                  </View>
                </View>

                {/* Pinch instruction when resizing */}
                {isResizing && (
                  <View style={stylesCalc.resizeIndicator}>
                    <Text style={stylesCalc.resizeIndicatorText}>Pinch or drag to resize</Text>
                  </View>
                )}
              </View>
            </PinchGestureHandler>
          </View>
          </View>
        </GestureHandlerRootView>
      </Modal>
    );
  }
  

function App(): React.JSX.Element {
    const [syncStatus, setSyncStatus] = useState({
      lastSync: null as string | null,
      pendingOperations: 0,
      isOnline: false,
    });
    const isInitialized = useRef(false);
    const deactivationHandledRef = useRef(false);
    
    // Navigation state persistence - Validates: Requirement 9.4
    const [isNavigationReady, setIsNavigationReady] = useState(false);
    const [initialNavigationState, setInitialNavigationState] = useState<InitialState | undefined>();
    const NAVIGATION_STATE_KEY = 'NAVIGATION_STATE_KEY';
    const APP_CLOSE_TIME_KEY = 'APP_CLOSE_TIME_KEY';
    
    // Load persisted navigation state on mount
    useEffect(() => {
      let isMounted = true;
      const restoreNavigationState = async () => {
        try {
          // Check when app was last closed
          const closeTimeString = await AsyncStorage.getItem(APP_CLOSE_TIME_KEY);
          const closeTime = closeTimeString ? parseInt(closeTimeString) : 0;
          const timeSinceClose = Date.now() - closeTime;
          
          log('🕐 APP LAUNCH CHECK:');
          log('   Last close time:', closeTime ? new Date(closeTime).toLocaleTimeString() : 'Never');
          log('   Time since close:', timeSinceClose, 'ms');
          
          // Only restore navigation state if app was closed recently (< 3 seconds)
          if (closeTime > 0 && timeSinceClose < 3000) {
            const savedStateString = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);
            if (savedStateString) {
              const state = JSON.parse(savedStateString);
              if (isMounted) {
                setInitialNavigationState(state);
              }
              log('✅ Navigation state restored (quick restart)');
            }
          } else {
            log('🏠 Fresh launch detected - starting from Home');
            await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);
          }
        } catch (error) {
          warn('⚠️ Failed to restore navigation state:', error);
        } finally {
          if (isMounted) {
            setIsNavigationReady(true);
          }
        }
      };
      
      restoreNavigationState();
      return () => { isMounted = false; };
    }, []);
    
    const checkActiveUser = useCallback(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const profile = await getProfile(user.id);
        const active = profile?.is_active !== false; // default active
        if (!active && !deactivationHandledRef.current) {
          deactivationHandledRef.current = true;
          await supabase.auth.signOut();
          Alert.alert('Access Blocked', 'Your account has been deactivated.');
          if (navigationRef.current) {
            navigationRef.current.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              })
            );
          }
        }
      } catch (e) {
        // ignore
      }
    }, []);
   
  
    useEffect(() => {
      let isMounted = true;
      if (!isInitialized.current) {
        const initializeApp = async () => {
          if (!isMounted) return;
          try {
            log('🚀 Initializing app services...');
            
            // Initialize Supabase storage first
            await initializeSupabaseStorage();
            log('✅ Supabase storage initialized');
            
            // Setup notification channels for local notifications
            log('📱 Setting up push notifications...');
            
            PushNotification.configure({
              onRegister: function (token) {
                log('📱 Notification token received:', token);
              },
              onNotification: function (notification) {
                log('🔔 Notification received in app:', notification);
                
                // Handle notification tap
                if ((notification as any).userInteraction) {
                  log('👆 User tapped notification');
                }
              },
              permissions: {
                alert: true,
                badge: true,
                sound: true,
              },
              popInitialNotification: true,
              requestPermissions: Platform.OS === 'ios',
            });

            // Create notification channels
            PushNotification.createChannel(
              {
                channelId: "user-notifications",
                channelName: "User Notifications",
                channelDescription: "Important notifications for users",
                playSound: true,
                soundName: "default",
                importance: 4, // IMPORTANCE_HIGH
                vibrate: true,
                led: true,
                ledColor: '#2196F3',
                showBadge: true,
              } as any,
              (created) => {
                log(`✅ User notification channel created: ${created}`);
              }
            );
            
            // Initialize notification services properly
            log('📱 Initializing notification services...');
            await NotificationService.initialize();
            log('✅ NotificationService initialized');
            
            // Initialize push notification service
            await PushNotificationService.initialize();
            log('✅ PushNotificationService initialized');
            
            // Initialize notification listener for current user
            await NotificationListener.getInstance().initialize();
            log('✅ NotificationListener initialized');
            
            // Initialize auth logout service for real-time logout
            await AuthLogoutService.getInstance().initialize();
            log('✅ AuthLogoutService initialized');
            
            // DeviceNotificationService is auto-initialized via constructor
            log('📱 DeviceNotificationService ready');
            
            // Start AdminNotificationListener for admin users
            const AdminNotificationListener = (await import('./src/services/AdminNotificationListener')).default;
            await AdminNotificationListener.start();
            log('✅ AdminNotificationListener started');
            
            // Fix notification channels and configuration
            try {
              const NotificationFixer = await import('./src/services/NotificationFixer');
              await NotificationFixer.default.fixNotificationChannels();
              log('✅ Notification channels fixed');
            } catch (fixError) {
              warn('⚠️ Could not fix notification channels:', fixError);
            }
            
            log('✅ All notification services initialized');
            
            // Ensure Mumbai agency exists in database
            try {
              const { ensureMumbaiAgency } = await import('./src/utils/ensureMumbaiAgency');
              await ensureMumbaiAgency();
              log('✅ Mumbai agency verified');
            } catch (agencyError) {
              warn('⚠️ Could not verify Mumbai agency:', agencyError);
            }
            
            await checkSyncStatus();
            await checkActiveUser();
          } catch (error) {
            err('❌ App initialization failed:', error);
          }
        };
        initializeApp();
        isInitialized.current = true;
      }
      return () => { isMounted = false; };
    }, [checkActiveUser]);
  
    // Realtime: immediately sign out if current user's profile becomes inactive
    useEffect(() => {
      let channel: ReturnType<typeof supabase.channel> | null = null;
      let active = true;
      (async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          if (!active) return;
          channel = supabase
            .channel('user_profile_deactivation')
            .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `id=eq.${user.id}` },
              async (payload: any) => {
                try {
                  const row = payload.new || {};
                  const isActive = row.is_active !== false;
                  if (!isActive && !deactivationHandledRef.current) {
                    deactivationHandledRef.current = true;
                    await supabase.auth.signOut();
                    Alert.alert('Access Blocked', 'Your account has been deactivated.');
                    if (navigationRef.current?.isReady()) {
                      navigationRef.current.dispatch(
                        CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })
                      );
                    }
                  }
                } catch {
                  // ignore
                }
              }
            )
            .subscribe();
        } catch {
          // ignore
        }
      })();
  
      return () => {
        active = false;
        if (channel) {
          supabase.removeChannel(channel);
          channel = null;
        }
      };
    }, []);
  
    // Track if app was truly closed or just backgrounded
    const appStateRef = useRef(AppState.currentState);
    const wasInBackgroundRef = useRef(false);
    const isCameraActiveRef = useRef(false); // Track if camera is active
  
    useEffect(() => {
      log('🚀 APP LAUNCH: Initial setup, wasInBackgroundRef =', wasInBackgroundRef.current);
      
      const handleAppStateChange = async (nextAppState: AppStateStatus) => {
        const previousState = appStateRef.current;
        log('📱 APP STATE CHANGE:', previousState, '→', nextAppState, 'isCameraActive:', isCameraActiveRef.current);
        
        // Track state transitions
        if (previousState === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
          // App going to background - save timestamp
          const timestamp = Date.now();
          wasInBackgroundRef.current = true;
          await AsyncStorage.setItem('app_background_time', timestamp.toString());
          log('⏸️ APP GOING TO BACKGROUND: Saved timestamp', timestamp, 'wasInBackgroundRef =', wasInBackgroundRef.current);
        }
        
        // When app is completely closed (not just backgrounded)
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          // Save close time for detecting fresh launches
          await AsyncStorage.setItem(APP_CLOSE_TIME_KEY, Date.now().toString());
          log('💾 Saved app close time');
        }
        
        if (nextAppState === 'active') {
          log('▶️ APP BECOMING ACTIVE: wasInBackgroundRef =', wasInBackgroundRef.current);
          
          // Check if camera was active
          const cameraActive = await AsyncStorage.getItem('camera_active');
          if (cameraActive === 'true') {
            isCameraActiveRef.current = true;
            log('📸 Camera was active, will not reset navigation');
          }
          
          // Check if this is a fresh app launch or resume from background
          const backgroundTime = await AsyncStorage.getItem('app_background_time');
          const timeSinceBackground = backgroundTime ? Date.now() - parseInt(backgroundTime) : 0;
          
          log('⏱️ TIME CHECK: backgroundTime =', backgroundTime, 'timeSinceBackground =', timeSinceBackground, 'ms');
          
          // IMPORTANT: Don't reset navigation if camera was active
          const shouldResetNavigation = !isCameraActiveRef.current && 
                                        (!wasInBackgroundRef.current || timeSinceBackground > 5000);
          
          if (shouldResetNavigation) {
            log('🔄 FRESH LAUNCH DETECTED: Checking for pending login request before navigating...');
            log('   Reason:', !wasInBackgroundRef.current ? 'wasInBackgroundRef is false' : `timeSinceBackground (${timeSinceBackground}ms) > 5000ms`);

            // SECURITY FIX: Check if user has a pending login request before resetting to Home
            let hasPendingRequest = false;
            try {
              const waitingFlag = await AsyncStorage.getItem('waiting_for_admin');
              if (waitingFlag === 'true') {
                // Double-check against the database to be sure
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  const { data: pendingRequest } = await supabase
                    .from('login_requests')
                    .select('id, status')
                    .eq('user_id', user.id)
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                  if (pendingRequest) {
                    hasPendingRequest = true;
                    log('🔒 SECURITY: Pending login request found, NOT navigating to Home');
                  }
                }
              }
            } catch (e) {
              log('Could not check pending login request:', e);
            }

            await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);

            if (hasPendingRequest) {
              // Send back to Login so the waiting screen can resume
              if (navigationRef.current?.isReady()) {
                navigationRef.current.dispatch(
                  CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })
                );
                log('✅ Navigation reset to Login screen (pending approval)');
              }
            } else if (navigationRef.current?.isReady()) {
              navigationRef.current.dispatch(
                CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] })
              );
              log('✅ Navigation reset to Home screen');
            } else {
              log('⚠️ Navigation ref not ready');
            }
          } else {
            if (isCameraActiveRef.current) {
              log('📸 CAMERA WAS ACTIVE: Staying on current screen');
            } else {
              log('↩️ RESUME FROM BACKGROUND: Staying on current screen');
              log('   timeSinceBackground =', timeSinceBackground, 'ms (< 5000ms)');
            }
          }
          
          // Reset flags when app becomes active
          wasInBackgroundRef.current = false;
          isCameraActiveRef.current = false; // Reset camera flag
          await AsyncStorage.removeItem('app_background_time');
          await AsyncStorage.removeItem('camera_active'); // Clean up camera flag
          log('🧹 Cleaned up: wasInBackgroundRef = false, isCameraActive = false, background_time removed');
          
          await syncAllDataFixed();
          await checkSyncStatus();
          await checkActiveUser();
        }
        
        appStateRef.current = nextAppState;
      };
      const subscription = AppState.addEventListener('change', handleAppStateChange);
      return () => subscription?.remove();
    }, [checkActiveUser]);
  
    const checkSyncStatus = async () => {
      const status = await getSyncStatus();
      setSyncStatus(status);
    };
  
    
  
    const showSyncStatus = () => {
      const { lastSync, pendingOperations, isOnline } = syncStatus;
      let message = `Status: ${isOnline ? 'Online' : 'Offline'}`;
      
      if (pendingOperations > 0) {
        message += `\n${pendingOperations} operations pending sync`;
      }
      
      if (lastSync) {
        message += `\nLast sync: ${new Date(lastSync).toLocaleString()}`;
      }
      Alert.alert('Sync Status', message);
    };
    
    const [showCalc, setShowCalc] = useState(false);
    const [currentRouteName, setCurrentRouteName] = useState<string | undefined>(undefined);
    
    // Hide calculator only on specific screens: Splash, Login, BiometricAuth, and EWayBillConsolidated
    const hideCalculatorScreens = ['Splash', 'Login', 'BiometricAuth', 'EWayBillConsolidated'];
    const shouldShowCalculator = currentRouteName && !hideCalculatorScreens.includes(currentRouteName);
  
    // Draggable FAB state
    const FAB_W = 48, FAB_H = 48, MARGIN = 12;
    const getFabWin = () => Dimensions.get('window');
    const defaultFabPos = useCallback(() => {
      const { width, height } = getFabWin();
      return { x: Math.max(MARGIN, width - FAB_W - 16), y: Math.max(MARGIN, height - FAB_H - 32) };
    }, []);
    const [fabPos, setFabPos] = useState<{ x: number; y: number } | null>(null);
    const fabPosRef = useRef<{ x: number; y: number } | null>(null);
  
    useEffect(() => {
      let isMounted = true;
      (async () => {
        try {
          const [sx, sy] = await Promise.all([
            AsyncStorage.getItem('calc_fab_x'),
            AsyncStorage.getItem('calc_fab_y'),
          ]);
          if (sx != null && sy != null) {
            const x = parseFloat(sx); const y = parseFloat(sy);
            if (!Number.isNaN(x) && !Number.isNaN(y)) {
              const p = { x, y };
              if (isMounted) { setFabPos(p); fabPosRef.current = p; }
              return;
            }
          }
        } catch {}
        if (isMounted) {
          const def = defaultFabPos();
          setFabPos(def);
          fabPosRef.current = def;
        }
      })();
      return () => { isMounted = false; };
    }, [defaultFabPos]);
  
    // Keep ref in sync in case position changes via state
    useEffect(() => {
      if (fabPos) fabPosRef.current = fabPos;
    }, [fabPos]);
  
    const clampPos = (x: number, y: number) => {
      const { width, height } = getFabWin();
      const minX = MARGIN, minY = MARGIN;
      const maxX = width - FAB_W - MARGIN;
      const maxY = height - FAB_H - (MARGIN + 4);
      return { x: Math.min(Math.max(x, minX), maxX), y: Math.min(Math.max(y, minY), maxY) };
    };
  
    const dragOrigin = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const panRef = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
        onPanResponderGrant: () => {
          const base = fabPosRef.current ?? defaultFabPos();
          dragOrigin.current = { x: base.x, y: base.y };
        },
        onPanResponderMove: (_, g) => {
          const next = clampPos(dragOrigin.current.x + g.dx, dragOrigin.current.y + g.dy);
          fabPosRef.current = next;
          setFabPos(next);
        },
        onPanResponderRelease: async () => {
          const p = fabPosRef.current ?? defaultFabPos();
          await AsyncStorage.multiSet([
            ['calc_fab_x', String(p.x)],
            ['calc_fab_y', String(p.y)],
          ]).catch(() => {});
          setFabPos(p);
        },
      })
    ).current;
  
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <OfficeProvider>
          <UserAccessProvider>
            <AlertProvider>
              <LoginRequestListener />
              {isNavigationReady && (
                <NavigationContainer
                  ref={navigationRef as React.Ref<NavigationContainerRef<RootStackParamList>>}
                  initialState={initialNavigationState}
                  onStateChange={(state: NavigationState | undefined) => {
                    if (state) {
                      const currentRoute = state.routes[state.index];
                      setCurrentRouteName(currentRoute?.name);
                      
                      // Persist navigation state - Validates: Requirement 9.4
                      AsyncStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify(state))
                        .catch((error) => {
                          warn('⚠️ Failed to persist navigation state:', error);
                        });
                    }
                  }}
                >
            <View style={styles.container}>
              <Stack.Navigator
                initialRouteName="Splash"
                screenOptions={{ headerShown: false }}
              >
                <Stack.Screen name="Splash" component={SplashScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="BiometricAuth" component={BiometricAuthScreen} />
                <Stack.Screen name="Home">
                  {(props: NativeStackScreenProps<RootStackParamList, 'Home'>) => (
                    <HomeScreen
                      {...props}
                      syncStatus={{
                        lastSync: syncStatus.lastSync,
                        pendingOperations: syncStatus.pendingOperations,
                        isOnline: syncStatus.isOnline
                      }}
                      onSyncStatusPress={showSyncStatus}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen name="AddAgency" component={AddAgencyScreen} />
                <Stack.Screen name="PaidSection" component={PaidSectionScreen} />
                <Stack.Screen name="AddMajuri" component={AddMajuriScreen} />
                <Stack.Screen name="DriverDetails" component={DriverDetailsScreen} />
                <Stack.Screen name="AddTruckFuel" component={AddTruckFuelScreen} />
                <Stack.Screen name="Statement" component={StatementScreen} />
                <Stack.Screen name="MonthlyStatement" component={MonthlyStatementScreen} />
                <Stack.Screen name="DailyReport" component={DailyReportScreen} />
                <Stack.Screen
                  name="ManageCash"
                  component={ManageCashScreen}
                  options={{ title: 'Manage Cash Adjustment' }}
                />
                <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
                <Stack.Screen name="AddGeneralEntry" component={AddGeneralEntryScreen} />
                <Stack.Screen name="DriverStatement" component={DriverStatementScreen} />
                <Stack.Screen name="History" component={HistoryScreen} />
                <Stack.Screen name="AgencyEntry" component={AgencyEntryScreen} />
                <Stack.Screen name="TotalPaid" component={TotalPaidScreen} />
                <Stack.Screen name="EWayBillConsolidated" component={EWayBillConsolidatedScreen} />
                <Stack.Screen name="AdminNotifications" component={AdminNotificationScreen} options={{ title: 'Admin Notifications' }} />
                <Stack.Screen name="SendNotification" component={SendNotificationScreen} options={{ title: 'Send Notification' }} />
                <Stack.Screen name="NotificationPassword" component={NotificationPasswordScreen} options={{ title: 'Enter Password' }} />
                <Stack.Screen name="AdminPasswordReset" component={AdminPasswordResetScreen} options={{ title: 'Password Management' }} />
                <Stack.Screen name="PageBuilder" component={PageBuilderScreen} options={{ title: 'Create Custom Page' }} />
                <Stack.Screen name="PageManagement" component={PageManagementScreen} options={{ title: 'Manage Pages' }} />
                <Stack.Screen name="UppadJama" component={UppadJamaScreen} options={{ title: 'Uppad/Jama' }} />
                <Stack.Screen name="UserUppadJama" component={UserUppadJamaScreen} options={{ title: 'My Uppad/Jama' }} />
                <Stack.Screen 
                  name="MumbaiDelivery" 
                  component={MumbaiDeliveryEntryScreen} 
                  options={({ navigation }) => {
                    const statusBarHeight = Platform.OS === 'android' ? 40 : 0; // Match CommonHeader status bar height
                    return {
                      headerShown: true,
                      header: () => (
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: Colors.primary,
                          paddingHorizontal: 12,
                          height: 70 + statusBarHeight,
                          paddingTop: 10+statusBarHeight,
                          elevation: 4,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                        }}>
                          <TouchableOpacity 
                            onPress={() => navigation.goBack()}
                            style={{
                              width: 40,
                              height: 40,
                              justifyContent: 'center',
                              alignItems: 'center',
                              marginRight: 8,
                            }}
                          >
                            <Text style={{
                              color: Colors.surface,
                              fontSize: 28,
                              fontWeight: 'bold',
                              lineHeight: 32,
                            }}>{'<'}</Text>
                          </TouchableOpacity>
                          
                          <View style={{
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingHorizontal: 8,
                          }}>
                            <Text style={{
                              color: Colors.surface,
                              fontWeight: '700',
                              fontSize: 18,
                              textAlign: 'center',
                            }} numberOfLines={1}>Mumbai Delivery</Text>
                          </View>
                          
                          <TouchableOpacity 
                            onPress={() => navigation.navigate('PaymentConfirmation' as never)}
                            style={{
                              width: 40,
                              height: 40,
                              justifyContent: 'center',
                              alignItems: 'center',
                              marginLeft: 8,
                            }}
                          >
                            <Text style={{
                              color: Colors.surface,
                              fontSize: 24,
                              fontWeight: 'bold',
                            }}>✓</Text>
                          </TouchableOpacity>
                        </View>
                      ),
                    };
                  }} 
                />
                <Stack.Screen 
                  name="PaymentConfirmation" 
                  component={PaymentConfirmationScreen} 
                  options={{ title: 'Confirm Payment' }} 
                />
                <Stack.Screen name="BackdatedEntry" component={BackdatedEntryScreen} options={{ title: 'Backdated Entry' }} />
                <Stack.Screen name="DailyEntries" component={DailyEntriesScreen} options={{ title: 'Daily Entries' }} />
                <Stack.Screen name="NotificationTest" component={NotificationTestScreen} />
                <Stack.Screen name="ComprehensiveNotificationTest" component={ComprehensiveNotificationTest} options={{ title: 'Complete Notification Test' }} />
                <Stack.Screen name="LeaveCashSetupScreen" component={LeaveCashSetupScreen} options={{ title: 'Setup Cash Amount' }} />
                <Stack.Screen name="CashVerificationScreen" component={CashVerificationScreen} options={{ title: 'Verify Cash' }} />
                <Stack.Screen name="CashHistoryScreen" component={CashHistoryScreen} options={{ title: 'Cash History' }} />
                <Stack.Screen name="UserAccessManagementScreen" component={UserAccessManagementScreen} options={{ title: 'User Access Management' }} />
                <Stack.Screen name="AdminPasswordChangeScreen" component={AdminPasswordChangeScreen} options={{ title: 'Change User Password' }} />
                <Stack.Screen name="AdminUserManagement" component={AdminUserManagementScreen} options={{ title: 'User Display Names' }} />
                <Stack.Screen name="MajurDashboard" component={MajurDashboardScreen} options={{ title: 'Majur Dashboard' }} />
                <Stack.Screen name="OfficeManagement" component={OfficeManagementScreen} options={{ title: 'Office Management' }} />
            </Stack.Navigator>

              {shouldShowCalculator && fabPos && (
                <>
                  <View
                    style={[styles.calcFabContainer, { top: fabPos.y, left: fabPos.x }]}
                    {...panRef.panHandlers}
                  >
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={styles.calcFab}
                      onPress={() => setShowCalc(true)}
                    >
                      <Icon name="calculator" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <CalculatorOverlay visible={showCalc} onClose={() => setShowCalc(false)} />
                </>
              )}
            </View>
            </NavigationContainer>
          )}
          </AlertProvider>
        </UserAccessProvider>
      </OfficeProvider>
      </GestureHandlerRootView>
    );
  }
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    calcFabContainer: {
      position: 'absolute',
      width: 48,
      height: 48,
    },
    calcFab: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#007AFF',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
    },
  });
  
  const stylesCalc = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' },
    dragContainer: {
      position: 'absolute',
    },
    card: { 
      backgroundColor: '#fff', 
      borderRadius: 12, 
      padding: 12, 
      elevation: 6,
      flex: 1,
      minHeight: 400,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { fontSize: 16, fontWeight: '700', color: '#222' },
    closeBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    closeText: { fontSize: 16, color: '#333' },
    displayBox: { 
      padding: 12, 
      borderWidth: StyleSheet.hairlineWidth, 
      borderColor: '#ddd', 
      borderRadius: 8, 
      marginBottom: 12, 
      backgroundColor: '#fafafa',
      minHeight: 60,
      justifyContent: 'center',
    },
    displayMain: { fontSize: 24, fontWeight: '700', textAlign: 'right', color: '#111' },
    displayExpr: { fontSize: 14, textAlign: 'right', color: '#666', marginTop: 4 },
    row: { 
      flex: 1, 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      marginVertical: 2,
    },
    key: { 
      flex: 1, 
      backgroundColor: '#f2f2f2', 
      marginHorizontal: 2, 
      paddingVertical: 12, 
      borderRadius: 8, 
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 45,
    },
    keyOp: { backgroundColor: '#e6f0ff' },
    dragHandle: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dragHandleIndicator: {
      width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2,
    },
    buttonsContainer: {
      flex: 1,
      paddingTop: 8,
    },
    keyUtil: { backgroundColor: '#ffecec' },
    keyText: { fontSize: 16, color: '#222', fontWeight: '600' },
    keyEquals: { flex: 2 },
    zeroKey: { flex: 2 },
    resizeHandle: {
      position: 'absolute',
      right: 6,
      bottom: 6,
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resizeIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#f0f0f0',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#ccc',
    },
    resizeText: { fontSize: 14, color: '#777' },
    resizeIndicator: { 
      position: 'absolute', 
      bottom: 0, 
      left: 0, 
      right: 0, 
      padding: 4, 
      backgroundColor: 'rgba(0,0,0,0.6)', 
      borderBottomLeftRadius: 12, 
      borderBottomRightRadius: 12, 
      alignItems: 'center' 
    },
    resizeIndicatorText: { color: '#fff', fontSize: 10 },
    resetHandle: {
      position: 'absolute',
      right: 6,
      bottom: 36, // Above the resize handle
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#fff0f0',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#ffcccc',
    },
    resetText: { fontSize: 14, color: '#ff6666' },
  });

// ... (rest of the code remains the same)

export default App;