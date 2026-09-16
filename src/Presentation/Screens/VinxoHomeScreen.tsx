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
import { MemoryExtractor } from '../../domain/memory/MemoryExtractor';
import { generateId } from '../../utils/generateId';
import { LocalAIProvider } from '../../domain/providers/LocalAIProvider';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import {
  addMessage,
  clearActiveChat,
  createChat,
  deleteChat,
  selectChat,
} from '../../store/chats/chatSlice';
import {
  addChatToProject,
  createProject,
  removeChatFromProject,
} from '../../store/projects/projectSlice';

const DEFAULT_PROJECT_ID = 'project-personal';

const makeChatTitle = (message: string, chatId: string) => {
  const snippet = message.replace(/\s+/g, ' ').trim().slice(0, 32);
  return `${snippet || 'New conversation'} · ${chatId.slice(-6)}`;
};

const VinxoHomeScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const localAIProvider = useRef(new LocalAIProvider()).current;
  const memoryExtractor = useRef(new MemoryExtractor()).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const [userMessage, setUserMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isWorkspaceVisible, setIsWorkspaceVisible] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState(DEFAULT_PROJECT_ID);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState('');

  const chats = useSelector((state: RootState) => state.chats.items);
  const activeChatId = useSelector((state: RootState) => state.chats.activeChatId);
  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const projects = useSelector((state: RootState) => state.projects.items);
  const project = projects.find((item) => item.id === selectedProjectId);
  const messages = activeChat?.messages ?? [];

  const handleSend = async () => {
    if (!userMessage.trim() || isGenerating) return;

    const messageText = userMessage.trim();
    setUserMessage('');
    setIsGenerating(true);

    void memoryExtractor.extractMemory(messageText).then((memory) => {
      console.log('[VinxoHomeScreen] memory extraction result:', memory);
    });

    const now = new Date().toISOString();
    const optimisticUserMessage = {
      id: generateId(),
      content: messageText,
      sender: 'USER' as const,
      timestamp: now,
    };

    const chatId = activeChat?.id ?? generateId();
    const createdAt = activeChat?.createdAt ?? now;
    const conversation: Conversation = {
      id: chatId,
      messages: activeChat?.messages ?? [],
      createdAt,
      updatedAt: activeChat?.updatedAt ?? now,
    };

    if (!activeChat) {
      dispatch(
        createChat({
          id: chatId,
          projectId: selectedProjectId,
          title: makeChatTitle(messageText, chatId),
          messages: [],
          createdAt,
          updatedAt: now,
        }),
      );
      dispatch(addChatToProject({ projectId: selectedProjectId, chatId }));
    }

    // Persist the user message before the slow local model starts.
    dispatch(addMessage({ chatId, message: optimisticUserMessage }));

    try {
      const manager = new ConversationManager(localAIProvider, conversation);
      const result = await manager.sendMessage(messageText);
      const responseMessage = result.messages[result.messages.length - 1];

      if (responseMessage?.sender === 'AI') {
        dispatch(addMessage({ chatId, message: responseMessage }));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewChat = () => {
    if (!isGenerating) dispatch(clearActiveChat());
  };

  const handleDeleteChat = (chatId: string) => {
    if (isGenerating || chatId === activeChatId) return;

    dispatch(deleteChat(chatId));
    dispatch(removeChatFromProject({ projectId: selectedProjectId, chatId }));
  };

  const handleCreateProject = () => {
    const name = projectNameInput.replace(/\s+/g, ' ').trim();
    if (!name) return;

    const projectId = `project-${generateId()}`;
    dispatch(
      createProject({
        id: projectId,
        name,
        chatIds: [],
        createdAt: new Date().toISOString(),
      }),
    );
    setSelectedProjectId(projectId);
    dispatch(clearActiveChat());
    setProjectNameInput('');
    setIsCreatingProject(false);
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, isGenerating]);

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
    >
      <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#081B2D" />

      <View style={styles.contentRow}>
        {isWorkspaceVisible && (
          <View style={styles.workspacePanel}>
            <View style={styles.workspaceHeader}>
              <View>
                <Text style={styles.workspaceEyebrow}>PROJECTS</Text>
                <Text style={styles.projectName}>{project?.name ?? 'Personal'}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsWorkspaceVisible(false)}
                accessibilityLabel="Hide projects and chats"
              >
                <Text style={styles.drawerToggleText}>‹</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.workspaceList}
              showsVerticalScrollIndicator={false}
            >
              {projects.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    setSelectedProjectId(item.id);
                    dispatch(clearActiveChat());
                  }}
                  style={[
                    styles.projectItem,
                    item.id === selectedProjectId && styles.activeProjectItem,
                  ]}
                >
                  <Text
                    style={[
                      styles.projectItemText,
                      item.id === selectedProjectId && styles.activeProjectItemText,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {isCreatingProject ? (
                <View style={styles.projectForm}>
                  <TextInput
                    value={projectNameInput}
                    onChangeText={setProjectNameInput}
                    placeholder="Project name"
                    placeholderTextColor="#7895A8"
                    autoFocus
                    style={styles.projectInput}
                    onSubmitEditing={handleCreateProject}
                    returnKeyType="done"
                  />
                  <View style={styles.projectFormActions}>
                    <TouchableOpacity onPress={handleCreateProject}>
                      <Text style={styles.projectActionText}>Create</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsCreatingProject(false)}>
                      <Text style={styles.projectCancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setIsCreatingProject(true)}
                  style={styles.createProjectButton}
                  disabled={isGenerating}
                >
                  <Text style={styles.createProjectText}>+ New project</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.chatSectionLabel}>CHATS</Text>
              {project?.chatIds.map((chatId) => {
                const chat = chats.find((item) => item.id === chatId);
                if (!chat) return null;

                return (
                  <View key={chat.id} style={styles.chatRow}>
                    <TouchableOpacity
                      onPress={() => dispatch(selectChat(chat.id))}
                      disabled={isGenerating}
                      style={[
                        styles.chatChip,
                        chat.id === activeChatId && styles.activeChatChip,
                      ]}
                    >
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.chatChipText,
                        chat.id === activeChatId && styles.activeChatChipText,
                      ]}
                    >
                      {chat.title}
                    </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteChat(chat.id)}
                      disabled={isGenerating || chat.id === activeChatId}
                      accessibilityLabel={
                        chat.id === activeChatId
                          ? 'Current chat cannot be deleted'
                          : `Delete ${chat.title}`
                      }
                      style={styles.deleteChatButton}
                    >
                      <Text
                        style={[
                          styles.deleteChatText,
                          chat.id === activeChatId && styles.deleteChatDisabled,
                        ]}
                      >
                        🗑
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              onPress={handleNewChat}
              disabled={isGenerating}
              style={styles.newChatButton}
            >
              <Text style={styles.newChatText}>+ New chat</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.mainContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setIsWorkspaceVisible((visible) => !visible)}
              style={styles.menuButton}
              accessibilityLabel={isWorkspaceVisible ? 'Hide projects and chats' : 'Show projects and chats'}
            >
              <Text style={styles.menuButtonText}>{isWorkspaceVisible ? '‹' : '›'}</Text>
            </TouchableOpacity>
            <View style={styles.avatarGlow}>
              <Text style={styles.avatarText}>V</Text>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>VINXO</Text>
              <Text style={styles.headerSubtitle}>
                {isGenerating ? 'Thinking...' : activeChat?.title ?? 'New conversation'}
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
            {messages.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateTitle}>Welcome to Vinxo</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Your local AI companion is offline-ready and waiting.
                </Text>
              </View>
            ) : (
              messages.map((message) => {
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
        </View>
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
  contentRow: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
  },
  workspacePanel: {
    width: 230,
    paddingHorizontal: 12,
    paddingTop: 16,
    backgroundColor: '#0B263D',
    borderRightWidth: 1,
    borderRightColor: '#1D4968',
  },
  workspaceList: {
    flex: 1,
  },
  workspaceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  workspaceEyebrow: {
    color: '#75D0F7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  projectName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  projectItem: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 4,
    borderRadius: 8,
  },
  activeProjectItem: {
    backgroundColor: '#1689C9',
  },
  projectItemText: {
    color: '#B8D8E9',
    fontSize: 13,
    fontWeight: '600',
  },
  activeProjectItemText: {
    color: '#FFFFFF',
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 8,
  },
  createProjectButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 4,
    marginBottom: 18,
  },
  createProjectText: {
    color: '#8ED8FF',
    fontSize: 13,
    fontWeight: '700',
  },
  projectForm: {
    padding: 8,
    marginTop: 4,
    marginBottom: 14,
    borderRadius: 8,
    backgroundColor: '#123552',
  },
  projectInput: {
    minHeight: 38,
    paddingHorizontal: 9,
    color: '#FFFFFF',
    borderRadius: 6,
    backgroundColor: '#0B263D',
  },
  projectFormActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 9,
    paddingHorizontal: 2,
  },
  projectActionText: {
    color: '#8ED8FF',
    fontSize: 12,
    fontWeight: '700',
  },
  projectCancelText: {
    color: '#B8D8E9',
    fontSize: 12,
  },
  newChatText: {
    color: '#8ED8FF',
    fontSize: 13,
    fontWeight: '700',
  },
  newChatButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    borderRadius: 8,
    backgroundColor: '#123552',
    borderWidth: 1,
    borderColor: '#286080',
  },
  chatSectionLabel: {
    color: '#75D0F7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  drawerToggleText: {
    color: '#8ED8FF',
    fontSize: 30,
    lineHeight: 30,
  },
  chatChip: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#286080',
    backgroundColor: '#123552',
  },
  activeChatChip: {
    borderColor: '#DDF5FF',
    backgroundColor: '#1689C9',
  },
  chatChipText: {
    color: '#B8D8E9',
    fontSize: 12,
  },
  activeChatChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  deleteChatButton: {
    width: 34,
    marginLeft: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#123552',
    borderWidth: 1,
    borderColor: '#286080',
  },
  deleteChatText: {
    color: '#FF9B9B',
    fontSize: 16,
  },
  deleteChatDisabled: {
    color: '#5B7180',
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1D4968',
  },
  menuButton: {
    width: 32,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginRight: 4,
  },
  menuButtonText: {
    color: '#8ED8FF',
    fontSize: 30,
    lineHeight: 30,
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