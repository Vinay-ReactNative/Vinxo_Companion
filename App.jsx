import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { hydrateStore, store } from './src/store/store';
import AppNavigation from './src/Presentation/Navigation/AppNavigation';
import DigitalAssistantScreen from './src/Presentation/Screens/DigitalAssitant/DigitalAssistantScreen';
import { View, Text } from 'react-native';
interface AppProps {
  surface?:'app'|'assistant'
}
// console.log(surface,'surface')
function App({surface='app'}:AppProps) {
    console.log('[VINXO] Root mounted with surface:', surface);
  useEffect(() => {
    hydrateStore();
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        {surface === 'assistant' ?
      ( 
         <DigitalAssistantScreen />
  //       <View
  //   style={{
  //     flex: 1,
  //     backgroundColor: 'red',
  //     justifyContent: 'center',
  //     alignItems: 'center',
  //   }}
  // >
  //   <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold' }}>
  //     VINXO TEST
  //   </Text>
  // </View>
        )
      :
      ( <AppNavigation />)
}
      </SafeAreaProvider>
    </Provider>
  );
}


export default App;
