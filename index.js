/**
 * @format
 */
import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto'; // Add URL polyfill at the very top
import 'whatwg-fetch'; // Add fetch polyfill
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Import background messaging handler for FCM
import './backgroundMessaging';

AppRegistry.registerComponent(appName, () => App);
