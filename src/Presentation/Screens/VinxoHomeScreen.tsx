import { Button, StyleSheet, Text, TextInput, View } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { ConversationManager } from '../../domain/managers/ConversationManager'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Conversation } from '../../domain/models/Conversation'
import { generateId } from '../../utils/generateId'
import { MockAIProvider } from '../../domain/providers/MockAIProvider'
import { GeminiAIProvider } from '../../domain/providers/GeminiAIProvider'
import { testLocalModel } from '../../utils/localModel'
import { LocalAIProvider } from '../../domain/providers/LocalAIProvider'

const VinxoHomeScreen = () => {
    const managerRef = useRef<ConversationManager | null>(null)
    const [conversation,setConversation] = useState<Conversation>({
    id:generateId(),
    messages:[],
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString(),
})
const [userMessage,setUsermessage] = useState('')
console.log("conversation:",conversation)
    if(managerRef.current === null){
const conversation : Conversation = {
    id:generateId(),
    messages:[],
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
}
const mockAi = new MockAIProvider() //mockai
const realAi = new GeminiAIProvider() //real ai
const localAi = new LocalAIProvider()
const manager = new ConversationManager(localAi,conversation)
managerRef.current = manager

    }

    // useEffect(()=>{
    //     testLocalModel()
    // },[])

const handleSend = async () => {
    console.log("🔥 1 HANDLE SEND");

    if (managerRef.current != null) {
        console.log("🔥 2 MANAGER EXISTS");

        const result =
            await managerRef.current.sendMessage(userMessage);

        console.log("🔥 5 RESULT FROM MANAGER", result);

        setConversation(result);
    }
}

  return (
    <SafeAreaView style={{}}>
      <Text style={{color:'black',textAlign:'center',marginVertical:10}}>VinxoHomeScreen</Text>
      <View style={{flexDirection:'row',marginHorizontal:20}}>
      <TextInput value={userMessage} onChangeText={(text)=>setUsermessage(text)} style={{width:300,backgroundColor:'whitesmoke',borderWidth:1,padding:10}} placeholder='Vinxo is Ready'/>
      <Button title='send' onPress={handleSend}/>
      </View>
      {conversation.messages.map((message)=>(
<View style={{flexDirection:'row'}} key={message.id}> 
 <Text >{message.sender }:</Text>
 <Text >{message.content}</Text>
 </View>
      ))}
     
    </SafeAreaView>
  )
}

export default VinxoHomeScreen

const styles = StyleSheet.create({})