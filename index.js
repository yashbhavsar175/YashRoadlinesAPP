/**
 * @format
 */
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Import background messaging handler for FCM
import './backgroundMessaging';

AppRegistry.registerComponent(appName, () => App);
