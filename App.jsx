/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { useEffect } from 'react';
import { Provider } from 'react-redux';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import VinxoHomeScreen from './src/Presentation/Screens/VinxoHomeScreen';
import { hydrateStore, store } from './src/store/store';
import NativeControlPlayground from './src/Playground/NativeControlPlayground';
import KokoroTest from './src/Playground/KokoroTest';
import MicTest from './src/Playground/MicTest';
import Whispertest from './src/Playground/Whispertest';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    hydrateStore();
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <AppContent />
      </SafeAreaProvider>
    </Provider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
    {/* <VinxoHomeScreen /> */}
    {/* <NativeControlPlayground /> */}
    {/* <KokoroTest /> */}
    {/* <MicTest /> */}
    <Whispertest />
     </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;



// import React, { useEffect, useMemo, useRef, useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   Pressable,
//   ScrollView,
//   StyleSheet,
//   Animated,
//   useColorScheme,
//   Platform,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { testConversation } from './src/Playground/ConversationTest';

// // -----------------------------
// // Theme tokens
// // -----------------------------
// const themes = {
//   dark: {
//     background: '#161513',
//     surface: '#221F1A',
//     border: '#37342C',
//     textPrimary: '#F2EFE9',
//     textSecondary: '#8C8983',
//     textMuted: '#6B6862',
//     accent: '#C9A24A',
//     accentText: '#161513',
//     orbCore: '#2A2822',
//   },
//   light: {
//     background: '#FAF9F6',
//     surface: '#FFFFFF',
//     border: '#E8E5DE',
//     textPrimary: '#1C1B19',
//     textSecondary: '#6E6B64',
//     textMuted: '#9A968D',
//     accent: '#B8863A',
//     accentText: '#FFFFFF',
//     orbCore: '#F0EDE6',
//   },
// };

// // -----------------------------
// // Dynamic greeting logic
// // -----------------------------
// const NAME = 'Captain';

// function getTimeGreeting(date = new Date()) {
//   const hour = date.getHours();
//   if (hour < 5) return `Still up, ${NAME}?`;
//   if (hour < 12) return `Good morning, ${NAME}.`;
//   if (hour < 17) return `Good afternoon, ${NAME}.`;
//   if (hour < 21) return `Good evening, ${NAME}.`;
//   return `Good night, ${NAME}.`;
// }

// const SUBTITLES = [
//   'How are you feeling today?',
//   "What shall we build today?",
//   "I'm here whenever you're ready.",
//   'What can I hold onto for you today?',
// ];

// function pickSubtitle() {
//   return SUBTITLES[Math.floor(Math.random() * SUBTITLES.length)];
// }

// // -----------------------------
// // Suggested chips config
// // -----------------------------
// const CHIPS = [
//   { id: 'day', label: 'Tell me about your day', icon: '💬' },
//   { id: 'idea', label: 'Save an idea', icon: '📝' },
//   { id: 'ask', label: 'Ask anything', icon: '💡' },
//   { id: 'cook', label: 'Cooking chronicles', icon: '🍳' },
//   { id: 'movie', label: 'Movie discussion', icon: '🎬' },
//   { id: 'learn', label: 'Learn something', icon: '📚' },
// ];

// // -----------------------------
// // Presence orb — slow breathing animation
// // -----------------------------
// function PresenceOrb({ colors }) {
//   const scale = useRef(new Animated.Value(0.98)).current;

//   useEffect(() => {
//     const loop = Animated.loop(
//       Animated.sequence([
//         Animated.timing(scale, {
//           toValue: 1.04,
//           duration: 2600,
//           useNativeDriver: true,
//         }),
//         Animated.timing(scale, {
//           toValue: 0.98,
//           duration: 2600,
//           useNativeDriver: true,
//         }),
//       ])
//     );
//     loop.start();
//     return () => loop.stop();
//   }, [scale]);

//   return (
//     <View style={styles.orbWrap}>
//       <Animated.View
//         style={[
//           styles.orbOuter,
//           { backgroundColor: colors.orbCore, transform: [{ scale }] },
//         ]}
//       >
//         <View style={[styles.orbCore, { backgroundColor: colors.accent }]} />
//       </Animated.View>
//       <Text style={[styles.orbLabel, { color: colors.textMuted }]}>
//         VINXO is listening
//       </Text>
//     </View>
//   );
// }

// // -----------------------------
// // Suggested chip row with staggered entrance
// // -----------------------------
// function ChipRow({ colors, onSelect }) {
//   const anims = useRef(CHIPS.map(() => new Animated.Value(0))).current;

//   useEffect(() => {
//     Animated.stagger(
//       50,
//       anims.map((v) =>
//         Animated.timing(v, {
//           toValue: 1,
//           duration: 260,
//           useNativeDriver: true,
//         })
//       )
//     ).start();
//   }, [anims]);

//   return (
//     <View style={styles.chipRow}>
//       {CHIPS.map((chip, i) => {
//         const translateY = anims[i].interpolate({
//           inputRange: [0, 1],
//           outputRange: [8, 0],
//         });
//         return (
//           <Animated.View
//             key={chip.id}
//             style={{ opacity: anims[i], transform: [{ translateY }] }}
//           >
//             <Pressable
//               onPress={() => onSelect(chip)}
//               style={({ pressed }) => [
//                 styles.chip,
//                 {
//                   backgroundColor: colors.surface,
//                   borderColor: colors.border,
//                   opacity: pressed ? 0.7 : 1,
//                 },
//               ]}
//             >
//               <Text style={styles.chipIcon}>{chip.icon}</Text>
//               <Text style={[styles.chipText, { color: colors.textPrimary }]}>
//                 {chip.label}
//               </Text>
//             </Pressable>
//           </Animated.View>
//         );
//       })}
//     </View>
//   );
// }

// // -----------------------------
// // Main screen
// // -----------------------------
// export default function VinxoHomeScreen({ onSend }) {
//   const scheme = useColorScheme();
//   const colors = themes[scheme === 'light' ? 'light' : 'dark'];

//   const [greeting, setGreeting] = useState(getTimeGreeting());
//   const subtitle = useMemo(() => pickSubtitle(), []);
//   const [message, setMessage] = useState('');

//   const fade = useRef(new Animated.Value(0)).current;

//   // Re-check the greeting every minute so it updates live
//   // (e.g. app left open across a morning->afternoon boundary)
//   useEffect(() => {
//     const interval = setInterval(() => {
//       setGreeting(getTimeGreeting());
//     }, 60 * 1000);
//     return () => clearInterval(interval);
//   }, []);

//   useEffect(() => {
//     Animated.timing(fade, {
//       toValue: 1,
//       duration: 400,
//       useNativeDriver: true,
//     }).start();
//   }, [fade]);

//   const handleChipSelect = (chip) => {
//     setMessage(chip.label);
//   };

//   const handleSend = () => {
//     testConversation()
//     const trimmed = message.trim();
//     if (!trimmed) return;
//     onSend && onSend(trimmed);
//     setMessage('');
//   };

//   return (
//     <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
//       {/* Greeting */}
//       <Animated.View style={[styles.greetingBlock, { opacity: fade }]}>
//         <Text style={[styles.greeting, { color: colors.textPrimary }]}>
//           {greeting}
//         </Text>
//         <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
//           {subtitle}
//         </Text>
//       </Animated.View>

//       {/* Conversation / presence area */}
//       <View style={styles.presenceArea}>
//         <PresenceOrb colors={colors} />
//       </View>

//       {/* Suggested chips */}
//       <ScrollView
//         horizontal={false}
//         showsVerticalScrollIndicator={false}
//         style={styles.chipScroll}
//       >
//         <ChipRow colors={colors} onSelect={handleChipSelect} />
//       </ScrollView>

//       {/* Input bar */}
//       <View
//         style={[
//           styles.inputBar,
//           { backgroundColor: colors.surface, borderColor: colors.border },
//         ]}
//       >
//         <TextInput
//           style={[styles.input, { color: colors.textPrimary }]}
//           placeholder="Talk to VINXO..."
//           placeholderTextColor={colors.textMuted}
//           value={message}
//           onChangeText={setMessage}
//           onSubmitEditing={handleSend}
//           returnKeyType="send"
//         />
//         <Pressable
//           style={[styles.iconButton, { backgroundColor: colors.background }]}
//           accessibilityLabel="Voice input"
//         >
//           <Text style={{ fontSize: 15 }}>🎙️</Text>
//         </Pressable>
//         <Pressable
//           style={[styles.iconButton, { backgroundColor: colors.accent }]}
//           onPress={handleSend}
//           accessibilityLabel="Send message"
//         >
//           <Text style={{ fontSize: 15, color: colors.accentText }}>↑</Text>
//         </Pressable>
//       </View>
//     </SafeAreaView>
//   );
// }

// // -----------------------------
// // Styles
// // -----------------------------
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   greetingBlock: {
//     paddingHorizontal: 22,
//     paddingTop: 18,
//     paddingBottom: 4,
//   },
//   greeting: {
//     fontSize: 23,
//     fontWeight: '500',
//     letterSpacing: -0.2,
//   },
//   subtitle: {
//     fontSize: 14,
//     marginTop: 6,
//     fontWeight: '400',
//   },
//   presenceArea: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   orbWrap: {
//     alignItems: 'center',
//     gap: 10,
//   },
//   orbOuter: {
//     width: 64,
//     height: 64,
//     borderRadius: 32,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   orbCore: {
//     width: 10,
//     height: 10,
//     borderRadius: 5,
//   },
//   orbLabel: {
//     fontSize: 12,
//     marginTop: 8,
//   },
//   chipScroll: {
//     maxHeight: 110,
//   },
//   chipRow: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//     paddingHorizontal: 20,
//     paddingBottom: 14,
//   },
//   chip: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderWidth: StyleSheet.hairlineWidth * 1.5,
//     borderRadius: 20,
//     paddingVertical: 8,
//     paddingHorizontal: 13,
//     gap: 6,
//   },
//   chipIcon: {
//     fontSize: 13,
//   },
//   chipText: {
//     fontSize: 12.5,
//     fontWeight: '400',
//   },
//   inputBar: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderWidth: StyleSheet.hairlineWidth * 1.5,
//     borderRadius: 24,
//     marginHorizontal: 16,
//     marginBottom: Platform.OS === 'android' ? 12 : 6,
//     paddingLeft: 16,
//     paddingRight: 6,
//     paddingVertical: 6,
//     gap: 8,
//   },
//   input: {
//     flex: 1,
//     fontSize: 14.5,
//     paddingVertical: 6,
//   },
//   iconButton: {
//     width: 34,
//     height: 34,
//     borderRadius: 17,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
// });