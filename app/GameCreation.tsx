import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Modal,
  Dimensions,
  Animated,
  Keyboard,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { COLORS, FONTS } from '../src/theme'; // Adjusted path
import { MaterialIcons, Ionicons } from '@expo/vector-icons'; // يفترض استخدام Expo
import * as Clipboard from 'expo-clipboard';

// Retrieve the API key from environment variables
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  files?: GeneratedFile[];
}

interface GeneratedFile {
  id: string;
  name: string;
  content: string;
  language: string;
}

interface GameTemplate {
  id: string;
  title: string;
  description: string;
  language: string;
  code: string;
}

interface GalleryProject {
  id: string;
  title: string;
  author: string;
  description: string;
}

const TABS = [
  { key: 'chat', label: 'انشاء لعبتك' },
  { key: 'explore', label: 'الاستكشاف' },
  { key: 'gallery', label: 'المعرض' },
];

const GAME_TEMPLATES: GameTemplate[] = [
  {
    id: 'template-1',
    title: 'لعبة XO (تيك تاك تو)',
    description: 'لعبة كلاسيكية ثنائية بسيطة للبدء (HTML/CSS/JS).',
    language: 'html', // اللغة الأساسية للعرض
    code: `<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
<title>لعبة XO</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>لعبة XO</h1>
  <div id="board">
    <div class="cell" data-index="0"></div>
    <div class="cell" data-index="1"></div>
    <div class="cell" data-index="2"></div>
    <div class="cell" data-index="3"></div>
    <div class="cell" data-index="4"></div>
    <div class="cell" data-index="5"></div>
    <div class="cell" data-index="6"></div>
    <div class="cell" data-index="7"></div>
    <div class="cell" data-index="8"></div>
  </div>
  <p id="status">دور اللاعب X</p>
  <button id="reset">إعادة اللعب</button>
  <script src="script.js"></script>
</body>
</html>

<!-- style.css -->
body { font-family: sans-serif; text-align: center; }
#board {
  display: grid;
  grid-template-columns: repeat(3, 100px);
  grid-template-rows: repeat(3, 100px);
  gap: 5px;
  justify-content: center;
  margin: 20px auto;
  width: 315px; /* 3*100px + 2*5px */
}
.cell {
  width: 100px;
  height: 100px;
  border: 1px solid #ccc;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 48px;
  cursor: pointer;
}
.cell:hover { background-color: #f0f0f0; }
#status { font-weight: bold; margin-bottom: 10px; }
button { padding: 10px 15px; margin-top: 10px; }

<!-- script.js -->
const board = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const statusDisplay = document.getElementById('status');
const resetButton = document.getElementById('reset');
let currentPlayer = 'X';
let gameState = ['', '', '', '', '', '', '', '', ''];
let gameActive = true;

const winningConditions = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

function handleCellClick(event) {
  const clickedCell = event.target;
  const clickedCellIndex = parseInt(clickedCell.getAttribute('data-index'));

  if (gameState[clickedCellIndex] !== '' || !gameActive) {
    return;
  }

  gameState[clickedCellIndex] = currentPlayer;
  clickedCell.textContent = currentPlayer;

  checkResult();
}

function checkResult() {
  let roundWon = false;
  for (let i = 0; i < winningConditions.length; i++) {
    const winCondition = winningConditions[i];
    let a = gameState[winCondition[0]];
    let b = gameState[winCondition[1]];
    let c = gameState[winCondition[2]];
    if (a === '' || b === '' || c === '') {
      continue;
    }
    if (a === b && b === c) {
      roundWon = true;
      break;
    }
  }

  if (roundWon) {
    statusDisplay.textContent = \`اللاعب \${currentPlayer} فاز!\`;
    gameActive = false;
    return;
  }

  let roundDraw = !gameState.includes('');
  if (roundDraw) {
    statusDisplay.textContent = 'تعادل!';
    gameActive = false;
    return;
  }

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  statusDisplay.textContent = \`دور اللاعب \${currentPlayer}\`;
}

function resetGame() {
  currentPlayer = 'X';
  gameState = ['', '', '', '', '', '', '', '', ''];
  gameActive = true;
  statusDisplay.textContent = \`دور اللاعب \${currentPlayer}\`;
  cells.forEach(cell => cell.textContent = '');
}

cells.forEach(cell => cell.addEventListener('click', handleCellClick));
resetButton.addEventListener('click', resetGame);
`
  },
  {
    id: 'template-2',
    title: 'لعبة عداد النقاط',
    description: 'عداد نقاط بسيط (HTML/CSS/JS).',
    language: 'html', // اللغة الأساسية للعرض
    code: `<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
<title>عداد النقاط</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>عداد النقاط</h1>
  <p>النقاط: <span id="score">0</span></p>
  <button id="increaseBtn">زيادة نقطة</button>
  <button id="decreaseBtn">إنقاص نقطة</button>
  <button id="resetBtn">إعادة تعيين</button>
  <script src="script.js"></script>
</body>
</html>

<!-- style.css -->
body { font-family: sans-serif; text-align: center; padding-top: 50px; }
#score { font-size: 2em; font-weight: bold; color: #4A6FFF; }
button {
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  margin: 5px;
  border: none;
  border-radius: 5px;
  color: white;
}
#increaseBtn { background-color: #28a745; } /* أخضر */
#decreaseBtn { background-color: #dc3545; } /* أحمر */
#resetBtn { background-color: #ffc107; color: black; } /* أصفر */

<!-- script.js -->
let score = 0;
const scoreDisplay = document.getElementById('score');
const increaseButton = document.getElementById('increaseBtn');
const decreaseButton = document.getElementById('decreaseBtn');
const resetButton = document.getElementById('resetBtn');

function updateScoreDisplay() {
  scoreDisplay.textContent = score;
}

increaseButton.addEventListener('click', () => {
  score++;
  updateScoreDisplay();
});

decreaseButton.addEventListener('click', () => {
  if (score > 0) { // يمكن تعديل هذا الشرط للسماح بالنقاط السالبة
    score--;
    updateScoreDisplay();
  }
});

resetButton.addEventListener('click', () => {
  score = 0;
  updateScoreDisplay();
});

// Initialize display
updateScoreDisplay();
`
  },
  // يمكنك إضافة المزيد من القوالب هنا
];

const GALLERY_PROJECTS: GalleryProject[] = [
  {
    id: 'gallery-1',
    title: 'لعبة المتاهة',
    author: 'مستخدم 1',
    description: 'لعبة متاهة تفاعلية باستخدام جافاسكريبت.',
  },
  {
    id: 'gallery-2',
    title: 'لعبة جمع النقاط',
    author: 'مستخدم 2',
    description: 'لعبة بسيطة لجمع النقاط وتسجيل النتائج.',
  },
  // يمكنك إضافة المزيد من المشاريع هنا
];

const GameCreationScreen = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showFilesList, setShowFilesList] = useState(false);
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'explore' | 'gallery'>('chat');
  const [selectedTemplate, setSelectedTemplate] = useState<GameTemplate | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const inputRef = useRef<TextInput>(null);
  
  // إضافة مراقبة للوحة المفاتيح
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  const toggleFilesList = () => {
    setShowFilesList(!showFilesList);
    Animated.timing(slideAnim, {
      toValue: showFilesList ? -300 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Parse code blocks from AI response and extract file content
  const parseCodeBlocks = (text: string): {parsedText: string, files: GeneratedFile[]} => {
    const fileRegex = /```([a-zA-Z0-9+#]+)(?:\s*\/\/\s*filename:\s*([a-zA-Z0-9_.-]+))?\s*\n([\s\S]*?)```/g;
    const files: GeneratedFile[] = [];
    let match;
    let parsedText = text;
    
    while ((match = fileRegex.exec(text)) !== null) {
      const language = match[1] || 'plain';
      const suggestedName = match[2] || `file-${files.length + 1}.${getFileExtension(language)}`;
      const content = match[3];
      
      const newFile: GeneratedFile = {
        id: Date.now().toString() + files.length,
        name: suggestedName,
        content: content,
        language: language,
      };
      
      files.push(newFile);
      
      // Replace the code block with a file reference
      parsedText = parsedText.replace(
        match[0],
        `[ملف: ${suggestedName}]\n\n`
      );
    }
    
    return { parsedText, files };
  };
  
  const getFileExtension = (language: string): string => {
    const extensions: {[key: string]: string} = {
      javascript: 'js',
      typescript: 'ts',
      jsx: 'jsx',
      tsx: 'tsx',
      html: 'html',
      css: 'css',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      'c++': 'cpp',
      csharp: 'cs',
      'c#': 'cs',
      swift: 'swift',
      kotlin: 'kt',
      go: 'go',
      rust: 'rs',
      php: 'php',
      ruby: 'rb',
      dart: 'dart',
    };
    
    return extensions[language.toLowerCase()] || 'txt';
  };

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString() + '-user',
      text: inputText.trim(),
      sender: 'user',
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputText('');
    setIsLoading(true);
    setIsTyping(true);
    
    // اخفاء لوحة المفاتيح بعد الإرسال
    Keyboard.dismiss();

    // أضف رسالة "الوكيل يكتب..." مؤقتة
    const typingMessage: Message = {
      id: 'typing-indicator',
      text: 'الوكيل يكتب... ✍️',
      sender: 'ai',
    };
    setMessages((prevMessages) => [...prevMessages, typingMessage]);

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userMessage.text }] }],
          systemInstruction: {
            parts: [{
              // تحديث التعليمات النظامية لتشمل تحليل الكود
              text: `You are Bright AI, a professional AI assistant specialized in web-based game development using HTML, CSS, and JavaScript. Your purpose is to:
1.  Help users brainstorm game ideas.
2.  Generate the necessary HTML structure, CSS styling, and JavaScript logic for games.
3.  Analyze user-provided HTML, CSS, or JavaScript code snippets to identify issues, suggest improvements, or offer optimizations.

When generating code for a game or example, always provide the complete code split into three distinct files:
-   An HTML file (\`\`\`html // filename: index.html\`)
-   A CSS file (\`\`\`css // filename: style.css\`)
-   A JavaScript file (\`\`\`javascript // filename: script.js\`)
Use the format: \`\`\`language // filename: example.ext\ncode content\`\`\` for each file.

Example of code generation (Clicker Game):
\`\`\`html // filename: index.html
<!DOCTYPE html>
<html>
<head>
    <title>Clicker Game</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Clicker Game</h1>
    <button id="clickButton">Click Me!</button>
    <p>Score: <span id="score">0</span></p>
    <script src="script.js"></script>
</body>
</html>
\`\`\`
\`\`\`css // filename: style.css
body { font-family: sans-serif; text-align: center; }
button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
\`\`\`
\`\`\`javascript // filename: script.js
let score = 0;
const scoreDisplay = document.getElementById('score');
const clickButton = document.getElementById('clickButton');
clickButton.addEventListener('click', () => { score++; scoreDisplay.textContent = score; });
\`\`\`

When asked to analyze code provided by the user:
-   Clearly state the analysis or suggestions.
-   If providing corrected/improved code, use the appropriate code block format (\`\`\`language\ncode\`\`\`).
-   Explain the reasoning behind your suggestions.

Always provide complete, working examples when generating code. Respond professionally and ensure generated code is functional for a web environment. Be helpful and constructive when analyzing user code.`
            }]
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();

      // Extract text from the response
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'عذراً، لم أتمكن من معالجة ذلك.';
      
      // Parse code blocks and extract files
      const { parsedText, files } = parseCodeBlocks(aiText);
      
      // Add new files to state
      if (files.length > 0) {
        setGeneratedFiles(prevFiles => [...prevFiles, ...files]);
      }

      const aiMessage: Message = {
        id: Date.now().toString() + '-ai',
        text: parsedText.trim(),
        sender: 'ai',
        files: files.length > 0 ? files : undefined,
      };
      
      // أزل رسالة "الوكيل يكتب..." قبل إضافة رد الذكاء الاصطناعي
      setMessages((prevMessages) => [
        ...prevMessages.filter((msg) => msg.id !== 'typing-indicator'),
        aiMessage,
      ]);
      
      setIsTyping(false);

    } catch (error) {
      console.error('Error sending message to Gemini:', error);
      const errorMessage: Message = {
        id: Date.now().toString() + '-error',
        text: 'حدث خطأ. يرجى المحاولة مرة أخرى.',
        sender: 'ai',
      };
      setMessages((prevMessages) => [
        ...prevMessages.filter((msg) => msg.id !== 'typing-indicator'),
        errorMessage,
      ]);
      setIsTyping(false);
    } finally {
      setIsLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [inputText, isLoading]);

  const openFileViewer = (file: GeneratedFile) => {
    setSelectedFile(file);
    setModalVisible(true);
  };

  const handleCopyToClipboard = async () => {
    if (selectedFile?.content) {
      await Clipboard.setStringAsync(selectedFile.content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1200);
    }
  };

  // --- Render Functions for Sections ---
  const renderTemplateItem = ({ item }: { item: GameTemplate }) => (
    <View style={styles.templateCard}>
      <Text style={styles.templateTitle}>{item.title}</Text>
      <Text style={styles.templateDesc}>{item.description}</Text>
      <TouchableOpacity
        style={styles.templateButton}
        onPress={() => setSelectedTemplate(item)}
      >
        <Text style={styles.templateButtonText}>عرض الكود</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGalleryItem = ({ item }: { item: GalleryProject }) => (
    <View style={styles.galleryCard}>
      <Text style={styles.galleryTitle}>{item.title}</Text>
      <Text style={styles.galleryAuthor}>بواسطة: {item.author}</Text>
      <Text style={styles.galleryDesc}>{item.description}</Text>
      {/* زر عرض التفاصيل يمكن تطويره لاحقاً */}
    </View>
  );

  const renderExploreSection = () => (
    <View style={styles.sectionContainer}>
      <FlatList
        data={GAME_TEMPLATES}
        renderItem={renderTemplateItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<Text style={styles.sectionTitle}>قوالب ألعاب جاهزة</Text>}
        contentContainerStyle={styles.sectionListContent}
      />
      {/* Modal لعرض كود القالب */}
      <Modal
        visible={!!selectedTemplate}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedTemplate(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="middle">
                {selectedTemplate?.title}
              </Text>
              <TouchableOpacity onPress={() => setSelectedTemplate(null)}>
                <MaterialIcons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.codeContainer}>
              <Text style={styles.codeText}>{selectedTemplate?.code}</Text>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={async () => {
                  if (selectedTemplate?.code) {
                    await Clipboard.setStringAsync(selectedTemplate.code);
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 1200);
                  }
                }}
              >
                <MaterialIcons name={copySuccess ? "check" : "content-copy"} size={20} color={COLORS.white} />
                <Text style={styles.actionText}>
                  {copySuccess ? "تم النسخ!" : "نسخ"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setSelectedTemplate(null)}
              >
                <Text style={styles.closeModalText}>إغلاق</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderGallerySection = () => (
    <View style={styles.sectionContainer}>
      <FlatList
        data={GALLERY_PROJECTS}
        renderItem={renderGalleryItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<Text style={styles.sectionTitle}>مشاريع المستخدمين</Text>}
        contentContainerStyle={styles.sectionListContent}
      />
    </View>
  );

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageBubble,
        item.sender === 'user' ? styles.userBubble : styles.aiBubble,
      ]}
    >
      <Text style={item.sender === 'user' ? styles.userText : styles.aiText}>
        {item.text}
      </Text>
      {item.files && item.files.length > 0 && (
        <View style={styles.filesContainer}>
          <Text style={styles.filesHeader}>الملفات المنشأة:</Text>
          {item.files.map((file) => (
            <TouchableOpacity
              key={file.id}
              style={styles.fileItem}
              onPress={() => openFileViewer(file)}
            >
              <MaterialIcons name="insert-drive-file" size={20} color={COLORS.primary} />
              <Text style={styles.fileName}>{file.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderFileItem = ({ item }: { item: GeneratedFile }) => (
    <TouchableOpacity
      style={styles.sidebarFileItem}
      onPress={() => openFileViewer(item)}
    >
      <MaterialIcons name="insert-drive-file" size={20} color={COLORS.white} />
      <Text style={styles.sidebarFileName} numberOfLines={1} ellipsizeMode="middle">
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      <View style={styles.outerContainer}>
        {/* شريط التبويبات العلوي */}
        <View style={styles.tabsContainer}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                activeTab === tab.key && styles.tabButtonActive
              ]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Text style={[
                styles.tabButtonText,
                activeTab === tab.key && styles.tabButtonTextActive
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sidebar for files */}
        <Animated.View
          style={[
            styles.sidebar,
            { transform: [{ translateX: slideAnim }] }
          ]}
        >
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>الملفات المنشأة</Text>
            <TouchableOpacity onPress={toggleFilesList} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          {generatedFiles.length > 0 ? (
            <FlatList
              data={generatedFiles}
              renderItem={renderFileItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.sidebarContent}
            />
          ) : (
            <View style={styles.emptyFilesContainer}>
              <MaterialIcons name="folder-open" size={40} color={COLORS.lightGray} />
              <Text style={styles.emptyFilesText}>لا توجد ملفات منشأة بعد</Text>
            </View>
          )}
        </Animated.View>

        {/* Main Content حسب التبويب */}
        <View style={styles.contentArea}>
          {activeTab === 'chat' && (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={[styles.container, { flex: 1 }]}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
              enabled
            >
              {/* Header */}
              <View style={styles.chatHeader}>
                <View style={styles.headerContent}>
                  <TouchableOpacity onPress={toggleFilesList} style={styles.filesButton}>
                    <MaterialIcons name="folder" size={24} color={COLORS.white} />
                    {generatedFiles.length > 0 && (
                      <View style={styles.badgeContainer}>
                        <Text style={styles.badgeText}>{generatedFiles.length}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <Text style={styles.title}> الدردشة</Text>
                  <View style={styles.placeholder} />
                </View>
                <Text style={styles.description}>
                  اكتب فكرة لعبة أو طلب كود أولي، وسأساعدك في توليدها!
                </Text>
              </View>

              {/* Chat Area */}
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                style={styles.chatArea}
                // إزالة التعديل اليدوي للـ paddingBottom
                contentContainerStyle={styles.chatContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              />

              {/* Loading Indicator */}
              {isLoading && !isTyping && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.loadingText}>جارٍ التفكير...</Text>
                </View>
              )}

              {/* Input Area - منطقة الإدخال */}
              <View style={styles.inputContainer}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="اكتب رسالتك هنا..."
                  placeholderTextColor={COLORS.lightGray}
                  multiline
                  blurOnSubmit={false}
                  onFocus={() => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200)}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!inputText.trim() || isLoading) && styles.sendButtonDisabled
                  ]}
                  onPress={sendMessage}
                  disabled={!inputText.trim() || isLoading}
                >
                  <Ionicons name="send" size={20} color={COLORS.white} style={styles.sendIcon} />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          )}
          {activeTab === 'explore' && renderExploreSection()}
          {activeTab === 'gallery' && renderGallerySection()}
        </View>

        {/* File Viewer Modal */}
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="middle">
                  {selectedFile?.name}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={COLORS.secondary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.codeContainer}>
                <Text style={styles.codeText}>{selectedFile?.content}</Text>
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.actionButton} onPress={handleCopyToClipboard}>
                  <MaterialIcons name={copySuccess ? "check" : "content-copy"} size={20} color={COLORS.white} />
                  <Text style={styles.actionText}>
                    {copySuccess ? "تم النسخ!" : "نسخ"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeModalText}>إغلاق</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375; // تحديد إذا كان الجهاز صغيرًا

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  outerContainer: {
    flex: 1,
    backgroundColor: COLORS.background || '#f0f4f8',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) : 0,
    paddingBottom: 0,
    zIndex: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: isSmallDevice ? 10 : 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: COLORS.secondary,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  tabButtonText: {
    ...FONTS.h4,
    color: COLORS.white,
    opacity: 0.7,
    fontSize: isSmallDevice ? 13 : 14, // تصغير النص على الأجهزة الصغيرة
  },
  tabButtonTextActive: {
    color: COLORS.white,
    opacity: 1,
    fontWeight: 'bold',
  },
  contentArea: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: Math.min(250, width * 0.75), // جعل عرض الشريط الجانبي متناسبًا مع الشاشة
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.secondary || '#2A2A2A',
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    paddingTop: Platform.OS === 'ios' ? 90 : (StatusBar.currentHeight || 0) + 50,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  sidebarTitle: {
    ...FONTS.h3,
    color: COLORS.white,
    fontSize: isSmallDevice ? 16 : 18, // تصغير العنوان على الأجهزة الصغيرة
  },
  closeButton: {
    padding: 5,
  },
  sidebarContent: {
    padding: 10,
  },
  sidebarFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  sidebarFileName: {
    ...FONTS.body4,
    color: COLORS.white,
    marginLeft: 8,
    flex: 1,
    fontSize: isSmallDevice ? 12 : 14, // تصغير النص على الأجهزة الصغيرة
  },
  emptyFilesContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyFilesText: {
    ...FONTS.body3,
    color: COLORS.lightGray,
    marginTop: 10,
    textAlign: 'center',
    fontSize: isSmallDevice ? 13 : 14, // تصغير النص على الأجهزة الصغيرة
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background || '#f0f4f8',
  },
  chatHeader: {
    padding: isSmallDevice ? 12 : 16, // تقليل التباعد على الأجهزة الصغيرة
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filesButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.error || 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    ...FONTS.caption,
    color: COLORS.white,
    fontSize: 10,
  },
  title: {
    ...FONTS.h2,
    color: COLORS.white,
    textAlign: 'center',
    flex: 1,
    fontSize: isSmallDevice ? 20 : 24, // تصغير العنوان على الأجهزة الصغيرة
  },
  description: {
    ...FONTS.body4,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontSize: isSmallDevice ? 12 : 14, // تصغير النص على الأجهزة الصغيرة
  },
  chatArea: {
    flex: 1,
    paddingHorizontal: isSmallDevice ? 10 : 15, // تقليل التباعد على الأجهزة الصغيرة
  },
  chatContent: {
    paddingVertical: 15,
    paddingBottom: Platform.OS === 'ios' ? 15 : 10,
  },
  messageBubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginBottom: 12,
    maxWidth: '85%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  userBubble: {
    backgroundColor: COLORS.primary || '#4A6FFF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: COLORS.white || '#FFFFFF',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  userText: {
    ...FONTS.body3,
    color: COLORS.white,
    fontSize: isSmallDevice ? 13 : 14, // تصغير النص على الأجهزة الصغيرة
  },
  aiText: {
    ...FONTS.body3,
    color: COLORS.black || '#333333',
    lineHeight: 22,
    fontSize: isSmallDevice ? 13 : 14, // تصغير النص على الأجهزة الصغيرة
  },
  filesContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  filesHeader: {
    ...FONTS.h4,
    color: COLORS.secondary || '#555555',
    marginBottom: 8,
    fontSize: isSmallDevice ? 14 : 16, // تصغير العنوان على الأجهزة الصغيرة
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  fileName: {
    ...FONTS.body4,
    color: COLORS.primary,
    marginLeft: 8,
    fontSize: isSmallDevice ? 12 : 14, // تصغير النص على الأجهزة الصغيرة
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'transparent',
    // إزالة position: 'absolute' و bottom
  },
  loadingText: {
    ...FONTS.body4,
    color: COLORS.secondary,
    marginLeft: 8,
    fontSize: isSmallDevice ? 12 : 14, // تصغير النص على الأجهزة الصغيرة
  },
  // تحسين منطقة الإدخال للهواتف
  inputContainer: {
    flexDirection: 'row',
    padding: isSmallDevice ? 8 : 12,
    backgroundColor: COLORS.white,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  input: {
    flex: 1,
    minHeight: isSmallDevice ? 40 : 45,
    maxHeight: 100,
    backgroundColor: COLORS.lightGray2 || '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginRight: 10,
    ...FONTS.body3,
    color: COLORS.black,
    fontSize: isSmallDevice ? 13 : 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: isSmallDevice ? 40 : 45, // تصغير الزر على الأجهزة الصغيرة
    height: isSmallDevice ? 40 : 45,
    borderRadius: isSmallDevice ? 20 : 22.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.lightGray || '#CCCCCC',
  },
  sendIcon: {
    transform: [{ rotate: '-45deg' }],
    marginLeft: -2,
    marginTop: -2,
  },
  // --- Modal Styles ---
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    width: '100%',
    maxHeight: '90%', // زيادة الارتفاع الأقصى قليلاً
    padding: 0,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    ...FONTS.h3,
    color: COLORS.secondary,
    flex: 1,
    marginRight: 10,
    fontSize: isSmallDevice ? 16 : 18, // تصغير العنوان على الأجهزة الصغيرة
  },
  codeContainer: {
    paddingHorizontal: isSmallDevice ? 10 : 15, // تقليل الهامش الأفقي قليلاً
    paddingVertical: 15,
    maxHeight: height * 0.7, // زيادة الارتفاع الأقصى المسموح به للكود
    backgroundColor: '#F8F9FA', // خلفية فاتحة للكود
  },
  codeText: {
    ...FONTS.body4, // استخدام خط أصغر قليلاً
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#333',
    lineHeight: 18, // تقليل ارتفاع السطر قليلاً
    fontSize: isSmallDevice ? 11 : 12, // تصغير حجم الخط أكثر للكود
    textAlign: 'left', // محاذاة النص لليسار (مناسب للكود)
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    marginRight: 10,
  },
  actionText: {
    ...FONTS.body4,
    color: COLORS.white,
    marginLeft: 8,
    fontSize: isSmallDevice ? 12 : 14, // تصغير النص على الأجهزة الصغيرة
  },
  closeModalButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1,
  },
  closeModalText: {
    ...FONTS.body4,
    color: COLORS.secondary,
    fontSize: isSmallDevice ? 12 : 14, // تصغير النص على الأجهزة الصغيرة
  },
  // --- Explore/Gallery Section Styles ---
  sectionContainer: {
    flex: 1,
    backgroundColor: COLORS.background || '#f0f4f8',
  },
  sectionListContent: {
    paddingHorizontal: isSmallDevice ? 8 : 12, // تقليل التباعد على الأجهزة الصغيرة
    paddingTop: 12,
    paddingBottom: 20,
  },
  sectionTitle: {
    ...FONTS.h3,
    color: COLORS.primary,
    marginBottom: 15,
    paddingHorizontal: 5,
    textAlign: 'center',
    fontSize: isSmallDevice ? 18 : 20, // تصغير العنوان على الأجهزة الصغيرة
  },
  templateCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: isSmallDevice ? 10 : 12, // تقليل الحشو الداخلي قليلاً
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  templateTitle: {
    ...FONTS.h4,
    color: COLORS.secondary,
    marginBottom: 4,
    fontSize: isSmallDevice ? 14 : 16, // الحفاظ على حجم العنوان أو تصغيره قليلاً
    textAlign: 'right', // محاذاة لليمين
  },
  templateDesc: {
    ...FONTS.body4,
    color: COLORS.lightGray,
    marginBottom: 10,
    lineHeight: 18,
    fontSize: isSmallDevice ? 12 : 13, // تصغير النص قليلاً
    textAlign: 'right', // محاذاة لليمين
  },
  templateButton: {
    alignSelf: 'flex-start', // نقل الزر لليسار (أو flex-end لليمين)
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14, // تقليل الحشو الأفقي للزر
    paddingVertical: 6, // تقليل الحشو العمودي للزر
    borderRadius: 6,
    marginTop: 8,
  },
  templateButtonText: {
    ...FONTS.body4,
    color: COLORS.white,
    fontWeight: '500',
    fontSize: isSmallDevice ? 11 : 12, // تصغير نص الزر
  },
  galleryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: isSmallDevice ? 12 : 14, // تقليل التباعد على الأجهزة الصغيرة
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  galleryTitle: {
    ...FONTS.h4,
    color: COLORS.secondary,
    marginBottom: 3,
    fontSize: isSmallDevice ? 15 : 16, // تصغير العنوان على الأجهزة الصغيرة
  },
  galleryAuthor: {
    ...FONTS.caption,
    color: COLORS.lightGray,
    marginBottom: 6,
    fontSize: isSmallDevice ? 11 : 12, // تصغير النص على الأجهزة الصغيرة
  },
  galleryDesc: {
    ...FONTS.body4,
    color: COLORS.black,
    lineHeight: 18,
    fontSize: isSmallDevice ? 12 : 14, // تصغير النص على الأجهزة الصغيرة
  },
});

export default GameCreationScreen;
