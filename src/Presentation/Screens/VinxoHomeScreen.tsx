// import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
// import React, { useEffect, useRef, useState } from 'react'
// import { ConversationManager } from '../../domain/managers/ConversationManager'
// import { SafeAreaView } from 'react-native-safe-area-context'
// import { Conversation } from '../../domain/models/Conversation'
// import { generateId } from '../../utils/generateId'
// import { MockAIProvider } from '../../domain/providers/MockAIProvider'
// import { GeminiAIProvider } from '../../domain/providers/GeminiAIProvider'
// import { testLocalModel } from '../../utils/localModel'
// import { LocalAIProvider } from '../../domain/providers/LocalAIProvider'

// const VinxoHomeScreen = () => {
//     const managerRef = useRef<ConversationManager | null>(null)
//     const scrollViewRef = useRef<ScrollView>(null)
//     const [conversation,setConversation] = useState<Conversation>({
//     id:generateId(),
//     messages:[],
//     createdAt:new Date().toISOString(),
//     updatedAt:new Date().toISOString(),
// })
// const [userMessage,setUsermessage] = useState('')
// console.log("conversation:",conversation)
//     if(managerRef.current === null){
// const conversation : Conversation = {
//     id:generateId(),
//     messages:[],
//     createdAt:new Date().toISOString(),
//     updatedAt:new Date().toISOString()
// }
// const mockAi = new MockAIProvider() //mockai
// const realAi = new GeminiAIProvider() //real ai
// const localAi = new LocalAIProvider()
// const manager = new ConversationManager(localAi,conversation)
// managerRef.current = manager

//     }

//     // useEffect(()=>{
//     //     testLocalModel()
//     // },[])

// const handleSend = async () => {
//     console.log("🔥 1 HANDLE SEND");
// setUsermessage('')
//     if (managerRef.current != null) {
//         console.log("🔥 2 MANAGER EXISTS");

//         const result =
//             await managerRef.current.sendMessage(userMessage);

//         console.log("🔥 5 RESULT FROM MANAGER", result);

//         setConversation(result);
//     }
// }

// useEffect(() => {
//         scrollViewRef.current?.scrollToEnd({ animated: true })
// }, [conversation.messages.length])

//   return (
//         <SafeAreaView style={styles.container}>
//       <Text style={{color:'black',textAlign:'center',marginVertical:10}}>VinxoHomeScreen</Text>
//       <View style={{flexDirection:'row',marginHorizontal:20}}>
//       <TextInput value={userMessage} onChangeText={(text)=>setUsermessage(text)} style={{width:300,backgroundColor:'whitesmoke',borderWidth:1,padding:10}} placeholder='Vinxo is Ready'/>
//       <Button title='send' onPress={handleSend}/>
//       </View>
//             <ScrollView
//                 ref={scrollViewRef}
//                 style={styles.messages}
//                 contentContainerStyle={styles.messagesContent}
//             >
//       {conversation.messages.map((message)=>(
// <View style={{flexDirection:'row'}} key={message.id}> 
//  <Text >{message.sender }:</Text>
//  <Text >{message.content}</Text>
//  </View>
//       ))}
//  </ScrollView>
     
//     </SafeAreaView>
//   )
// }

// export default VinxoHomeScreen

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//     },
//     messages: {
//         flex: 1,
//     },
//     messagesContent: {
//         paddingHorizontal: 20,
//         paddingBottom: 40,
//     },
// })

import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConversationManager } from '../../domain/managers/ConversationManager';
import { Conversation } from '../../domain/models/Conversation';
import { generateId } from '../../utils/generateId';
import { LocalAIProvider } from '../../domain/providers/LocalAIProvider';

const VinxoHomeScreen = () => {
  const managerRef = useRef<ConversationManager | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const [conversation, setConversation] = useState<Conversation>({
    id: generateId(),
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const [userMessage, setUserMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (managerRef.current === null) {
    const initialConversation: Conversation = {
      id: generateId(),
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const localAi = new LocalAIProvider();
    managerRef.current = new ConversationManager(localAi, initialConversation);
  }

  const handleSend = async () => {
    if (!userMessage.trim() || isGenerating) return;

    const messageText = userMessage.trim();
    setUserMessage('');
    setIsGenerating(true);

    if (managerRef.current != null) {
      const result = await managerRef.current.sendMessage(messageText);
      setConversation({ ...result });
    }
    setIsGenerating(false);
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [conversation.messages.length, isGenerating]);

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
    >
      <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#081B2D" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarGlow}>
          <Text style={styles.avatarText}>V</Text>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>VINXO</Text>
          <Text style={styles.headerSubtitle}>
            {isGenerating ? 'Thinking...' : 'Local AI Active'}
          </Text>
        </View>
      </View>

      {/* Messages List */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {conversation.messages.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateTitle}>Welcome to Vinxo</Text>
            <Text style={styles.emptyStateSubtitle}>
              Your local AI companion is offline-ready and waiting.
            </Text>
          </View>
        ) : (
          conversation.messages.map((message) => {
            console.log( conversation.messages,'messages')
            const isUser = message.sender === 'USER';
            return (
              <View
                key={message.id}
                style={[
                  styles.messageWrapper,
                  isUser ? styles.userWrapper : styles.aiWrapper,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.aiBubble,
                  ]}
                >
                  <Text style={isUser ? styles.userLabel : styles.aiLabel}>
                    {isUser ? 'YOU' : 'VINXO'}
                  </Text>
                  <Text
                    style={[
                      styles.messageText,
                      isUser ? styles.userMessageText : styles.aiMessageText,
                    ]}
                  >
                    {message.content}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Fixed Bottom Input Area */}
      <View style={styles.inputContainer}>
          <TextInput
            value={userMessage}
            onChangeText={setUserMessage}
            style={styles.input}
            placeholder="Type your message..."
            placeholderTextColor="#66666E"
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!userMessage.trim() || isGenerating) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!userMessage.trim() || isGenerating}
            activeOpacity={0.8}
          >
            <Text style={styles.sendButtonText}>▲</Text>
          </TouchableOpacity>
      </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default VinxoHomeScreen;

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#081B2D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1D4968',
  },
  avatarGlow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1689C9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#DDF5FF',
  },
  avatarText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 20,
  },
  headerTextContainer: {
    marginLeft: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    color: '#B8D8E9',
    fontSize: 12,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyStateTitle: {
    color: '#8ED8FF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    color: '#A9C8D9',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  messageWrapper: {
    marginVertical: 6,
    flexDirection: 'row',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  aiWrapper: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#1689C9',
    borderWidth: 1,
    borderColor: '#DDF5FF',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#12466A',
    borderWidth: 1,
    borderColor: '#75D0F7',
    borderBottomLeftRadius: 4,
  },
  userLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 1,
  },
  aiLabel: {
    color: '#C9F0FF',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  aiMessageText: {
    color: '#F2FBFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0B263D',
    borderTopWidth: 1,
    borderTopColor: '#1D4968',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#123552',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 15,
    marginRight: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#4E7188',
  },
  sendButtonText: {
    color: '#0B263D',
    fontSize: 16,
    fontWeight: 'bold',
  },
});