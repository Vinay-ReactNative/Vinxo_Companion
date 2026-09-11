import { StyleSheet, Text, View } from 'react-native'
import React, { useEffect } from 'react'
    import { MemoryManager } from "../domain/managers/MemoryManager"
import { Memory } from "../domain/memory/Memory"
import { generateId } from "../utils/generateId"
import { ContextBuilder } from '../domain/context/ContextBuilder'
const MemoryManagerTest = () => {
      const memories: Memory[] = [
    {
        id: generateId(),
        category: "IDENTITY",
        key: "name",
        value: "Vinay",
        createdAt: generateId(),
        updatedAt: generateId(),
    },
    {
        id: generateId(),
        category: "PREFERENCE",
        key: "food",
        value: "Pizza",
        createdAt: generateId(),
        updatedAt: generateId(),
    },
    {
        id: generateId(),
        category: "FACT",
        key: "project",
        value: "VINXO",
        createdAt: generateId(),
        updatedAt: generateId(),
    }
]
//     const newMemoryTest = async ()=>{
//     const memoryManager = new MemoryManager()


//     const memory:Memory = {

//  id:generateId(),
//     category:"IDENTITY",
//     key:'1',
//     value:'Vinay',
//     createdAt:generateId(),
//     updatedAt:generateId(),
//     }

//   const duplicateMemory:Memory = {

//  id:generateId(),
//     category:"IDENTITY",
//     key:'1',
//     value:'Vinay',
//     createdAt:generateId(),
//     updatedAt:generateId(),
//     }
//   const conflictMemory:Memory = {

//  id:generateId(),
//     category:"IDENTITY",
//     key:'1',
//     value:'Karthik',
//     createdAt:generateId(),
//     updatedAt:generateId(),
//     }
// const addnewmemory =  memoryManager.addMemory(duplicateMemory)
// const addduplicatememory =  memoryManager.addMemory(duplicateMemory)
// const addconflictmemory =  memoryManager.addMemory(conflictMemory)
// console.log(addnewmemory,'addnewmemory')
// console.log(addduplicatememory,'addnewmemory')
// console.log(addconflictmemory,'addconflictmemory')
// console.log(memoryManager.getMemories(),'memories')
//     }

const newContextTest = async  ()=>{

  const contextBuilder = new ContextBuilder()
  const context = contextBuilder.buildContext(memories)
  console.log(context,'first context from context builder ')
}
useEffect(()=>{
  newContextTest()
// newMemoryTest()
},[])


  return (
    <View>
      <Text style={{marginVertical:50}}>MemoryManagerTest</Text>
      
    </View>
  )
}

export default MemoryManagerTest

const styles = StyleSheet.create({})