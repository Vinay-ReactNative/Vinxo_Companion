export const generateId = ()=>{
  return `message-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

