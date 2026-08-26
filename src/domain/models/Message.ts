export  type MessageSender = 'USER' | 'AI'

export interface Message {
    id: string;
    sender: MessageSender;
    content: string;
    timestamp: string;
}