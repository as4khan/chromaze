/** Expo entry point: initialize gesture support before registering the root application. */
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
