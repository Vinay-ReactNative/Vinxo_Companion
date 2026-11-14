import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DigitalAssistantScreen from '../Screens/DigitalAssitant/DigitalAssistantScreen';
import VinxoHomeScreen from '../Screens/VinxoHomeScreen';
import KokoroTest from '../../Playground/KokoroTest';
import MicTest from '../../Playground/MicTest';
import NativeControlPlayground from '../../Playground/NativeControlPlayground';
import Whispertest from '../../Playground/Whispertest';

type RootStackParamList = {
  DigitalAssistantScreen: undefined;
  VinxoHomeScreen: undefined;
  NativeControlPlayground: undefined;
  KokoroTest: undefined;
  MicTest: undefined;
  Whispertest: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="DigitalAssistantScreen">
        <Stack.Screen
          name="DigitalAssistantScreen"
          component={DigitalAssistantScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="VinxoHomeScreen" component={VinxoHomeScreen} />
        <Stack.Screen
          name="NativeControlPlayground"
          component={NativeControlPlayground}
        />
        <Stack.Screen name="KokoroTest" component={KokoroTest} />
        <Stack.Screen name="MicTest" component={MicTest} />
        <Stack.Screen name="Whispertest" component={Whispertest} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigation;
