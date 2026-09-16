import { Memory } from "../memory/Memory";
import { MemoryStatus } from "../memory/MemoryStatus";

export class MemoryManager {
//new memories array to store the memories 
    private memories : Memory[] = []
  private updateMemory(oldMemory:Memory,newMemory:Memory):MemoryStatus {
        const auth = false 
        if(auth){
           oldMemory.value = newMemory.value
           return 'UPDATED'
        } 
        else {
            return 'UNAUTHORIZED'
        }
     }
    //add memory append the new memory to the memory array  while memory:Memory checks that the incominng memory should follow Memory 
    addMemory(memory:Memory) : MemoryStatus {
        //find for duplicate memory 
        const existingMemory = this.memories.find((oldMemory)=>{
            return     oldMemory.category === memory.category 
              && oldMemory.key === memory.key
            && oldMemory.value === memory.value 
          
    
        })
          const conflictingMemory = this.memories.find((oldMemory)=>(
            oldMemory.category === memory.category && oldMemory.key === memory.key && oldMemory.value != memory.value
        ))

        if (existingMemory) {
            return 'DUPLICATE'
        } else if(conflictingMemory){
            return this.updateMemory(conflictingMemory, memory)
        }
        else {
        this.memories.push(memory)  
        return 'ADDED'
        //nothing here already updating to memory 
        }

    }
       

    getMemories():Memory[]{
        return [...this.memories]
    }
    
   
}
    

