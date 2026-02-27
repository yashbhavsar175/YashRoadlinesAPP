// EWayBillConsolidatedScreen.tsx - IMPROVED VERSION

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Linking,
  Alert,
  Platform,
  PermissionsAndroid,
  ToastAndroid,
  Share
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getEWayBillSettings, saveEWayBillSettings } from '../data/Storage';
import RNFS from 'react-native-fs';
import { generatePDF } from 'react-native-html-to-pdf';
import RNShare from 'react-native-share';

const EWAY_BASE_URL = 'https://ewaybillgst.gov.in/';
const EWAY_LOGIN_URL = 'https://ewaybillgst.gov.in/login.aspx';

export default function EWayBillConsolidatedScreen() {
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [webSrc, setWebSrc] = useState(EWAY_LOGIN_URL);
  const [vehicleFrom, setVehicleFrom] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [currentUrl, setCurrentUrl] = useState(EWAY_LOGIN_URL);
  const [downloading, setDownloading] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const s = await getEWayBillSettings();
      setUsername(s.username || '');
      setPassword(s.password || '');
      setVehicleFrom(s.vehicle_from || '');
      setVehicleNo(s.vehicle_no || '');
      if (!s.username || !s.password) setShowSettingsModal(true);
    } catch (e) {
      setShowSettingsModal(true);
    }
  }, []);

  // Enhanced permission request
  const requestStoragePermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') return true;

    try {
      console.log('📱 Requesting storage permissions...');
      
      const permissions = [
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      ];

      const results = await PermissionsAndroid.requestMultiple(permissions);
      console.log('Permission results:', results);

      const writeGranted = results[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED;

      if (!writeGranted) {
        Alert.alert(
          'Storage Permission Required',
          'Please enable storage permission to download files:\n\n1. Go to Settings > Apps > YashRoadlines\n2. Tap Permissions\n3. Enable Storage',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) }
          ]
        );
        return false;
      }

      console.log('✅ Storage permissions granted');
      return true;

    } catch (err) {
      console.error('❌ Permission request error:', err);
      Alert.alert(
        'Permission Error',
        'Could not request permissions. Please enable storage permission manually in device settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  // Save base64 PDF received from WebView
  const saveBase64Pdf = async (base64: string, suggestedName?: string) => {
    try {
      setDownloading(true);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const finalFileName = suggestedName || `EWayBill_${timestamp}.pdf`;

      const { path: downloadDest } = await getDownloadPath(finalFileName);
      await RNFS.writeFile(downloadDest, base64, 'base64');

      setDownloading(false);
      const fileExists = await RNFS.exists(downloadDest);
      if (!fileExists) throw new Error('File write failed');
      const fileStat = await RNFS.stat(downloadDest);
      if ((fileStat?.size || 0) <= 0) throw new Error('File is empty after write');

      ToastAndroid.show(`PDF downloaded successfully! Size: ${Math.round(fileStat.size / 1024)}KB`, ToastAndroid.LONG);
      Alert.alert(
        '✅ Download Successful!',
        `File: ${finalFileName}\nSize: ${Math.round(fileStat.size / 1024)}KB\nLocation: ${downloadDest.includes('Downloads') ? 'Downloads folder' : 'App storage'}`,
        [
          { text: 'OK' },
          { text: 'Open File', onPress: () => openPDFWithMultipleMethods(downloadDest, finalFileName) }
        ]
      );
      setTimeout(() => openPDFWithMultipleMethods(downloadDest, finalFileName), 800);
    } catch (error) {
      setDownloading(false);
      const msg = error instanceof Error ? error.message : String(error);
      Alert.alert('Download Failed', msg);
    }
  };

  // Better download path and directory creation
  const getDownloadPath = async (fileName: string): Promise<{ path: string; needsPermission: boolean }> => {
    if (Platform.OS === 'ios') {
      return {
        path: `${RNFS.DocumentDirectoryPath}/${fileName}`,
        needsPermission: false
      };
    }

    const downloadPaths = [
      {
        path: `${RNFS.DownloadDirectoryPath}/${fileName}`,
        needsPermission: true,
        description: 'Public Downloads'
      },
      {
        path: `${RNFS.ExternalDirectoryPath}/Downloads/${fileName}`,
        needsPermission: false,
        description: 'App External Storage'
      },
      {
        path: `${RNFS.DocumentDirectoryPath}/${fileName}`,
        needsPermission: false,
        description: 'App Documents'
      }
    ];

    for (const option of downloadPaths) {
      try {
        console.log(`🔍 Trying ${option.description}: ${option.path}`);
        
        const dirPath = option.path.substring(0, option.path.lastIndexOf('/'));
        const dirExists = await RNFS.exists(dirPath);
        
        if (!dirExists) {
          await RNFS.mkdir(dirPath);
          console.log(`📁 Created directory: ${dirPath}`);
        }

        const testFile = `${dirPath}/test_${Date.now()}.tmp`;
        await RNFS.writeFile(testFile, 'test', 'utf8');
        await RNFS.unlink(testFile);
        
        console.log(`✅ Write test successful for ${option.description}`);
        return {
          path: option.path,
          needsPermission: false
        };

      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`❌ ${option.description} failed:`, msg);
        continue;
      }
    }

    return {
      path: `${RNFS.DocumentDirectoryPath}/${fileName}`,
      needsPermission: false
    };
  };

  // Enhanced download with better error handling
  const handleFileDownload = async (downloadUrl: string, fileName?: string) => {
    try {
      setDownloading(true);
      console.log('🚀 Starting download from:', downloadUrl);

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const finalFileName = fileName || `EWayBill_${timestamp}.pdf`;
      
      const { path: downloadDest, needsPermission } = await getDownloadPath(finalFileName);
      console.log('📁 Download destination:', downloadDest);

      if (needsPermission) {
        const hasPermission = await requestStoragePermissions();
        if (!hasPermission) {
          setDownloading(false);
          return;
        }
      }

      console.log('📥 Starting file download...');
      const downloadResult = await RNFS.downloadFile({
        fromUrl: downloadUrl,
        toFile: downloadDest,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
          'Accept': 'application/pdf,application/octet-stream,*/*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Referer': 'https://ewaybillgst.gov.in/',
          'Connection': 'keep-alive'
        },
        progressDivider: 1,
        progress: (res) => {
          const progress = (res.bytesWritten / res.contentLength) * 100;
          console.log(`📊 Download progress: ${progress.toFixed(2)}%`);
        }
      }).promise;

      setDownloading(false);
      console.log('📋 Download response status:', downloadResult.statusCode);

      if (downloadResult.statusCode === 200) {
        const fileExists = await RNFS.exists(downloadDest);
        console.log('📄 File exists:', fileExists);

        if (fileExists) {
          const fileStat = await RNFS.stat(downloadDest);
          console.log('📊 File stats:', {
            size: fileStat.size,
            path: downloadDest,
            name: finalFileName
          });

          if (fileStat.size > 0) {
            console.log('✅ File downloaded successfully!');
            ToastAndroid.show(`PDF downloaded successfully! Size: ${Math.round(fileStat.size / 1024)}KB`, ToastAndroid.LONG);

            Alert.alert(
              '✅ Download Successful!',
              `File: ${finalFileName}\nSize: ${Math.round(fileStat.size / 1024)}KB\nLocation: ${downloadDest.includes('Downloads') ? 'Downloads folder' : 'App storage'}`,
              [
                { text: 'OK' },
                { 
                  text: 'Open File', 
                  onPress: () => openPDFWithMultipleMethods(downloadDest, finalFileName)
                }
              ]
            );

            setTimeout(() => {
              openPDFWithMultipleMethods(downloadDest, finalFileName);
            }, 1000);

          } else {
            throw new Error('Downloaded file is empty (0 bytes)');
          }
        } else {
          throw new Error('File was not created at the specified path');
        }
      } else {
        throw new Error(`Download failed with HTTP status: ${downloadResult.statusCode}`);
      }

    } catch (error) {
      console.error('❌ Download error:', error);
      setDownloading(false);
      
      Alert.alert(
        'Download Failed',
        `Error: ${(error instanceof Error ? error.message : String(error))}\n\nTry these solutions:`,
        [
          { text: 'Retry Download', onPress: () => handleFileDownload(downloadUrl, fileName) },
          { text: 'Open in Browser', onPress: () => Linking.openURL(downloadUrl).catch(() => {}) },
          { text: 'Enable Permissions', onPress: () => Linking.openSettings().catch(() => {}) }
        ]
      );
    }
  };

  // Capture current page HTML
  const captureCurrentHtml = () => {
    const jsCode = `(() => {
      try {
        const html = new XMLSerializer().serializeToString(document.documentElement);
        const title = document.title || 'EWayBill';
        window.ReactNativeWebView.postMessage(JSON.stringify({ tag: 'html_content', html, title }));
      } catch (e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ tag: 'pdf_download_error', error: (e && e.message) || String(e) }));
      }
      return true;
    })();`;
    webRef.current?.injectJavaScript(jsCode);
  };

  // Generate PDF from HTML
  const saveHtmlAsPdf = async (html: string, suggestedName?: string) => {
    try {
      setDownloading(true);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const baseName = (suggestedName || `EWayBill_${timestamp}`).replace(/\.pdf$/i, '');

      const pdf = await generatePDF({
        html,
        fileName: baseName,
        base64: false,
      });

      if (!pdf?.filePath) throw new Error('PDF generation failed');

      const finalFileName = `${baseName}.pdf`;
      const { path: destPath } = await getDownloadPath(finalFileName);

      await RNFS.copyFile(pdf.filePath, destPath);

      setDownloading(false);
      const stat = await RNFS.stat(destPath);
      ToastAndroid.show(`PDF saved: ${Math.round((stat.size || 0) / 1024)}KB`, ToastAndroid.LONG);

      try {
        await RNShare.open({ url: `file://${destPath}`, type: 'application/pdf', failOnCancel: false, showAppsToView: true });
      } catch (e) {
        await openPDFWithMultipleMethods(destPath, finalFileName);
      }

    } catch (e) {
      setDownloading(false);
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('PDF Creation Failed', msg);
    }
  };

  // Enhanced PDF opening methods
  const openPDFWithMultipleMethods = async (filePath: string, fileName: string) => {
    try {
      console.log('📱 Attempting to open PDF:', filePath);

      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        Alert.alert('File Not Found', 'The downloaded file could not be located.');
        return;
      }

      const methods = [
        {
          name: 'Direct File URI',
          action: () => Linking.openURL(`file://${filePath}`)
        },
        {
          name: 'Content URI',
          action: () => {
            const contentUri = filePath.includes('/Downloads/') 
              ? `content://com.android.externalstorage.documents/document/primary:Downloads/${fileName}`
              : `content://media/external/file/${Date.now()}`;
            return Linking.openURL(contentUri);
          }
        },
        {
          name: 'RN Share Open',
          action: () => RNShare.open({ url: `file://${filePath}`, type: 'application/pdf', failOnCancel: false, showAppsToView: true })
        },
        {
          name: 'Share Dialog',
          action: () => Share.share({
            url: `file://${filePath}`,
            title: 'Open with PDF Reader',
            message: `Open ${fileName} with your PDF reader app`
          })
        }
      ];

      for (const method of methods) {
        try {
          console.log(`🔄 Trying ${method.name}...`);
          await method.action();
          console.log(`✅ ${method.name} succeeded`);
          
          if (method.name === 'Share Dialog') {
            ToastAndroid.show('Select a PDF app to open the file', ToastAndroid.LONG);
          }
          
          return;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.log(`❌ ${method.name} failed:`, msg);
          continue;
        }
      }

      Alert.alert(
        '📄 File Downloaded Successfully!',
        `PDF saved: ${fileName}\n\nCannot open automatically. Please:`,
        [
          { text: 'Install PDF Reader', onPress: () => Linking.openURL('https://play.google.com/store/apps/details?id=com.adobe.reader') },
          { text: 'Open Downloads Folder', onPress: () => Linking.openURL('content://com.android.externalstorage.documents/document/primary%3ADownload').catch(() => {}) },
          { text: 'OK' }
        ]
      );

    } catch (error) {
      console.error('❌ PDF opening error:', error);
      Alert.alert(
        'File Ready ✅',
        `PDF downloaded successfully!\n\nFile: ${fileName}\n\nPlease install a PDF reader app to view the file.`,
        [
          { text: 'Install Adobe Reader', onPress: () => Linking.openURL('https://play.google.com/store/apps/details?id=com.adobe.reader') },
          { text: 'OK' }
        ]
      );
    }
  };

  // Print bridge injection
  const injectPrintBridge = useCallback(() => {
    const js = `(() => {
      try {
        window.print = function() {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ 
            tag: 'print_to_download',
            url: window.location.href,
            title: document.title,
            timestamp: Date.now()
          })); 
        };
        
        const _open = window.open;
        window.open = function(url, name, specs) {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ 
            tag: 'window_open_to_download', 
            url: String(url || ''),
            timestamp: Date.now()
          })); 
          return null;
        };
        
        document.addEventListener('click', function(ev) {
          try {
            const target = ev.target;
            if (!target) return;
            
            const targetText = (target.textContent || '').toLowerCase();
            const targetValue = (target.value || '').toLowerCase();
            const targetId = (target.id || '').toLowerCase();
            
            if (targetText.includes('print') || targetValue.includes('print') || targetId.includes('print')) {
              ev.preventDefault();
              ev.stopPropagation();
              
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ 
                tag: 'print_button_to_download',
                url: window.location.href,
                timestamp: Date.now()
              }));
            }
          } catch(e) {
            console.error('Print detection error:', e);
          }
        }, true);
        
      } catch (e) {
        console.error('Print bridge error:', e);
      }
      return true;
    })();`;

    webRef.current?.injectJavaScript(js);
  }, []);

  // IMPROVED AUTO-FILL FUNCTION - POST LOGIN FLOW
  const injectPostLoginFlow = useCallback(() => {
    if (!vehicleFrom && !vehicleNo) return;

    const esc = (s: string) => (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const vf = esc(vehicleFrom);
    const vn = esc(vehicleNo);

    const js = `(() => {
      try {
        // Enhanced value setting function
        const setElValue = (el, val) => {
          if (!el || !val) return false;
          try {
            console.log('🔧 Setting value for:', el.id || el.name || 'unknown', 'Value:', val);
            
            // Remove restrictions
            if (el.hasAttribute('readonly')) el.removeAttribute('readonly');
            if (el.disabled) el.disabled = false;
            
            // Focus element
            el.focus();
            el.select();
            
            // Clear existing value
            el.value = '';
            
            // Set value using multiple methods
            try {
              const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
              const desc = Object.getOwnPropertyDescriptor(proto, 'value');
              const setter = desc && desc.set ? desc.set : null;
              if (setter) {
                setter.call(el, val);
              } else {
                el.value = val;
              }
            } catch { 
              el.value = val; 
            }
            
            // Trigger all possible events
            const events = ['input', 'change', 'keyup', 'keydown', 'blur', 'focus'];
            events.forEach(eventType => {
              try {
                el.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
              } catch {}
            });
            
            // Special keyboard events
            try {
              el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
              el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }));
            } catch {}
            
            // Click and blur
            try { el.click(); } catch {}
            el.blur();
            
            // Scroll into view
            try { 
              el.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
            } catch {}
            
            console.log('✅ Value set successfully:', el.value);
            return true;
          } catch(e) { 
            console.error('❌ Error setting value:', e);
            return false; 
          }
        };

        const log = (msg) => {
          try { 
            console.log('AutoFill:', msg);
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ tag: 'autofill_log', msg })); 
          } catch {}
        };

        // Enhanced field finder with more comprehensive selectors
        const findField = (type) => {
          log('🔍 Searching for ' + type + ' field...');
          
          const selectors = type === 'from' ? [
            // Vehicle From selectors - more comprehensive
            "input[id*='vehiclefrom' i]", "textarea[id*='vehiclefrom' i]",
            "input[name*='vehiclefrom' i]", "textarea[name*='vehiclefrom' i]",
            "input[id*='fromplace' i]", "textarea[id*='fromplace' i]",
            "input[name*='fromplace' i]", "textarea[name*='fromplace' i]",
            "input[id*='from_place' i]", "textarea[id*='from_place' i]",
            "input[name*='from_place' i]", "textarea[name*='from_place' i]",
            "input[id*='txtfrom' i]", "textarea[id*='txtfrom' i]",
            "input[name*='txtfrom' i]", "textarea[name*='txtfrom' i]",
            "input[id*='txt_from' i]", "textarea[id*='txt_from' i]",
            "input[name*='txt_from' i]", "textarea[name*='txt_from' i]",
            "input[placeholder*='from' i]", "textarea[placeholder*='from' i]",
            "input[placeholder*='place' i]", "textarea[placeholder*='place' i]",
            "input[aria-label*='from' i]", "textarea[aria-label*='from' i]",
            "input[title*='from' i]", "textarea[title*='from' i]"
          ] : [
            // Vehicle Number selectors - very comprehensive
            "input[id*='vehicleno' i]", "textarea[id*='vehicleno' i]",
            "input[name*='vehicleno' i]", "textarea[name*='vehicleno' i]",
            "input[id*='vehicle_no' i]", "textarea[id*='vehicle_no' i]",
            "input[name*='vehicle_no' i]", "textarea[name*='vehicle_no' i]",
            "input[id*='txtvehicleno' i]", "textarea[id*='txtvehicleno' i]",
            "input[name*='txtvehicleno' i]", "textarea[name*='txtvehicleno' i]",
            "input[id*='txt_vehicle_no' i]", "textarea[id*='txt_vehicle_no' i]",
            "input[name*='txt_vehicle_no' i]", "textarea[name*='txt_vehicle_no' i]",
            "input[id*='vehno' i]", "textarea[id*='vehno' i]",
            "input[name*='vehno' i]", "textarea[name*='vehno' i]",
            "input[id*='vehiclenumber' i]", "textarea[id*='vehiclenumber' i]",
            "input[name*='vehiclenumber' i]", "textarea[name*='vehiclenumber' i]",
            "input[id*='vehreg' i]", "textarea[id*='vehreg' i]",
            "input[name*='vehreg' i]", "textarea[name*='vehreg' i]",
            "input[id*='regno' i]", "textarea[id*='regno' i]",
            "input[name*='regno' i]", "textarea[name*='regno' i]",
            "input[id*='reg_no' i]", "textarea[id*='reg_no' i]",
            "input[name*='reg_no' i]", "textarea[name*='reg_no' i]",
            "input[id*='registrationno' i]", "textarea[id*='registrationno' i]",
            "input[name*='registrationno' i]", "textarea[name*='registrationno' i]",
            "input[id*='registration_no' i]", "textarea[id*='registration_no' i]",
            "input[name*='registration_no' i]", "textarea[name*='registration_no' i]",
            "input[id*='truckno' i]", "textarea[id*='truckno' i]",
            "input[name*='truckno' i]", "textarea[name*='truckno' i]",
            "input[id*='lorryno' i]", "textarea[id*='lorryno' i]",
            "input[name*='lorryno' i]", "textarea[name*='lorryno' i]",
            "input[placeholder*='vehicle' i]", "textarea[placeholder*='vehicle' i]",
            "input[placeholder*='reg' i]", "textarea[placeholder*='reg' i]",
            "input[placeholder*='registration' i]", "textarea[placeholder*='registration' i]",
            "input[aria-label*='vehicle' i]", "textarea[aria-label*='vehicle' i]",
            "input[title*='vehicle' i]", "textarea[title*='vehicle' i]",
            "input[class*='vehicleno' i]", "textarea[class*='vehicleno' i]",
            "input[class*='vehicle_no' i]", "textarea[class*='vehicle_no' i]"
          ];

          // Try each selector
          for (const selector of selectors) {
            try {
              const elements = document.querySelectorAll(selector);
              for (const el of elements) {
                const name = (el.getAttribute('name') || '').toLowerCase();
                const id = (el.getAttribute('id') || '').toLowerCase();
                const ph = (el.getAttribute('placeholder') || '').toLowerCase();
                const className = (el.getAttribute('class') || '').toLowerCase();
                const combined = name + ' ' + id + ' ' + ph + ' ' + className;
                
                // Skip unwanted fields
                if (type === 'from' && combined.includes('state')) continue;
                if (type !== 'from' && (combined.includes('type') || combined.includes('state'))) continue;
                
                log('✅ Found ' + type + ' field: ID=' + id + ', Name=' + name + ', Placeholder=' + ph);
                return el;
              }
            } catch(e) {
              continue;
            }
          }

          // Fallback: search by text content
          log('🔄 Fallback search for ' + type + ' field...');
          const allElements = document.querySelectorAll('tr, div, label, td, th, span');
          for (const element of allElements) {
            try {
              const text = (element.innerText || element.textContent || '').toLowerCase();
              const isFromField = type === 'from' && text.includes('from') && (text.includes('place') || text.includes('location')) && !text.includes('state');
              const isVehicleField = type !== 'from' && ((text.includes('vehicle') && (text.includes('no') || text.includes('number'))) || text.includes('reg no') || text.includes('registration')) && !text.includes('type') && !text.includes('state');
              
              if (isFromField || isVehicleField) {
                // Look for input fields nearby
                const input = element.querySelector('input, textarea') || 
                            (element.nextElementSibling && element.nextElementSibling.querySelector && element.nextElementSibling.querySelector('input, textarea')) ||
                            (element.parentElement && element.parentElement.querySelector && element.parentElement.querySelector('input, textarea'));
                
                if (input) {
                  log('✅ Found ' + type + ' field via text search: ' + (input.id || input.name || 'unknown'));
                  return input;
                }
              }
            } catch(e) {
              continue;
            }
          }

          log('❌ No ' + type + ' field found');
          return null;
        };

        // Debug function to list all potential fields
        const debugAllFields = () => {
          log('🔍 Debug: Listing all input fields...');
          const allInputs = document.querySelectorAll('input, textarea, select');
          allInputs.forEach((input, index) => {
            const id = input.id || '';
            const name = input.name || '';
            const placeholder = input.placeholder || '';
            const className = input.className || '';
            const type = input.type || '';
            
            if (id.toLowerCase().includes('vehicle') || 
                name.toLowerCase().includes('vehicle') ||
                placeholder.toLowerCase().includes('vehicle') ||
                id.toLowerCase().includes('from') ||
                name.toLowerCase().includes('from') ||
                placeholder.toLowerCase().includes('from')) {
              log('Field ' + index + ': ID=' + id + ', Name=' + name + ', Placeholder=' + placeholder + ', Class=' + className + ', Type=' + type);
            }
          });
        };

        const attemptFill = () => {
          // Skip if on login page
          if (document.querySelector("input[type='password']")) {
            log('🚫 Skipping auto-fill on login page');
            return false;
          }

          // Debug all fields first
          debugAllFields();

          let success = false;

          // Try to fill Vehicle From
          if ('${vf}') {
            const fromField = findField('from');
            if (fromField && (!fromField.value || !fromField.value.trim())) {
              log('🏠 Attempting to fill Vehicle From field...');
              if (setElValue(fromField, '${vf}')) {
                log('✅ Vehicle From filled successfully');
                success = true;
              } else {
                log('❌ Failed to fill Vehicle From');
              }
            } else if (fromField) {
              log('ℹ️ Vehicle From field already has value: ' + fromField.value);
            }
          }

          // Try to fill Vehicle Number
          if ('${vn}') {
            const vehicleField = findField('number');
            if (vehicleField && (!vehicleField.value || !vehicleField.value.trim())) {
              log('🚛 Attempting to fill Vehicle Number field...');
              if (setElValue(vehicleField, '${vn}'.toUpperCase())) {
                log('✅ Vehicle Number filled successfully');
                success = true;
              } else {
                log('❌ Failed to fill Vehicle Number');
              }
            } else if (vehicleField) {
              log('ℹ️ Vehicle Number field already has value: ' + vehicleField.value);
            }
          }

          if (success) {
            log('🎉 Auto-fill completed successfully!');
            try { 
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ tag: 'autofill_success' })); 
            } catch {}
          }

          return success;
        };

        // Try multiple times with delays
        let attempts = 0;
        const maxAttempts = 30;
        const fillTimer = setInterval(() => {
          attempts++;
          log('🔄 Auto-fill attempt ' + attempts + '/' + maxAttempts);
          
          if (attemptFill() || attempts >= maxAttempts) {
            clearInterval(fillTimer);
            if (attempts >= maxAttempts) {
              log('⏰ Auto-fill timed out after ' + maxAttempts + ' attempts');
            }
          }
        }, 1000); // Try every second

        // Also watch for DOM changes
        try {
          const observer = new MutationObserver(() => {
            if (attemptFill()) {
              try { observer.disconnect(); } catch {}
              clearInterval(fillTimer);
            }
          });
          observer.observe(document.body, { 
            childList: true, 
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'disabled', 'readonly']
          });
          
          // Disconnect observer after 30 seconds
          setTimeout(() => {
            try { observer.disconnect(); } catch {}
          }, 30000);
        } catch(e) {
          log('❌ MutationObserver error: ' + e.message);
        }

      } catch (e) {
        console.error('❌ Auto-fill error:', e);
        try { 
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ tag: 'autofill_error', error: e.message })); 
        } catch {}
      }
      return true;
    })();`;

    webRef.current?.injectJavaScript(js);
  }, [vehicleFrom, vehicleNo]);

  // Login auto-fill
  const injectAutoFill = useCallback(() => {
    if (!username || !password) return;

    const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const u = esc(username);
    const p = esc(password);

    const js = `(() => {
      try {
        const q = (sel) => document.querySelector(sel);
        const hasPassword = !!q("input[type='password']");

        if (hasPassword) {
          console.log('🔑 Login page detected, filling credentials...');
          
          const userEl = q('#txtUserName') || q("input[name='txtUserName']") || q("input[type='text']");
          const passEl = q('#txtPassword') || q("input[name='txtPassword']") || q("input[type='password']");

          if (userEl && !userEl.value) { 
            userEl.value = '${u}'; 
            userEl.dispatchEvent(new Event('input', { bubbles: true })); 
            userEl.dispatchEvent(new Event('change', { bubbles: true })); 
            console.log('✅ Username filled');
          }
          if (passEl && !passEl.value) { 
            passEl.value = '${p}'; 
            passEl.dispatchEvent(new Event('input', { bubbles: true })); 
            passEl.dispatchEvent(new Event('change', { bubbles: true })); 
            console.log('✅ Password filled');
          }

          const captchaEl = q("input[id*='captcha' i], input[name*='captcha' i]");
          if (captchaEl) {
            captchaEl.focus();
            captchaEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            console.log('👁️ CAPTCHA field focused');
          }
        }
      } catch (e) {
        console.error('❌ Auto fill error:', e);
      }
      return true;
    })();`;

    webRef.current?.injectJavaScript(js);
    setShowHint(true);
    setTimeout(() => setShowHint(false), 4000);
  }, [username, password]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Download E-way Bill PDF
  const downloadEwayBillPDF = async () => {
    const jsCode = `(() => {
      try {
        let pdfUrl = window.location.href;
        const isConsolidatedPage = document.title.toLowerCase().includes('consolidated') ||
          document.body.innerHTML.toLowerCase().includes('consolidated e-way bill');

        if (isConsolidatedPage) {
          const baseUrl = window.location.origin + window.location.pathname;
          if (baseUrl.includes('ConsolidatedEWB')) {
            pdfUrl = baseUrl.replace('.aspx', 'PDF.aspx') + window.location.search;
          }
        }

        const fetchPdf = async (url) => {
          try {
            const res = await fetch(url, { 
              method: 'GET', 
              credentials: 'include', 
              headers: { 'Accept': 'application/pdf,application/octet-stream,*/*' }
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const blob = await res.blob();
            if (!String(blob.type || '').includes('pdf') || (blob.size || 0) < 10240) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ tag: 'request_html_capture' }));
              return;
            }
            const reader = new FileReader();
            reader.onloadend = function() {
              try {
                const dataUrl = String(reader.result || '');
                const base64 = dataUrl.split(',')[1] || '';
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  tag: 'pdf_base64',
                  base64,
                  contentType: blob.type || 'application/pdf',
                  suggestedName: 'EWayBill_' + new Date().toISOString().slice(0,19).replace(/[:-]/g,'') + '.pdf'
                }));
              } catch (err) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ tag: 'pdf_download_error', error: err.message }));
              }
            };
            reader.readAsDataURL(blob);
          } catch (err) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ tag: 'pdf_download_error', error: err.message }));
          }
        };

        fetchPdf(pdfUrl);
      } catch (e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ tag: 'pdf_download_error', error: e.message }));
      }
      return true;
    })();`;

    webRef.current?.injectJavaScript(jsCode);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title} numberOfLines={1}>Consolidated E-Way Bill</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => setShowSettingsModal(true)} style={styles.actionBtn}>
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => webRef.current?.reload()} style={styles.actionBtn}>
            <Text style={styles.actionText}>Reload</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.topBarAccent} />

      <WebView
        ref={webRef}
        source={{ uri: webSrc }}
        onLoadStart={() => setLoading(true)}
        onLoadProgress={(event: any) => {
          if (event.nativeEvent?.progress && event.nativeEvent.progress >= 0.2) setLoading(false);
        }}
        onLoadEnd={() => {
          setLoading(false);
          injectAutoFill();
          setTimeout(injectPostLoginFlow, 2000);
          setTimeout(injectPrintBridge, 1000);
        }}
        
        onNavigationStateChange={(navState: any) => {
          setCurrentUrl(navState.url);
          if (navState && !navState.loading) {
            setLoading(false);
            setTimeout(injectAutoFill, 1000);
            setTimeout(injectPostLoginFlow, 3000);
            setTimeout(injectPrintBridge, 1500);
          }
        }}

        onFileDownload={(event: any) => {
          const { downloadUrl } = event.nativeEvent;
          if (downloadUrl) {
            handleFileDownload(downloadUrl);
          }
        }}

        onMessage={(event: any) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            
            if (data?.tag === 'autofill_success') {
              if (Platform.OS === 'android') {
                ToastAndroid.show('🎉 Auto-filled Vehicle From & Vehicle No successfully!', ToastAndroid.LONG);
              } else {
                Alert.alert('Auto-fill Success', 'Vehicle fields filled successfully.');
              }
              return;
            }

            if (data?.tag === 'autofill_log' && data?.msg) {
              console.log('AutoFill Log:', data.msg);
              return;
            }

            if (data?.tag === 'autofill_error' && data?.error) {
              console.error('AutoFill Error:', data.error);
              return;
            }

            if (data?.tag === 'print_to_download' || 
                data?.tag === 'print_button_to_download' ||
                data?.tag === 'window_open_to_download') {
              console.log('Print detected - starting download');
              downloadEwayBillPDF();
              return;
            }

            if (data?.tag === 'pdf_base64' && data?.base64) {
              console.log('Received base64 PDF from WebView');
              saveBase64Pdf(data.base64, data.suggestedName);
              return;
            }

            if (data?.tag === 'request_html_capture') {
              captureCurrentHtml();
              return;
            }

            if (data?.tag === 'html_content' && data?.html) {
              saveHtmlAsPdf(data.html, `${(data.title || 'EWayBill').replace(/\s+/g,'_')}.pdf`);
              return;
            }

            if (data?.tag === 'pdf_download_error') {
              console.error('PDF download error:', data.error);
              setDownloading(false);
              Alert.alert('Download Error', 'Could not prepare file for download.');
              return;
            }
            
          } catch (e) {
            // Ignore JSON parse errors
          }
        }}

        onShouldStartLoadWithRequest={(req: any) => {
          const url = req?.url || '';
          if (!url) return true;

          const lower = url.toLowerCase();
          const scheme = lower.split(':')[0];

          if (scheme === 'about' || scheme === 'file' || scheme.startsWith('chrome')) return true;

          if (scheme === 'http' || scheme === 'https') {
            let host = '';
            try { host = new URL(url).hostname.toLowerCase(); } catch { host = ''; }

            const allowed = host === 'ewaybillgst.gov.in' || 
                           host === 'www.ewaybillgst.gov.in' || 
                           host.endsWith('.ewaybillgst.gov.in');

            if (!allowed) {
              Linking.openURL(url).catch(() => {});
              return false;
            }
            return true;
          }

          if (/^blob:|^data:/i.test(lower) || lower.includes('.pdf')) {
            handleFileDownload(url);
            return false;
          }

          return true;
        }}

        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowsInlineMediaPlayback
        originWhitelist={["*"]}
        incognito={false}
        cacheEnabled={false}
        startInLoadingState
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        scalesPageToFit={false}
        setSupportMultipleWindows={false}
        showsHorizontalScrollIndicator={true}
        showsVerticalScrollIndicator={true}
        injectedJavaScript={`
          (function() {
            try {
              // Inject responsive viewport meta tag with 100% zoom
              var meta = document.querySelector('meta[name="viewport"]');
              if (!meta) {
                meta = document.createElement('meta');
                meta.name = 'viewport';
                document.head.appendChild(meta);
              }
              
              // 60% zoom with full zoom controls
              meta.content = 'width=device-width, initial-scale=0.6, minimum-scale=0.1, maximum-scale=5.0, user-scalable=yes';
              
              // Add minimal responsive CSS
              var style = document.createElement('style');
              style.textContent = \`
                html, body { 
                  width: 100% !important;
                  overflow-x: auto !important;
                  -webkit-text-size-adjust: 100% !important;
                }
                body > * {
                  max-width: 100% !important;
                }
                img { 
                  max-width: 100% !important; 
                  height: auto !important; 
                }
                table {
                  max-width: 100% !important;
                }
              \`;
              document.head.appendChild(style);
              
              console.log('✅ Responsive viewport injected with 60% zoom');
            } catch(e) {
              console.error('Viewport injection error:', e);
            }
          })();
          true;
        `}
      />

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loaderText}>Loading portal...</Text>
        </View>
      )}

      {downloading && (
        <View style={styles.downloadOverlay}>
          <View style={styles.downloadCard}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.downloadText}>Downloading E-Way Bill...</Text>
            <Text style={styles.downloadSubText}>Please wait while we save your PDF</Text>
          </View>
        </View>
      )}

      {showHint && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>
            Username/Password auto-filled. Enter CAPTCHA and tap Login.
          </Text>
        </View>
      )}

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>E-Way Bill Settings</Text>
            
            <Text style={styles.sectionHeading}>Login Credentials</Text>
            
            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput 
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              autoCapitalize="none"
            />
            
            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput 
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              secureTextEntry
            />
            
            <Text style={styles.sectionHeading}>Auto-Fill Details</Text>
            
            <Text style={styles.fieldLabel}>Vehicle From</Text>
            <TextInput 
              style={styles.input}
              value={vehicleFrom}
              onChangeText={setVehicleFrom}
              placeholder="e.g., AHMEDABAD-GUJARAT"
            />
            
            <Text style={styles.fieldLabel}>Vehicle Number</Text>
            <TextInput 
              style={styles.input}
              value={vehicleNo}
              onChangeText={setVehicleNo}
              placeholder="e.g., GJ27AZ9380"
              autoCapitalize="characters"
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={() => setShowSettingsModal(false)} 
                style={[styles.btn, styles.btnGhost]}
              >
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={async () => {
                  try {
                    await saveEWayBillSettings({ 
                      username, 
                      password, 
                      vehicle_from: vehicleFrom, 
                      vehicle_no: vehicleNo 
                    });
                    setShowSettingsModal(false);
                    setTimeout(injectPostLoginFlow, 1000);
                    setTimeout(injectAutoFill, 500);
                    webRef.current?.reload();
                    Alert.alert('Success', 'Settings saved successfully!');
                  } catch (e) {
                    Alert.alert('Error', 'Failed to save settings');
                  }
                }} 
                style={[styles.btn, styles.btnPrimary]}
              >
                <Text style={styles.btnPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.note}>
              📱 Files will be saved to your Downloads folder or app storage. Print button automatically triggers PDF download.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  topBarAccent: {
    height: 3,
    backgroundColor: '#6C63FF'
  },
  title: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#111', 
    flex: 1, 
    minWidth: 0, 
    marginRight: 8 
  },
  actions: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginLeft: 'auto'
  },
  actionBtn: { 
    marginLeft: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: '#F3F6FF',
    borderWidth: 1,
    borderColor: '#E1E9FF'
  },
  downloadBtn: {
    backgroundColor: '#4CAF50'
  },
  actionText: { 
    color: '#3D5AFE', 
    fontWeight: '700',
    fontSize: 12 
  },
  downloadBtnText: {
    color: '#fff'
  },
  loader: { 
    position: 'absolute', 
    top: '40%', 
    left: 0, 
    right: 0, 
    alignItems: 'center' 
  },
  loaderText: { 
    marginTop: 8, 
    color: '#555' 
  },
  downloadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  downloadCard: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200
  },
  downloadText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    textAlign: 'center'
  },
  downloadSubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center'
  },
  hint: { 
    position: 'absolute', 
    bottom: 20, 
    left: 20, 
    right: 20, 
    backgroundColor: 'rgba(0,0,0,0.8)', 
    padding: 12, 
    borderRadius: 8 
  },
  hintText: { 
    color: '#fff', 
    textAlign: 'center' 
  },
  modalBackdrop: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'center', 
    padding: 20 
  },
  modalCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 16 
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 12 
  },
  sectionHeading: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#444', 
    marginBottom: 8,
    marginTop: 8 
  },
  fieldLabel: { 
    marginBottom: 6, 
    fontWeight: '600', 
    color: '#222' 
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    marginBottom: 10, 
    backgroundColor: '#fff', 
    color: '#111' 
  },
  modalActions: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    marginTop: 8 
  },
  btn: { 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderRadius: 8, 
    marginLeft: 8 
  },
  btnPrimary: { 
    backgroundColor: '#007AFF' 
  },
  btnPrimaryText: { 
    color: '#fff', 
    fontWeight: '700' 
  },
  btnGhost: { 
    backgroundColor: '#f2f2f2' 
  },
  btnGhostText: { 
    color: '#333', 
    fontWeight: '600' 
  },
  note: { 
    marginTop: 10, 
    color: '#666', 
    fontSize: 12 
  },
});
