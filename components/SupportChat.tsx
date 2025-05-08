import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  TextStyle,
  Share,
  ImageBackground,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../theme';

// Gemini API configuration
const GEMINI_API_KEY = 'AIzaSyCG7Bwr3SFikwvFLhX2HZsAjqgEQIFx7DE';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

// Initial context for the AI support
const SUPPORT_CONTEXT = `أنت مساعد الدعم الفني لتطبيق Bright AI. نحن نقدم حلول ذكاء اصطناعي متكاملة للشركات، تشمل:
- تحليل البيانات وتقديم رؤى ذكية
- أتمتة العمليات والمهام الذكي
- وكلاء الذكاء 
- الاستشارات في الذكاء
- مكتبة ذكية
- التنبؤ والتحليل المستقبلي

يجب أن تكون مهذباً ومحترفاً ومفيداً. قدم إجابات دقيقة وموجزة باللغة العربية.
إذا سُئلت عن شيء خارج نطاق خدماتنا، اقترح التواصل مع فريق المبيعات للحصول على معلومات إضافية.`;

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp?: number;
  isTyping?: boolean;
}

interface SupportChatProps {
  visible: boolean;
  onClose: () => void;
}

export default function SupportChat({ visible, onClose }: SupportChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'مرحباً! أنا مساعد Bright AI. كيف يمكنني مساعدتك اليوم؟',
      isUser: false,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // For file attachment
  const handleAttachFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: false,
        multiple: false,
        type: "*/*",
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileMessage: Message = {
          id: Date.now().toString(),
          text: `📎 تم إرفاق ملف: ${asset.name}`,
          isUser: true,
        };
        setMessages(prev => [...prev, fileMessage]);
        setInputText('');
        // Optionally, you can handle file upload here
      }
    } catch (error) {
      console.error('Error picking file:', error);
    }
  };

  // For clearing chat
  const handleClearChat = async () => {
    try {
      await AsyncStorage.removeItem('chat_history');
      setMessages([
        {
          id: '1',
          text: 'مرحباً! أنا مساعد Bright AI. كيف يمكنني مساعدتك اليوم؟',
          isUser: false,
        },
      ]);
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  useEffect(() => {
    if (messages.length > 1) {
      AsyncStorage.setItem('chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await AsyncStorage.getItem('chat_history');
        if (history) {
          setMessages(JSON.parse(history));
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };
    loadHistory();
  }, []);

  const handleShare = async () => {
    try {
      const messageText = messages
        .map(msg => `${msg.isUser ? 'أنت' : 'المساعد'}: ${msg.text}`)
        .join('\n\n');
      
      await Share.share({
        message: messageText,
        title: 'محادثة الدعم الفني - Bright AI',
      });
    } catch (error) {
      console.error('Error sharing chat:', error);
    }
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setIsAITyping(true);

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: SUPPORT_CONTEXT },
                { text: `User: ${text}\nAssistant:` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      const aiResponse = data.candidates[0].content.parts[0].text;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse.trim(),
        isUser: false,
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsAITyping(false);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.',
        isUser: false,
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsAITyping(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <ImageBackground
          source={require('../assets/Background/Leonardo_Phoenix_10_A_calming_and_modern_background_design_for_0.jpg')}
          style={styles.chatContainer}
          imageStyle={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
          resizeMode="cover"
        >
          <View style={{ flex: 1 }}>
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>الدعم الفني</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={handleClearChat} style={styles.clearButton} accessibilityLabel="مسح المحادثة">
                  <MaterialCommunityIcons name="trash-can-outline" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
                  <Ionicons name="share-outline" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView 
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
            >
              {messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageBox,
                    message.isUser ? styles.userMessage : styles.aiMessage,
                  ]}
                >
                  <Text style={styles.messageText}>{message.text}</Text>
                </View>
              ))}
              {isAITyping && (
                <View style={[styles.messageBox, styles.aiMessage]}>
                  <View style={styles.typingIndicator}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.typingText}>جاري الكتابة...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 84 : 0}
            >
              <View style={styles.inputContainer}>
                <TouchableOpacity
                  style={styles.attachButton}
                  onPress={handleAttachFile}
                  accessibilityLabel="إرفاق ملف"
                >
                  <MaterialCommunityIcons name="paperclip" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="اكتب رسالتك هنا..."
                  placeholderTextColor="#999"
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={() => sendMessage(inputText)}
                  disabled={isLoading || !inputText.trim()}
                >
                  <Ionicons
                    name="send"
                    size={24}
                    color={inputText.trim() ? COLORS.primary : '#999'}
                  />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </ImageBackground>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  } as ViewStyle,
  chatContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  } as ViewStyle,
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 15,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  } as ViewStyle,
  headerTitle: {
    ...FONTS.h3,
    color: COLORS.white,
    flex: 1,
    textAlign: 'right',
    marginRight: 10,
  } as TextStyle,
  closeButton: {
    padding: 5,
  } as ViewStyle,
  clearButton: {
    padding: 5,
    marginLeft: 5,
  } as ViewStyle,
  shareButton: {
    padding: 5,
    marginLeft: 10,
  } as ViewStyle,
  attachButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    marginLeft: 5,
  } as ViewStyle,
  messagesContainer: {
    flex: 1,
    padding: 15,
  } as ViewStyle,
  messageBox: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 15,
    marginBottom: 10,
  } as ViewStyle,
  userMessage: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-start',
    borderTopLeftRadius: 5,
  } as ViewStyle,
  aiMessage: {
    backgroundColor: '#f0f0f0',
    alignSelf: 'flex-end',
    borderTopRightRadius: 5,
  } as ViewStyle,
  messageText: {
    ...FONTS.body3,
    color: COLORS.text,
    textAlign: 'right',
  } as TextStyle,
  loadingContainer: {
    padding: 10,
    alignItems: 'center',
  } as ViewStyle,
  inputContainer: {
    flexDirection: 'row-reverse',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: COLORS.white,
  } as ViewStyle,
  input: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginLeft: 10,
    textAlign: 'right',
    ...FONTS.body3,
  } as TextStyle,
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  } as ViewStyle,
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  } as ViewStyle,
  typingText: {
    ...FONTS.body4,
    color: COLORS.text,
    marginLeft: 8,
  } as TextStyle,
  messagesContent: {
    paddingBottom: 20,
  } as ViewStyle,
});
