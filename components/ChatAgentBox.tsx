import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../src/theme';
import { GEMINI_API_KEY, GEMINI_API_URL } from '../src/config';
import agentPrompts from '../src/agent_prompts.json';
import { GROQ_API_KEY, GROQ_API_URL, GROQ_MODEL } from '../src/config';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from "expo-document-picker";
import { LinearGradient } from 'expo-linear-gradient';

interface Message {
  id: string;
  text: string;
  type: 'user' | 'ai' | 'error';
}

interface ChatAgentBoxProps {
  agentId: string;
  agentName: string;
  description: string;
  placeholderText?: string;
}

const ChatAgentBox = ({ agentId, agentName, description, placeholderText = "اكتب رسالتك هنا..." }: ChatAgentBoxProps) => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessageText = inputText;
    const userMessage: Message = {
      id: Date.now().toString() + '-user',
      text: userMessageText,
      type: 'user',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      let apiUrl = '';
      let apiKey = '';
      let requestBody: any = {};
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };

      const promptsData = agentPrompts as Record<string, { name: string; system_prompt: string }>;
      const systemPrompt = promptsData[agentId]?.system_prompt;

      if (!systemPrompt) {
        throw new Error("System prompt not found for the selected agent.");
      }

      if (parseInt(agentId) >= 7) {
        apiUrl = GROQ_API_URL;
        apiKey = GROQ_API_KEY;

        requestBody = {
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessageText },
          ],
          temperature: 0.6,
        };

        headers['Authorization'] = `Bearer ${apiKey}`;
      } else {
        apiUrl = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
        apiKey = GEMINI_API_KEY;

        requestBody = {
          contents: [{ parts: [{ text: userMessageText }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
        };
      }

      if (!apiKey || apiKey === 'YOUR_API_KEY_ENV_VARIABLE_NOT_SET') {
        throw new Error("API Key not configured. Please check your environment variables.");
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        console.error("API Error Response:", response.status, response.statusText, errorBody);
        throw new Error(`API Error: ${response.status} ${response.statusText}. ${errorBody?.error?.message || 'Check console for details.'}`);
      }

      const data = await response.json();
      const aiResponseText =
        parseInt(agentId) >= 7
          ? data.choices?.[0]?.message?.content
          : data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!aiResponseText) {
        throw new Error("Received an empty or invalid response from the AI.");
      }

      const aiMessage: Message = {
        id: Date.now().toString() + '-ai',
        text: aiResponseText.trim(),
        type: 'ai',
      };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error: any) {
      console.error("Error calling API:", error);
      const errorMessage: Message = {
        id: Date.now().toString() + '-error',
        text: `Error: ${error.message || 'Failed to get response.'}`,
        type: 'error',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.type === 'user';
    const isError = message.type === 'error';
    const bubbleStyle = isUser ? styles.userBubble : (isError ? styles.errorBubble : styles.aiBubble);
    const textStyle = isUser ? styles.userMessageText : (isError ? styles.errorText : styles.aiMessageText);

    // فقاعات رسائل بتدرج لوني للمستخدم والذكاء الاصطناعي
    if (isUser) {
      return (
        <LinearGradient
          key={message.id}
          colors={[COLORS.primary, COLORS.secondary]}
          style={[styles.messageBubble, bubbleStyle]}
          start={{ x: 0.2, y: 0.2 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={textStyle}>{message.text}</Text>
        </LinearGradient>
      );
    } else if (isError) {
      return (
        <View key={message.id} style={[styles.messageBubble, bubbleStyle]}>
          <Text style={textStyle}>{message.text}</Text>
        </View>
      );
    } else {
      return (
        <LinearGradient
          key={message.id}
          colors={['#f7fafc', COLORS.lightGray]}
          style={[styles.messageBubble, bubbleStyle]}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
        >
          <Text style={textStyle}>{message.text}</Text>
        </LinearGradient>
      );
    }
  };

  return (
    <LinearGradient
      colors={['#f7fafc', COLORS.background, '#e3e6f3']}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.agentName}>{agentName}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messageHistory}
          contentContainerStyle={styles.messageHistoryContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          )}
        </ScrollView>

        <View style={styles.inputArea}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={placeholderText}
            placeholderTextColor={COLORS.lightGray}
            multiline
            editable={!isLoading}
          />
          <TouchableOpacity onPress={handleSend} style={styles.iconButton} disabled={isLoading}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              style={styles.sendButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <FontAwesome5 name="paper-plane" size={20} color="#fff" solid />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    padding: SIZES.base * 1.5,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
    alignItems: 'flex-end',
    marginBottom: SIZES.base,
  },
  agentName: {
    ...FONTS.h3,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'right',
    letterSpacing: 0.5,
    textShadowColor: COLORS.secondary,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  description: {
    ...FONTS.body4,
    color: COLORS.text,
    textAlign: 'right',
    opacity: 0.8,
    marginTop: 2,
  },
  messageHistory: {
    flex: 1,
  },
  messageHistoryContent: {
    padding: SIZES.base * 1.5,
    paddingBottom: SIZES.base * 2,
  },
  messageBubble: {
    padding: SIZES.base * 1.1,
    borderRadius: SIZES.radius * 2,
    marginBottom: SIZES.base,
    maxWidth: '80%',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderTopRightRadius: SIZES.radius * 4,
    borderBottomRightRadius: SIZES.radius * 0.5,
    borderTopLeftRadius: SIZES.radius * 1.5,
    borderBottomLeftRadius: SIZES.radius * 2,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderTopLeftRadius: SIZES.radius * 4,
    borderBottomLeftRadius: SIZES.radius * 0.5,
    borderTopRightRadius: SIZES.radius * 1.5,
    borderBottomRightRadius: SIZES.radius * 2,
  },
  errorBubble: {
    backgroundColor: '#FFD2D2',
    alignSelf: 'flex-start',
    borderRadius: SIZES.radius * 2,
    borderTopLeftRadius: SIZES.radius * 4,
    borderBottomLeftRadius: SIZES.radius * 0.5,
  },
  userMessageText: {
    ...FONTS.body4,
    color: '#fff',
    fontWeight: 'bold',
  },
  aiMessageText: {
    ...FONTS.body4,
    color: COLORS.text,
  },
  errorText: {
    ...FONTS.body4,
    color: '#D8000C',
  },
  loadingContainer: {
    alignSelf: 'center',
    marginVertical: SIZES.base,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.base,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    marginBottom: SIZES.base,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius * 2,
    borderWidth: 0,
    paddingHorizontal: SIZES.base,
    color: COLORS.text,
    marginRight: SIZES.base / 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  iconButton: {
    marginLeft: SIZES.base / 2,
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default ChatAgentBox;
