import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Modal, 
  ActivityIndicator, 
  FlatList, 
  I18nManager, 
  Alert,
  Dimensions,
  SafeAreaView,
  Platform,
  Animated,
  PanResponder,
  Keyboard,
  TouchableWithoutFeedback,
  LayoutAnimation,
  UIManager,
  KeyboardAvoidingView
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import { COLORS, FONTS } from '../src/theme';
import { FontAwesome, MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { GROQ_API_KEY, GROQ_API_URL, GROQ_MODEL } from '../src/config';

// Enable layout animation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Define Interfaces
interface ProposedChange {
  type: 'create' | 'modify';
  path?: string;
  content: string;
  id: string;
  language?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'confirmation';
  content: string;
  proposedChange?: ProposedChange;
  id?: string;
  timestamp?: number;
}

interface ProjectFile {
  name: string;
  path: string;
  content: string;
  isDirectory: boolean;
  children?: ProjectFile[]; // Always present for directories
  lastModified?: number;
  size?: number;
  language?: string;
}

// Utility: Build a tree from flat projectFiles
function buildFileTree(files: ProjectFile[]): ProjectFile[] {
  const pathMap: { [path: string]: ProjectFile } = {};
  const roots: ProjectFile[] = [];

  // Clone and clear children
  files.forEach(file => {
    pathMap[file.path] = { ...file, children: file.isDirectory ? [] : undefined };
  });

  Object.values(pathMap).forEach(file => {
    const parentPath = file.path.substring(0, file.path.lastIndexOf('/'));
    if (parentPath && pathMap[parentPath]) {
      if (!pathMap[parentPath].children) pathMap[parentPath].children = [];
      pathMap[parentPath].children!.push(file);
    } else {
      roots.push(file);
    }
  });

  // Sort: directories first, then files, both alphabetically
  function sortFiles(arr: ProjectFile[]) {
    arr.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    arr.forEach(f => f.children && sortFiles(f.children));
  }
  sortFiles(roots);

  return roots;
}

// Theme Constants
const EDITOR_THEME = {
  background: '#1e1e1e',
  text: '#d4d4d4',
  comment: '#6a9955',
  string: '#ce9178',
  keyword: '#569cd6',
  variable: '#9cdcfe',
  function: '#dcdcaa',
  className: '#4ec9b0',
  constant: '#4fc1ff',
  operator: '#d4d4d4',
  lineNumber: '#858585',
  lineNumberBackground: '#2d2d2d',
  gutter: '#252526',
  selection: '#264f78',
  cursor: '#a6a6a6',
  activeLine: '#2a2a2a'
};

// System Prompts
const SYSTEM_PROMPT: ChatMessage = {
  role: 'system',
  content: `أنت Bright AI Coder، مساعد ذكي متخصص في إنشاء وتعديل الأكواد البرمجية.

# المهام الرئيسية:
- تحليل الكود وإنتاج حلول عالية الجودة وفق أحدث المعايير
- دعم مختلف لغات البرمجة وأطر العمل بكفاءة
- اقتراح تحسينات ذكية وحل المشكلات البرمجية

# صيغة الإخراج:
[CREATE_FILE:/path/to/file.ext]
\`\`\`[language]
محتوى الملف
\`\`\`

[MODIFY_EDITOR]
\`\`\`[language]
المحتوى الجديد
\`\`\`

# معايير الجودة:
- كفاءة: أداء محسّن وسرعة أعلى
- مقروئية: كود واضح وسهل الصيانة
- أمان: تجنب الثغرات المعروفة واتباع أفضل الممارسات
- قابلية التوسعة: حلول قابلة للتطوير والتكيف
- توثيق: تعليقات مناسبة ضمن الكود

# قيود هامة:
- لا تكتب أوامر تثبيت أو تشغيل (npm, pip, bash، إلخ)
- لا تضيف نصوص خارج كتل الكود المحددة
- اكتب المحتوى الكامل للملف في كل كتلة كود

# مهارات متخصصة:
- تحسين الكود وإصلاح الأخطاء 
- تحويل الكود بين اللغات
- تبسيط التعقيدات البرمجية
- اقتراح أنماط تصميم وهياكل مناسبة
`
};

const WELCOME_PROMPT: ChatMessage = {
  role: 'assistant',
  content: `مرحباً! أنا مساعدك البرمجي Bright AI coder !. هذه بعض التعليمات:
- إنشاء مكونات ومشاريع جديدة
- اذا اردت تعديل او تحديد ملف محدد موجود  في الملفات استخدم "@اسم_الملف" مثال :@app.js قم بتحسين الملف التالي
-  الطلبات اللتي  حدود الاستخدام لدينا سيتم تقسيم طلبك وتقليلة
- لتجنب القطة السابقة قم بتقسيم طلبك وتحديده في كل رسالة كي تظهر لك أفضل النتائج
استمتع`,
  id: `welcome-${Date.now()}`,
  timestamp: Date.now()
};

// Utility Functions
const detectLanguage = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const languageMap: {[key: string]: string} = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    css: 'css', html: 'html', json: 'json', py: 'python', java: 'java',
    rb: 'ruby', php: 'php', c: 'c', cpp: 'cpp', cs: 'csharp', go: 'go',
    rs: 'rust', swift: 'swift', kt: 'kotlin', md: 'markdown', yml: 'yaml',
    yaml: 'yaml', xml: 'xml', sql: 'sql', sh: 'bash', bash: 'bash', dart: 'dart'
  };
  return languageMap[ext] || 'plaintext';
};

const getExtensionColor = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const colorMap: {[key: string]: string} = {
    js: '#F0DB4F', jsx: '#61DAFB', ts: '#007ACC', tsx: '#007ACC',
    css: '#264DE4', html: '#E34F26', json: '#1E1E1E', py: '#3572A5',
    java: '#B07219', rb: '#CC342D', php: '#4F5D95', c: '#555555',
    cpp: '#F34B7D', cs: '#178600', go: '#00ADD8', rs: '#DEA584',
    swift: '#FFAC45', kt: '#F88909', dart: '#00B4AB', vue: '#41B883',
    md: '#083fa1'
  };
  return ext && colorMap[ext] ? colorMap[ext] : COLORS.secondary;
};

const getFileIcon = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const iconMap: {[key: string]: string} = {
    js: 'javascript', jsx: 'react', ts: 'language-typescript', tsx: 'language-typescript',
    css: 'language-css3', html: 'language-html5', json: 'code-json', py: 'language-python',
    java: 'language-java', rb: 'language-ruby', php: 'language-php', c: 'language-c',
    cpp: 'language-cpp', cs: 'language-csharp', md: 'markdown', txt: 'file-document-outline',
    pdf: 'file-pdf-box', jpg: 'file-image', jpeg: 'file-image', png: 'file-image',
    gif: 'file-image', svg: 'file-image', mp3: 'file-music', mp4: 'file-video',
    zip: 'zip-box', rar: 'zip-box', default: 'file-code'
  };
  return ext && iconMap[ext] ? iconMap[ext] : iconMap.default;
};

// دالة تقسيم النص الطويل إلى أجزاء صغيرة
function splitTextByLength(text: string, maxLen: number): string[] {
  const parts = [];
  let i = 0;
  while (i < text.length) {
    parts.push(text.slice(i, i + maxLen));
    i += maxLen;
  }
  return parts;
}

// دالة استبدال @اسم_الملف بمحتوى الملف من projectFiles
function replaceFileMentions(text: string, files: ProjectFile[], maxLen = 2000): string {
  return text.replace(/@([^\s]+)/g, (match, fileName) => {
    const file = files.find(f => f.name === fileName || f.path.endsWith('/' + fileName));
    if (file && file.content) {
      // إذا كان الملف كبير، خذ أول maxLen حرف فقط
      let snippet = file.content.slice(0, maxLen);
      if (file.content.length > maxLen) snippet += '\n...تم اقتطاع باقي الملف...';
      return `\n[محتوى الملف: ${file.name}]\n\`\`\`${file.language || detectLanguage(file.name)}\n${snippet}\n\`\`\`\n`;
    }
    return match; // إذا لم يوجد الملف، اترك النص كما هو
  });
}

// 1. أضف دالة لتحليل رد الذكاء الاصطناعي واستخراج التعديلات لكل ملف
function extractProposedChangesFromAIResponse(responseContent: string): ProposedChange[] {
  // يبحث عن كتل [CREATE_FILE:/path] أو [MODIFY_EDITOR] مع كود Markdown
  const regex = /\[(CREATE_FILE|MODIFY_EDITOR)(?::([^\]]+))?\][\s\S]*?```(\w+)?\n([\s\S]*?)```/g;
  const changes: ProposedChange[] = [];
  let match;
  let idx = 0;
  while ((match = regex.exec(responseContent)) !== null) {
    const type = match[1] === 'CREATE_FILE' ? 'create' : 'modify';
    const path = match[2] || undefined;
    const language = match[3] || undefined;
    const content = match[4] || '';
    changes.push({
      type,
      path,
      content,
      id: `proposal-${Date.now()}-${idx++}`,
      language,
    });
  }
  return changes;
}

const ProgrammingScreen = () => {
  // State
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [assistantVisible, setAssistantVisible] = useState(true);
  const [outputVisible, setOutputVisible] = useState(false);
  const [fileBrowserVisible, setFileBrowserVisible] = useState(false);
  const [currentFile, setCurrentFile] = useState<ProjectFile | null>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [outputContent, setOutputContent] = useState('');
  const [assistantInput, setAssistantInput] = useState('');
  const [currentCode, setCurrentCode] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([WELCOME_PROMPT]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [editorLanguage, setEditorLanguage] = useState('typescript');
  const [savedCodeHistory, setSavedCodeHistory] = useState<string[]>([]);
  const [historyCursor, setHistoryCursor] = useState(-1);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [executionErrors, setExecutionErrors] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<{ [path: string]: boolean }>({}); // <-- add this line

  // Refs
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const editorRef = useRef<TextInput>(null);
  const outputPanelRef = useRef<ScrollView>(null);
  const assistantInputRef = useRef<TextInput>(null);
  const outputPanelHeight = useRef(new Animated.Value(0)).current;
  const panelDividerPosition = useRef(new Animated.Value(dimensions.height * 0.6)).current;

  // Memoized values
  const isSmallScreen = useMemo(() => dimensions.width < 380, [dimensions]);
  const isLandscape = useMemo(() => dimensions.width > dimensions.height, [dimensions]);

  // Pan Responder for resizable panel
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        if (gesture.moveY > 100 && gesture.moveY < dimensions.height - 200) {
          panelDividerPosition.setValue(gesture.moveY);
        }
      },
      onPanResponderRelease: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
    })
  ).current;

  // Output Panel Animation
  const showOutputPanel = useCallback(() => {
    setOutputVisible(true);
    Animated.timing(outputPanelHeight, {
      toValue: dimensions.height * 0.3,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [dimensions.height]);

  const hideOutputPanel = useCallback(() => {
    Animated.timing(outputPanelHeight, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => setOutputVisible(false));
  }, []);

  // Handle Orientation Changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription.remove();
  }, []);

  // Keyboard Handling
  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates?.height || 0);
      if (flatListRef.current && chatMessages.length > 0) {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });

    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, [chatMessages.length]);

  // Allow system RTL settings
  useEffect(() => {
    I18nManager.allowRTL(true);
  }, []);

  // File System Operations
  const createDirectoryIfNotExists = async (path: string) => {
    try {
      const dir = path.substring(0, path.lastIndexOf('/'));
      if (dir) {
        console.log(`Creating directory: ${dir}`);
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists) {
          throw new Error(`Failed to create directory: ${dir}`);
        }
        console.log(`Directory created successfully: ${dir}`);
        return true;
      }
      return true;
    } catch (e: any) {
      console.error(`Error creating directory: ${path}`, e);
      throw new Error(`فشل في إنشاء المجلد: ${path.substring(0, path.lastIndexOf('/'))}. الخطأ: ${e.message}`);
    }
  };

  const saveFile = async (path: string, content: string) => {
    try {
      const fullPath = path.startsWith('/') 
        ? `${FileSystem.documentDirectory}${path.substring(1)}` 
        : `${FileSystem.documentDirectory}${path}`;
      
      console.log(`Saving file to: ${fullPath}`);
      
      if (!FileSystem.documentDirectory || !fullPath.startsWith(FileSystem.documentDirectory)) {
        throw new Error(`مسار غير صالح: ${fullPath}`);
      }

      await createDirectoryIfNotExists(fullPath);
      await FileSystem.writeAsStringAsync(fullPath, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const fileName = path.split('/').pop() || '';
      const language = detectLanguage(fileName);
      console.log(`File saved successfully: ${fileName}, Language: ${language}`);
      
      updateProjectFiles(fullPath, content, false, language);

      if (!currentFile || currentFile.path !== fullPath) {
        setCurrentFile({
          name: fileName,
          path: fullPath,
          content,
          isDirectory: false,
          language,
          lastModified: Date.now(),
          size: content.length,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addSystemMessage(`تم حفظ الملف بنجاح: ${fileName}`);
      return true;
    } catch (error: any) {
      console.error(`Error saving file: ${path}`, error);
      Alert.alert("خطأ في الحفظ", `لم يتم حفظ الملف: ${error.message || error}`);
      addSystemMessage(`فشل حفظ الملف: ${path}. الخطأ: ${error.message || error}`);
      return false;
    }
  };

  const updateProjectFiles = useCallback((
    path: string,
    content: string,
    isDirectory: boolean,
    language: string = 'plaintext'
  ) => {
    const fileName = path.split('/').pop() || '';
    const updatedFiles = [...projectFiles];

    // --- Begin directory structure handling ---
    function ensureDirectoryStructure(fullPath: string) {
      const dirs: string[] = [];
      let dirPath = fullPath;
      while (dirPath.lastIndexOf('/') > 0) {
        dirPath = dirPath.substring(0, dirPath.lastIndexOf('/'));
        if (dirPath && !updatedFiles.some(f => f.path === dirPath && f.isDirectory)) {
          dirs.unshift(dirPath);
        }
      }
      // Add missing directories
      for (const dir of dirs) {
        const dirName = dir.split('/').pop() || '';
        updatedFiles.push({
          name: dirName,
          path: dir,
          content: '',
          isDirectory: true,
          children: [],
          lastModified: Date.now(),
          size: 0,
          language: undefined,
        });
      }
    }

    if (!isDirectory) {
      ensureDirectoryStructure(path);
    }
    // --- End directory structure handling ---

    const existingFileIndex = updatedFiles.findIndex(file => file.path === path);

    if (existingFileIndex >= 0) {
      updatedFiles[existingFileIndex] = {
        ...updatedFiles[existingFileIndex],
        content,
        lastModified: Date.now(),
        size: content.length,
        language
      };
    } else {
      updatedFiles.push({
        name: fileName,
        path,
        content,
        isDirectory,
        lastModified: Date.now(),
        size: content.length,
        language
      });
    }

    updatedFiles.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    setProjectFiles(updatedFiles);
  }, [projectFiles]);

  const openFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file) return;

      if (currentCode) saveCodeToHistory();

      const fileContent = await FileSystem.readAsStringAsync(file.uri);
      const language = detectLanguage(file.name);
      const newFile = {
        name: file.name,
        path: file.uri,
        content: fileContent,
        isDirectory: false,
        lastModified: Date.now(),
        size: fileContent.length,
        language
      };

      setCurrentFile(newFile);
      setCurrentCode(fileContent);
      setEditorLanguage(language);
      updateProjectFiles(file.uri, fileContent, false, language);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert("خطأ", "فشل في فتح الملف");
    }
  };

  // Code History Management
  const saveCodeToHistory = useCallback(() => {
    setSavedCodeHistory(prev => {
      const newHistory = [currentCode, ...prev.slice(0, 49)];
      setHistoryCursor(0);
      return newHistory;
    });
  }, [currentCode]);

  const handleUndo = useCallback(() => {
    if (savedCodeHistory.length === 0 || historyCursor >= savedCodeHistory.length - 1) {
      if (historyCursor === -1 && savedCodeHistory.length === 0) {
        saveCodeToHistory();
        setHistoryCursor(0);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const nextCursor = historyCursor + 1;
    setCurrentCode(savedCodeHistory[nextCursor]);
    setHistoryCursor(nextCursor);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [savedCodeHistory, historyCursor]);

  const handleRedo = useCallback(() => {
    if (historyCursor <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const nextCursor = historyCursor - 1;
    setCurrentCode(savedCodeHistory[nextCursor]);
    setHistoryCursor(nextCursor);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [savedCodeHistory, historyCursor]);

  // AI-Assisted Operations
  const handleAISave = useCallback(() => {
    if (!currentCode.trim()) {
      Alert.alert("تنبيه", "المحرر فارغ. الرجاء كتابة بعض الكود أولاً.");
      return;
    }

    Alert.alert(
      "حفظ ذكي",
      "هل تريد من المساعد الذكي فحص الكود قبل الحفظ؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "فحص وحفظ",
          onPress: async () => {
            setIsLoadingAI(true);
            const reviewPrompt: ChatMessage = {
              role: 'user',
              content: `قم بفحص الكود التالي وابحث عن الأخطاء أو التحسينات الممكنة:\n\`\`\`${editorLanguage}\n${currentCode}\n\`\`\``,
              id: `review-${Date.now()}`,
              timestamp: Date.now()
            };

            await handleSendMessage(reviewPrompt);
            if (currentFile) {
              await saveFile(currentFile.path, currentCode);
            } else {
              promptCreateNewFile();
            }
          }
        },
        {
          text: "حفظ مباشرة",
          onPress: async () => {
            if (currentFile) {
              await saveFile(currentFile.path, currentCode);
            } else {
              promptCreateNewFile();
            }
          }
        }
      ]
    );
  }, [currentCode, currentFile, editorLanguage]);

  const handleAIUndo = useCallback(() => {
    Alert.alert(
      "تراجع ذكي",
      "هل تريد من المساعد الذكي مراجعة التغييرات قبل التراجع؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "مراجعة والتراجع",
          onPress: async () => {
            setIsLoadingAI(true);
            const reviewPrompt: ChatMessage = {
              role: 'user',
              content: `قم بمراجعة التغييرات في الكود الحالي مقارنة بالنسخة السابقة:\nالحالي:\n\`\`\`${editorLanguage}\n${currentCode}\n\`\`\`\nالسابق:\n\`\`\`${editorLanguage}\n${savedCodeHistory[historyCursor + 1] || ''}\n\`\`\``,
              id: `undo-review-${Date.now()}`,
              timestamp: Date.now()
            };

            await handleSendMessage(reviewPrompt);
            handleUndo();
          }
        },
        {
          text: "تراجع مباشرة",
          onPress: handleUndo
        }
      ]
    );
  }, [currentCode, savedCodeHistory, historyCursor, editorLanguage, handleUndo]);

  // System Messages
  const addSystemMessage = useCallback((content: string) => {
    const uniqueId = `system-${Date.now()}-${Math.random()}`; // ضمان التفرد
    const systemMessage: ChatMessage = {
      role: 'assistant',
      content: `[نظام] ${content}`,
      id: uniqueId,
      timestamp: Date.now()
    };
    setChatMessages(prev => [...prev, systemMessage]);
  }, []);

  // Create New File
  const promptCreateNewFile = useCallback(() => {
    Alert.prompt(
      "إنشاء ملف جديد",
      "أدخل اسم الملف مع المسار (مثال: my_folder/app.js)",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إنشاء",
          onPress: (text) => {
            if (!text) return;
            const fileName = text.includes('/') ? text.split('/').pop() || text : text;
            const language = detectLanguage(fileName);
            let template = '';
            const ext = fileName.split('.').pop()?.toLowerCase();

            switch (ext) {
              case 'js':
                template = '// JavaScript file\nconsole.log("Hello, World!");\n';
                break;
              case 'tsx':
                template = 'import React from \'react\';\n\ninterface Props {\n  name?: string;\n}\n\nconst Component: React.FC<Props> = ({ name = "World" }) => {\n  return <h1>Hello, {name}!</h1>;\n};\n\nexport default Component;\n';
                break;
              case 'css':
                template = '/* CSS Styles */\nbody {\n  font-family: Arial, sans-serif;\n  margin: 0;\n  padding: 20px;\n}\n';
                break;
              case 'html':
                template = '<!DOCTYPE html>\n<html>\n<head>\n  <title>New Page</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n</body>\n</html>\n';
                break;
            }

            const fullPath = text.startsWith('/') ? text : `/${text}`;
            saveFile(fullPath, template);
            setCurrentCode(template);
            setEditorLanguage(language);
            setCurrentFile({
              name: fileName,
              path: fullPath,
              content: template,
              isDirectory: false,
              language,
              lastModified: Date.now(),
              size: template.length
            });
          }
        }
      ],
      "plain-text"
    );
  }, []);

  // Auto-create Project Structure for Complex Tasks
  const createChatbotStructure = useCallback(async () => {
    const projectStructure = [
      {
        path: '/chatbot/src/App.tsx',
        content: `import React, { useState } from 'react';
import { View, TextInput, FlatList, Text, StyleSheet } from 'react-native';

const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { id: Date.now(), text: input, isUser: true }]);
      setInput('');
      // Add AI response logic here
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <View style={[styles.message, item.isUser ? styles.userMessage : styles.botMessage]}>
            <Text>{item.text}</Text>
          </View>
        )}
        keyExtractor={item => item.id.toString()}
      />
      <TextInput
        style={styles.input}
        value={input}
        onChangeText={setInput}
        onSubmitEditing={handleSend}
        placeholder="اكتب رسالتك..."
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  message: { padding: 10, margin: 5, borderRadius: 5 },
  userMessage: { backgroundColor: '#007AFF', alignSelf: 'flex-end' },
  botMessage: { backgroundColor: '#E5E5EA', alignSelf: 'flex-start' },
  input: { borderWidth: 1, padding: 10, borderRadius: 5 }
});

export default App;`,
        language: 'typescript'
      },
      {
        path: '/chatbot/src/styles.css',
        content: `/* Chatbot Styles */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.message {
  max-width: 80%;
  margin: 5px;
  padding: 10px;
  border-radius: 10px;
}
.user-message {
  background-color: #007AFF;
  color: white;
  align-self: flex-end;
}
.bot-message {
  background-color: #E5E5EA;
  align-self: flex-start;
}`,
        language: 'css'
      }
    ];

    let createdFiles: ProjectFile[] = [];
    let failedFiles: string[] = [];

    for (const file of projectStructure) {
      try {
        await saveFile(file.path, file.content);
        const fileInfo = await FileSystem.getInfoAsync(
          `${FileSystem.documentDirectory}${file.path.replace(/^\//, '')}`
        );
        if (fileInfo.exists && !fileInfo.isDirectory) {
          createdFiles.push({
            name: file.path.split('/').pop() || '',
            path: file.path,
            content: file.content,
            isDirectory: false,
            language: file.language,
            lastModified: Date.now(),
            size: file.content.length
          });
        } else {
          failedFiles.push(file.path);
        }
      } catch (error: any) {
        failedFiles.push(file.path);
      }
    }

    setProjectFiles(prevFiles => {
      const allFiles = [...prevFiles, ...createdFiles];
      const uniqueFiles = allFiles.filter(
        (file, idx, arr) => arr.findIndex(f => f.path === file.path) === idx
      );
      return uniqueFiles;
    });

    if (failedFiles.length > 0) {
      addSystemMessage(`بعض الملفات لم تُنشأ: ${failedFiles.join(', ')}`);
    }
    if (createdFiles.length > 0) {
      addSystemMessage("تم إنشاء هيكلية الشات بوت بنجاح!");
      setFileBrowserVisible(true);
    }
  }, []);

  // Run Code
  const handleRunCode = useCallback(() => {
    if (!currentCode.trim()) {
      Alert.alert("تنبيه", "المحرر فارغ. الرجاء كتابة بعض الكود أولاً.");
      return;
    }

    setIsRunning(true);
    setExecutionErrors(null);

    setTimeout(() => {
      try {
        const result = simulateCodeExecution(currentCode, editorLanguage);
        setOutputContent(result);
        showOutputPanel();
      } catch (error: any) {
        setExecutionErrors(error.message);
        setOutputContent(`خطأ: ${error.message}`);
        showOutputPanel();
      } finally {
        setIsRunning(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 800);
  }, [currentCode, editorLanguage, showOutputPanel]);

  const simulateCodeExecution = (code: string, language: string) => {
    let output = '';
    const processingStart = Date.now();

    switch (language) {
      case 'javascript':
      case 'typescript':
        if (code.includes('console.log')) {
          output = 'تم تنفيذ الكود بنجاح.\n----- المخرجات -----\n';
          const logs = code.match(/console\.log\((.*?)\)/g) || [];
          logs.forEach(log => {
            const content = log.match(/console\.log\((.*?)\)/)?.[1] || '';
            output += `> ${content.replace(/["'`]/g, '')}\n`;
          });
        } else {
          output = 'تم تنفيذ الكود بنجاح.\n----- المخرجات -----\n> لا توجد مخرجات ظاهرة\n';
        }
        break;
      case 'html':
        output = 'تم تحميل الصفحة بنجاح.\n----- معلومات -----\n';
        const headings = (code.match(/<h[1-6][^>]*>/g) || []).length;
        output += `> تحليل هيكل الصفحة:\n${headings > 0 ? `> - ${headings} عنوان\n` : ''}`;
        break;
      case 'css':
        output = 'تم تحليل CSS بنجاح.\n----- معلومات -----\n';
        const selectors = (code.match(/[^{]+{/g) || []).length;
        output += `> تم تعريف ${selectors} منتقي\n`;
        break;
      default:
        output = 'تم تنفيذ الكود بنجاح.\n----- المخرجات -----\n> لا توجد مخرجات محددة\n';
    }

    const processingTime = Date.now() - processingStart;
    output += `\n----- إحصائيات -----\n> وقت التنفيذ: ${processingTime}ms\n`;
    return output;
  };

  // AI Chat
  const handleSendMessage = useCallback(async (overrideMessage?: ChatMessage) => {
    const message = overrideMessage || { 
      role: 'user', 
      content: assistantInput, 
      id: `user-${Date.now()}`, 
      timestamp: Date.now()
    };

    if (!message.content.trim()) return;
    if (!GROQ_API_KEY) {
      addSystemMessage("خطأ: مفتاح API مفقود");
      return;
    }

    // استبدال @اسم_الملف بمحتوى الملف المناسب قبل إرسال الرسالة
    const replacedContent = replaceFileMentions(message.content, projectFiles);

    const currentMessages = [...chatMessages, { ...message, content: replacedContent }];
    setChatMessages(currentMessages);
    if (!overrideMessage) setAssistantInput('');
    setIsLoadingAI(true);

    setTimeout(() => assistantInputRef.current?.focus(), 100);

    // Check for complex project creation (e.g., chatbot)
    if (projectFiles.length === 0 && replacedContent.toLowerCase().includes('شات بوت')) {
      await createChatbotStructure();
      setIsLoadingAI(false);
      return;
    }

    // تقسيم الرسالة إذا كانت كبيرة جدا أو فيها عدة ملفات
    const MAX_PART_LENGTH = 4000;
    // --- تعديل هنا: إذا كان الطلب كبير (أكثر من 5 ملفات مطلوبة أو أكثر من 10000 حرف) ---
    // استخدم extractProposedChangesFromAIResponse لتقدير عدد الملفات المطلوبة من الطلب
    let estimatedFileCount = 0;
    const fileMentionMatches = replacedContent.match(/\[CREATE_FILE:([^\]]+)\]/g);
    if (fileMentionMatches) estimatedFileCount = fileMentionMatches.length;
    if (estimatedFileCount > 5 || replacedContent.length > 10000) {
      // قسم الطلب تلقائياً: أرسل لكل ملف طلب منفصل
      // استخرج أسماء الملفات من الطلب
      const fileNames = [];
      const regex = /\[CREATE_FILE:([^\]]+)\]/g;
      let match;
      while ((match = regex.exec(replacedContent)) !== null) {
        fileNames.push(match[1]);
      }
      if (fileNames.length > 0) {
        setChatMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `الطلب كبير ويحتوي على عدة ملفات (${fileNames.length}). سيتم تقسيم الطلب تلقائياً، وسيتم إنشاء كل ملف على حدة.`,
            id: `split-info-${Date.now()}`,
            timestamp: Date.now()
          }
        ]);
        // أرسل لكل ملف طلب منفصل
        for (const fileName of fileNames) {
          const singleFilePrompt: ChatMessage = {
            role: 'user',
            content: `أنشئ فقط كود الملف التالي: ${fileName}\nولا تكتب أي شرح، فقط الكود مع التنسيق المطلوب.`,
            id: `split-file-${fileName}-${Date.now()}`,
            timestamp: Date.now()
          };
          await handleSendMessage(singleFilePrompt);
        }
        setIsLoadingAI(false);
        return;
      }
    }
    // --- نهاية التعديل ---

    const contentParts = splitTextByLength(replacedContent, MAX_PART_LENGTH);

    let allResponses: string[] = [];

    for (let idx = 0; idx < contentParts.length; idx++) {
      const part = contentParts[idx];
      // إعداد الرسائل حسب تنسيق OpenAI/GROQ
      const messagesForAPI = [
        { role: 'system', content: SYSTEM_PROMPT.content },
        ...currentMessages
          .filter(msg => msg.role === 'user' || msg.role === 'assistant')
          .slice(-5)
          .map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          })),
        { role: 'user', content: part }
      ];

      try {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: messagesForAPI,
            temperature: 0.5,
          }),
        });

        if (!response.ok) {
          if (response.status === 400) {
            setChatMessages(prev => [...prev, {
              role: 'assistant',
              content: `خطأ: الطلب كبير جداً أو غير مدعوم من الذكاء الاصطناعي. حاول تقليل حجم الطلب أو أعد صياغة السؤال.`,
              id: `error-${Date.now()}`,
              timestamp: Date.now()
            }]);
            setIsLoadingAI(false);
            return;
          }
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        // GROQ/OpenAI: الرد في data.choices[0].message.content
        const assistantResponseContent = data.choices?.[0]?.message?.content;
        if (assistantResponseContent) {
          allResponses.push(assistantResponseContent);
        }
      } catch (error: any) {
        console.error('Error in API call:', error);
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `خطأ: ${error.message}`,
          id: `error-${Date.now()}`,
          timestamp: Date.now()
        }]);
        setIsLoadingAI(false);
        return;
      }
    }

    // بعد جمع كل الردود، اعرض كل مقترح كرسالة confirmation منفصلة
    if (allResponses.length > 0) {
      const fullResponse = allResponses.join('\n\n');
      const proposedChanges: ProposedChange[] = extractProposedChangesFromAIResponse(fullResponse);

      // --- منطق الطلب الكبير: إذا كان هناك أكثر من 5 ملفات أو الطلب طويل جداً ---
      if (proposedChanges.length > 5 || fullResponse.length > 10000) {
        // أنشئ فقط هيكل الملفات (ملفات فارغة أو فيها تعليق placeholder)
        const structureOnly: ProposedChange[] = proposedChanges.map(change => ({
          ...change,
          content: `// TODO: أضف الكود هنا لملف ${change.path || ''}\n`,
        }));

        setChatMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `تم إنشاء هيكل المشروع (${structureOnly.length} ملف).\nابدأ الآن بطلب إنشاء كود كل ملف على حدة (مثال: "اكتب كود ملف @اسم_الملف").`,
            id: `structure-info-${Date.now()}`,
            timestamp: Date.now()
          },
          ...structureOnly.map(change => ({
            role: 'confirmation' as const,
            content: '',
            proposedChange: change,
            id: change.id,
            timestamp: Date.now()
          }))
        ]);
        setIsLoadingAI(false);
        return;
      }
      // --- نهاية منطق الطلب الكبير ---

      if (proposedChanges.length > 0) {
        if (proposedChanges.length > 1) {
          setChatMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: `تم تقسيم التعديلات على ${proposedChanges.length} ملفات. يمكنك حفظ أو التراجع عن كل ملف على حدة.`,
              id: `info-${Date.now()}`,
              timestamp: Date.now()
            }
          ]);
        }
        setChatMessages(prev => [
          ...prev,
          ...proposedChanges.map(change => ({
            role: 'confirmation' as const,
            content: '',
            proposedChange: change,
            id: change.id,
            timestamp: Date.now()
          }))
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: fullResponse,
            id: `assistant-${Date.now()}`,
            timestamp: Date.now()
          }
        ]);
      }
    }

    setIsLoadingAI(false);
  }, [assistantInput, chatMessages, projectFiles, createChatbotStructure]);

  // نسخ الكود إلى الحافظة
  const handleCopyCode = useCallback(async (code: string) => {
    await Clipboard.setStringAsync(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('تم النسخ', 'تم نسخ الكود إلى الحافظة.');
  }, []);

  // استخراج أول كتلة كود من نص
  const extractFirstCodeBlock = (text: string): { code: string, language: string } | null => {
    const match = text.match(/```(\w+)?\n([\s\S]*?)```/);
    if (match) {
      return { code: match[2], language: match[1] || '' };
    }
    return null;
  };

  // Confirmation Handlers
  const handleConfirmChanges = async (proposal: ProposedChange) => {
    const confirmations = chatMessages.filter(msg => msg.role === 'confirmation' && msg.proposedChange);
    // --- تعديل: إذا كان الكود placeholder (يبدأ بـ // TODO:), أعد طلب الكود الحقيقي من المساعد الذكي قبل الحفظ ---
    const isPlaceholder =
      proposal.content.trim().startsWith('// TODO:') ||
      proposal.content.trim().includes('أضف الكود هنا لملف');

    if (isPlaceholder && proposal.type === 'create' && proposal.path) {
      // اطلب من المساعد الذكي كود الملف الحقيقي
      setIsLoadingAI(true);
      const fileName = proposal.path;
      const prompt: ChatMessage = {
        role: 'user',
        content: `اكتب كود ملف @${fileName} فقط بدون شرح، فقط الكود مع التنسيق.`,
        id: `fetch-real-code-${fileName}-${Date.now()}`,
        timestamp: Date.now()
      };
      await handleSendMessage(prompt);
      setIsLoadingAI(false);
      // أزل رسالة التأكيد الحالية (placeholder)
      setChatMessages(prev => prev.filter(msg => msg.id !== proposal.id));
      return;
    }
    // ...existing code...
    if (confirmations.length > 1 && proposal.type === 'create') {
      Alert.alert(
        "تأكيد الحفظ",
        `سيتم إنشاء ${confirmations.length} ملف. هل تريد المتابعة؟`,
        [
          { text: "إلغاء", style: "cancel" },
          {
            text: "حفظ الكل",
            onPress: async () => {
              let results: { path: string, success: boolean, error?: string }[] = [];
              let createdFiles: ProjectFile[] = [];
              for (const msg of confirmations) {
                const prop = msg.proposedChange!;
                // --- تعديل: تخطى الملفات placeholder ---
                const isPlaceholder =
                  prop.content.trim().startsWith('// TODO:') ||
                  prop.content.trim().includes('أضف الكود هنا لملف');
                if (isPlaceholder && prop.type === 'create' && prop.path) {
                  // اطلب الكود الحقيقي من المساعد الذكي
                  setIsLoadingAI(true);
                  const fileName = prop.path;
                  const prompt: ChatMessage = {
                    role: 'user',
                    content: `اكتب كود ملف @${fileName} فقط بدون شرح، فقط الكود مع التنسيق.`,
                    id: `fetch-real-code-${fileName}-${Date.now()}`,
                    timestamp: Date.now()
                  };
                  await handleSendMessage(prompt);
                  setIsLoadingAI(false);
                  continue; // لا تحفظ placeholder
                }
                // ...existing code...
                const formattedPath = prop.path?.startsWith('/') ? prop.path : `/${prop.path}`;
                try {
                  const success = await saveFile(formattedPath!, prop.content);
                  if (success) {
                    const fileInfo = await FileSystem.getInfoAsync(
                      `${FileSystem.documentDirectory}${formattedPath!.replace(/^\//, '')}`
                    );
                    if (fileInfo.exists && !fileInfo.isDirectory) {
                      const fileName = formattedPath!.split('/').pop() || '';
                      const language = prop.language || detectLanguage(fileName);
                      createdFiles.push({
                        name: fileName,
                        path: formattedPath!,
                        content: prop.content,
                        isDirectory: false,
                        language,
                        lastModified: Date.now(),
                        size: prop.content.length
                      });
                      results.push({ path: formattedPath!, success: true });
                    } else {
                      results.push({ path: formattedPath!, success: false, error: "لم يتم العثور على الملف بعد الإنشاء" });
                    }
                  } else {
                    results.push({ path: formattedPath!, success: false, error: "فشل في الحفظ" });
                  }
                } catch (e: any) {
                  results.push({ path: formattedPath!, success: false, error: e.message });
                }
              }
              setProjectFiles(prevFiles => {
                const allFiles = [...prevFiles, ...createdFiles];
                const uniqueFiles = allFiles.filter(
                  (file, idx, arr) => arr.findIndex(f => f.path === file.path) === idx
                );
                return uniqueFiles;
              });
              results.forEach(r => {
                if (r.success) {
                  addSystemMessage(`تم حفظ الملف بنجاح: ${r.path}`);
                } else {
                  addSystemMessage(`فشل حفظ الملف: ${r.path}. الخطأ: ${r.error || "غير معروف"}`);
                }
              });
              setFileBrowserVisible(true);
              const firstSuccess = createdFiles[0];
              if (firstSuccess) {
                setCurrentCode(firstSuccess.content);
                setEditorLanguage(firstSuccess.language || detectLanguage(firstSuccess.name));
                setCurrentFile(firstSuccess);
              }
              setChatMessages(prev => prev.filter(msg => msg.role !== 'confirmation'));
            }
          }
        ]
      );
      return;
    }
    // ...existing code...
    if (proposal.type === 'create' && proposal.path) {
      Alert.alert(
        "تأكيد الحفظ",
        `هل تريد إنشاء الملف '${proposal.path}'؟`,
        [
          { text: "إلغاء", style: "cancel" },
          {
            text: "حفظ",
            onPress: async () => {
              const formattedPath = proposal.path!.startsWith('/') ? proposal.path! : `/${proposal.path!}`;
              try {
                const success = await saveFile(formattedPath, proposal.content);
                if (success) {
                  const fileInfo = await FileSystem.getInfoAsync(
                    `${FileSystem.documentDirectory}${formattedPath.replace(/^\//, '')}`
                  );
                  if (fileInfo.exists && !fileInfo.isDirectory) {
                    const fileName = formattedPath.split('/').pop() || '';
                    const language = proposal.language || detectLanguage(fileName);
                    setProjectFiles(prevFiles => {
                      const exists = prevFiles.some(f => f.path === formattedPath);
                      if (exists) return prevFiles;
                      return [
                        ...prevFiles,
                        {
                          name: fileName,
                          path: formattedPath,
                          content: proposal.content,
                          isDirectory: false,
                          language,
                          lastModified: Date.now(),
                          size: proposal.content.length
                        }
                      ];
                    });
                    setFileBrowserVisible(true);
                    setCurrentCode(proposal.content);
                    setEditorLanguage(language);
                    setCurrentFile({
                      name: fileName,
                      path: formattedPath,
                      content: proposal.content,
                      isDirectory: false,
                      language,
                      lastModified: Date.now(),
                      size: proposal.content.length
                    });
                    addSystemMessage(`تم حفظ الملف بنجاح: ${formattedPath}`);
                  } else {
                    addSystemMessage(`فشل حفظ الملف: ${formattedPath}. الملف غير موجود فعليًا.`);
                  }
                } else {
                  addSystemMessage(`فشل حفظ الملف: ${formattedPath}`);
                }
              } catch (e: any) {
                addSystemMessage(`فشل حفظ الملف: ${formattedPath}. الخطأ: ${e.message}`);
              }
              setChatMessages(prev => prev.filter(msg => msg.id !== proposal.id));
            }
          }
        ]
      );
    } else if (proposal.type === 'modify') {
      saveCodeToHistory();
      setCurrentCode(proposal.content);
      if (proposal.language) setEditorLanguage(proposal.language);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (currentFile) {
        setCurrentFile({
          ...currentFile,
          content: proposal.content,
          lastModified: Date.now(),
          size: proposal.content.length
        });
        saveFile(currentFile.path, proposal.content);
      }
      addSystemMessage("تم تطبيق التغييرات.");
      setChatMessages(prev => prev.filter(msg => msg.id !== proposal.id));
    }
  };

  const handleDiscardChanges = (proposalId: string) => {
    addSystemMessage("تم تجاهل التغييرات.");
    setChatMessages(prev => prev.filter(msg => msg.id !== proposalId));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  // Code Formatting
  const handleFormatCode = useCallback(() => {
    if (!currentCode.trim()) return;
    saveCodeToHistory();

    try {
      let formattedCode = currentCode
        .replace(/\n{3,}/g, '\n\n')
        .replace(/{\s*\n/g, '{\n')
        .replace(/\n\s*}/g, '\n}')
        .replace(/;\s*\n/g, ';\n')
        .replace(/([(){}[\],;])\s*/g, '$1 ');

      setCurrentCode(formattedCode);
      if (currentFile) {
        setCurrentFile({
          ...currentFile,
          content: formattedCode,
          lastModified: Date.now()
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error formatting code:', error);
      Alert.alert("خطأ في التنسيق", "لم يتم تنسيق الكود.");
    }
  }, [currentCode, currentFile]);

  // Render Functions
  const renderChatMessage = useCallback(({ item }: { item: ChatMessage }) => {
    if (item.role === 'system' || item.role === 'user') return null;

    // فقط رسائل المساعد الذكي (assistant) التي تحتوي على كود
    if (item.role === 'assistant') {
      const codeBlock = extractFirstCodeBlock(item.content);
      // استخراج اسم الملف من الكود إذا كان موجودًا في النص (مثلاً: [CREATE_FILE:/path/to/file.js])
      let fileName = '';
      const fileMatch = item.content.match(/\[CREATE_FILE:([^\]]+)\]/);
      if (fileMatch) fileName = fileMatch[1];

      if (codeBlock) {
        return (
          <Animated.View style={[styles.chatMessage, styles.assistantMessage]}>
            {fileName ? (
              <Text style={[styles.codePreviewText, { marginBottom: 6 }]} selectable>
                {fileName}
              </Text>
            ) : null}
            <ScrollView style={styles.codePreviewScroll} horizontal>
              <Text style={styles.codePreviewText} selectable>{codeBlock.code}</Text>
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <TouchableOpacity
                style={styles.copyCodeButton}
                onPress={() => handleCopyCode(codeBlock.code)}
              >
                <Feather name="copy" size={16} color="#fff" />
                <Text style={styles.copyCodeButtonText}>نسخ الكود</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.copyCodeButton, { backgroundColor: '#2e7d32', marginLeft: 8 }]}
                onPress={() => {
                  // إنشاء مقترح حفظ وهمي (confirmation) لهذا الكود
                  setChatMessages(prev => [
                    ...prev,
                    {
                      role: 'confirmation',
                      content: '',
                      proposedChange: {
                        type: 'create',
                        path: fileName || `file-${Date.now()}.txt`,
                        content: codeBlock.code,
                        id: `proposal-save-${Date.now()}`,
                        language: codeBlock.language,
                      },
                      id: `proposal-save-${Date.now()}`,
                      timestamp: Date.now()
                    }
                  ]);
                }}
              >
                <Feather name="save" size={16} color="#fff" />
                <Text style={styles.copyCodeButtonText}>حفظ</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        );
      }
      return null;
    }

    // رسائل التأكيد (confirmation) كما هي
    if (item.role === 'confirmation' && item.proposedChange) {
      const proposal = item.proposedChange;
      return (
        <Animated.View style={[styles.confirmationMessageContainer, { opacity: 1 }]}>
          <Text style={styles.confirmationText}>
            {proposal.type === 'create'
              ? `ملف جديد: ${proposal.path}\n`
              : 'تعديل المحرر:'}
          </Text>
          {proposal.content && (
            <ScrollView style={styles.codePreviewScroll} horizontal={isSmallScreen}>
              <Text style={styles.codePreviewText} selectable>{proposal.content}</Text>
            </ScrollView>
          )}
          <View style={styles.confirmationButtons}>
            <TouchableOpacity
              style={[styles.confirmationButton, styles.saveButton]}
              onPress={() => handleConfirmChanges(proposal)}
            >
              <Text style={styles.confirmationButtonText}>حفظ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmationButton, styles.undoButton]}
              onPress={() => handleDiscardChanges(proposal.id)}
            >
              <Text style={styles.confirmationButtonText}>تراجع</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      );
    }

    return null;
  }, [isSmallScreen, handleCopyCode, handleConfirmChanges, handleDiscardChanges]);

  const renderFileItem = useCallback(
    ({ item, level = 0 }: { item: ProjectFile; level?: number }) => {
      const isSelected = currentFile?.path === item.path;
      const isDir = item.isDirectory;
      const expanded = expandedDirs[item.path] || false; // <-- use expandedDirs

      return (
        <View>
          <TouchableOpacity
            style={[
              styles.fileItem,
              isSelected && styles.selectedFileItem,
              { paddingLeft: 16 + (level || 0) * 16 }
            ]}
            onPress={() => {
              if (isDir) {
                setExpandedDirs(prev => ({
                  ...prev,
                  [item.path]: !prev[item.path]
                }));
              } else {
                if (currentFile && currentFile.path !== item.path && currentCode) {
                  saveCodeToHistory();
                }
                setCurrentFile(item);
                setCurrentCode(item.content);
                setEditorLanguage(item.language || detectLanguage(item.name));
                setFileBrowserVisible(false);
              }
            }}
          >
            <View style={[styles.fileIcon, { backgroundColor: getExtensionColor(item.name) }]}>
              <FontAwesome
                name={isDir ? 'folder' : (getFileIcon(item.name) as any)}
                size={16}
                color="#fff"
              />
            </View>
            <View style={styles.fileItemContent}>
              <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                {item.name}
              </Text>
              {!isDir && (
                <Text style={styles.fileDetails}>
                  {item.size ? `${Math.round(item.size / 1024 * 10) / 10}KB` : '0KB'} •{' '}
                  {item.lastModified ? new Date(item.lastModified).toLocaleTimeString() : ''}
                </Text>
              )}
            </View>
            {isDir && (
              <Feather
                name={expanded ? 'chevron-down' : 'chevron-right'}
                size={16}
                color="#fff"
                style={{ marginLeft: 8 }}
              />
            )}
          </TouchableOpacity>
          {isDir && expanded && item.children && item.children.length > 0 && (
            <View>
              {item.children.map(child =>
                renderFileItem({ item: child, level: (level || 0) + 1 })
              )}
            </View>
          )}
        </View>
      );
    },
    [currentFile, currentCode, setCurrentFile, setCurrentCode, setEditorLanguage, setFileBrowserVisible, saveCodeToHistory, expandedDirs]
  );

  const renderSettingsModal = useCallback(() => (
    <Modal
      visible={showSettingsModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowSettingsModal(false)}
    >
      <View style={styles.settingsModal}>
        <View style={styles.settingsContent}>
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsTitle}>الإعدادات</Text>
            <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
              <Text style={styles.settingsCloseButton}>إغلاق</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>السمة</Text>
            <View style={styles.themeButtons}>
              <TouchableOpacity
                style={[styles.themeButton, theme === 'light' && styles.activeThemeButton]}
                onPress={() => setTheme('light')}
              >
                <Text style={styles.themeButtonText}>فاتح</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themeButton, theme === 'dark' && styles.activeThemeButton]}
                onPress={() => setTheme('dark')}
              >
                <Text style={styles.themeButtonText}>داكن</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>حجم الخط</Text>
            <View style={styles.fontSizeControls}>
              <TouchableOpacity
                style={styles.fontSizeButton}
                onPress={() => setFontSize(prev => Math.max(10, prev - 1))}
              >
                <Text>-</Text>
              </TouchableOpacity>
              <Text>{fontSize}px</Text>
              <TouchableOpacity
                style={styles.fontSizeButton}
                onPress={() => setFontSize(prev => Math.min(24, prev + 1))}
              >
                <Text>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>أرقام الأسطر</Text>
            <TouchableOpacity
              style={[styles.switch, showLineNumbers && styles.switchActive]}
              onPress={() => setShowLineNumbers(!showLineNumbers)}
            >
              <View style={[styles.switchThumb, showLineNumbers && styles.switchThumbActive]} />
            </TouchableOpacity>
          </View>
          <View style={[styles.settingItem, { flexDirection: 'column', alignItems: 'flex-start' }]}>
            <Text style={[styles.settingLabel, { marginBottom: 8 }]}>إجراءات سريعة</Text>
            <View style={styles.settingsActionGrid}>
              <TouchableOpacity
                style={styles.settingsActionButton}
                onPress={handleRunCode}
                disabled={isRunning}
              >
                <Feather name="play" size={18} color="#3f51b5" />
                <Text style={styles.settingsActionButtonText}>
                  {isRunning ? 'جارٍ...' : 'تشغيل'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsActionButton}
                onPress={handleAISave}
              >
                <Ionicons name="save-outline" size={18} color="#3f51b5" />
                <Text style={styles.settingsActionButtonText}>حفظ ذكي</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsActionButton}
                onPress={handleAIUndo}
              >
                <Ionicons name="git-branch-outline" size={18} color="#3f51b5" />
                <Text style={styles.settingsActionButtonText}>تراجع ذكي</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsActionButton}
                onPress={handleRedo}
              >
                <Feather name="rotate-cw" size={18} color="#3f51b5" />
                <Text style={styles.settingsActionButtonText}>إعادة</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsActionButton}
                onPress={() => setAssistantVisible(!assistantVisible)}
              >
                <Feather name="message-square" size={18} color="#3f51b5" />
                <Text style={styles.settingsActionButtonText}>
                  {assistantVisible ? 'إخفاء' : 'المساعد'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  ), [theme, fontSize, showLineNumbers, handleRunCode, handleAISave, handleAIUndo, handleRedo, assistantVisible, showSettingsModal]);

  const renderCodeEditorWithLineNumbers = useCallback(() => {
    const lines = currentCode.split('\n');
    const lineCount = lines.length;
    const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

    return (
      <View style={styles.editorArea}>
        {showLineNumbers && (
          <ScrollView
            style={[
              styles.lineNumbersContainer,
              { 
                backgroundColor: theme === 'dark' ? EDITOR_THEME.lineNumberBackground : '#f0f0f0',
                borderRightColor: theme === 'dark' ? '#3a3a3a' : '#e0e0e0'
              }
            ]}
            contentContainerStyle={{ alignItems: 'flex-end' }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            pointerEvents="none"
          >
            {lineNumbers.map((num) => (
              <Text
                key={num}
                style={[
                  styles.lineNumber,
                  { 
                    color: theme === 'dark' ? EDITOR_THEME.lineNumber : '#999',
                    fontSize: fontSize,
                    lineHeight: fontSize * 1.5,
                    textAlign: 'right',
                    width: '100%',
                  }
                ]}
                selectable={false}
              >
                {num}
              </Text>
            ))}
          </ScrollView>
        )}
        <ScrollView
          style={styles.editorScrollArea}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <TextInput
            ref={editorRef}
            style={[
              styles.editorInput,
              {
                backgroundColor: theme === 'dark' ? EDITOR_THEME.background : '#ffffff',
                color: theme === 'dark' ? EDITOR_THEME.text : '#000000',
                fontSize: fontSize,
                lineHeight: fontSize * 1.5,
                paddingLeft: showLineNumbers ? 2 : 6, // <-- تصغير البادينج هنا
                minHeight: fontSize * 1.5 * lineCount + 24,
              }
            ]}
            value={currentCode}
            onChangeText={(text) => {
              setCurrentCode(text);
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            }}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            textAlignVertical="top"
          />
        </ScrollView>
      </View>
    );
  }, [currentCode, editorLanguage, theme, fontSize, showLineNumbers, setCurrentCode]);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme === 'dark' ? '#1e1e1e' : '#f8f9fa' }]}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        
        <View style={[styles.header, { backgroundColor: theme === 'dark' ? '#252526' : '#3f51b5' }]}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setFileBrowserVisible(!fileBrowserVisible)}
          >
            <FontAwesome name="folder-open" size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerText}>
            {currentFile ? currentFile.name : 'محرر الكود'}
          </Text>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowSettingsModal(true)}
          >
            <Ionicons name="settings-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.mainContainer}>
          <Modal
            visible={fileBrowserVisible}
            animationType="slide"
            transparent
            onRequestClose={() => setFileBrowserVisible(false)}
          >
            <TouchableWithoutFeedback onPress={() => setFileBrowserVisible(false)}>
              <View style={styles.fileBrowserModal}>
                <TouchableWithoutFeedback>
                  <View style={[styles.fileBrowserContent, { backgroundColor: theme === 'dark' ? '#252526' : '#ffffff' }]}>
                    <View style={styles.fileBrowserHeader}>
                      <Text style={[styles.fileBrowserTitle, { color: theme === 'dark' ? '#fff' : '#333' }]}>
                        الملفات
                      </Text>
                      <TouchableOpacity onPress={() => setFileBrowserVisible(false)}>
                        <MaterialIcons name="close" size={24} color={theme === 'dark' ? '#fff' : '#333'} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.fileControlsRow}>
                      <TouchableOpacity 
                        style={[styles.fileControlButton, { backgroundColor: theme === 'dark' ? '#333' : '#3f51b5' }]}
                        onPress={openFile}
                      >
                        <Feather name="folder" size={16} color="#fff" />
                        <Text style={styles.fileControlButtonText}>فتح ملف</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.fileControlButton, { backgroundColor: theme === 'dark' ? '#333' : '#3f51b5' }]}
                        onPress={promptCreateNewFile}
                      >
                        <Feather name="file-plus" size={16} color="#fff" />
                        <Text style={styles.fileControlButtonText}>ملف جديد</Text>
                      </TouchableOpacity>
                    </View>
                    {projectFiles.length > 0 ? (
                      <FlatList
                        data={buildFileTree(projectFiles)}
                        renderItem={({ item }) => renderFileItem({ item })}
                        keyExtractor={(item) => item.path}
                        style={styles.fileList}
                        ItemSeparatorComponent={() => <View style={styles.fileDivider} />}
                      />
                    ) : (
                      <View style={styles.noFilesContainer}>
                        <Feather name="file" size={40} color={theme === 'dark' ? '#555' : '#9e9e9e'} />
                        <Text style={[styles.noFilesText, { color: theme === 'dark' ? '#ddd' : '#9e9e9e' }]}>
                          لا توجد ملفات
                        </Text>
                        <Text style={[styles.noFilesSubtext, { color: theme === 'dark' ? '#999' : '#9e9e9e' }]}>
                          استخدم المساعد لإنشاء ملفات جديدة
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          <Animated.View 
            style={[styles.editorContainer, {
              height: isLandscape ? (assistantVisible ? '50%' : '85%') : (assistantVisible ? '40%' : '85%'),
              backgroundColor: theme === 'dark' ? EDITOR_THEME.background : '#ffffff'
            }]}
          >
            <View style={[styles.editorHeader, { backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f0f0f0' }]}>
              <View style={styles.editorHeaderFileInfo}>
                <Text style={[styles.editorHeaderText, { color: theme === 'dark' ? '#e0e0e0' : '#333' }]}>
                  {currentFile ? currentFile.name : 'محرر الكود'}
                </Text>
                {currentFile && <Text style={styles.editorLanguageLabel}>{editorLanguage}</Text>}
              </View>
              <View style={styles.editorHeaderControls}>
                {isRunning && <ActivityIndicator size="small" color="#3f51b5" />}
                <TouchableOpacity style={styles.editorHeaderButton} onPress={handleFormatCode}>
                  <Feather name="align-center" size={16} color={theme === 'dark' ? '#e0e0e0' : '#666'} />
                </TouchableOpacity>
              </View>
            </View>
            {renderCodeEditorWithLineNumbers()}
          </Animated.View>

          {assistantVisible && (
            <Animated.View style={[styles.panelDivider, { top: panelDividerPosition }]} {...panResponder.panHandlers}>
              <View style={styles.dragHandle} />
            </Animated.View>
          )}

          {assistantVisible && (
            <View style={[styles.assistantPanel, {
              height: isLandscape ? '50%' : '60%',
              backgroundColor: theme === 'dark' ? '#252526' : '#f5f5f5'
            }]}>
              <View style={styles.assistantHeader}>
                <Text style={[styles.panelTitle, { color: theme === 'dark' ? '#e0e0e0' : '#673ab7' }]}>
                  المساعد الذكي
                </Text>
                <TouchableOpacity onPress={() => setAssistantVisible(false)}>
                  <Feather name="minimize-2" size={18} color={theme === 'dark' ? '#e0e0e0' : '#666'} />
                </TouchableOpacity>
              </View>
              <FlatList
                ref={flatListRef}
                data={chatMessages}
                renderItem={renderChatMessage}
                keyExtractor={(item) => (item.id ? String(item.id) : `fallback-${Date.now()}-${Math.random()}`)}
                style={styles.assistantContent}
                contentContainerStyle={styles.chatContainer}
                removeClippedSubviews={Platform.OS === 'android'}
                maxToRenderPerBatch={10}
                windowSize={10}
              />
              {isLoadingAI && <ActivityIndicator size="small" color="#3f51b5" style={styles.loadingIndicator} />}
              <View style={[styles.inputRow, { backgroundColor: theme === 'dark' ? '#23272f' : '#f3f6fa', borderWidth: 1, borderColor: theme === 'dark' ? '#444' : '#d0d7de', borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }]}>
                <TextInput
                  ref={assistantInputRef}
                  style={[
                    styles.assistantInput,
                    { 
                      color: theme === 'dark' ? '#f5f5f5' : '#222',
                      backgroundColor: 'transparent',
                      minHeight: 48,
                      maxHeight: 140,
                      fontSize: 16,
                      borderRadius: 20,
                      paddingRight: 44,
                      paddingLeft: 16,
                      paddingVertical: 12,
                    }
                  ]}
                  placeholder="اكتب أمرك أو سؤالك هنا..."
                  placeholderTextColor={theme === 'dark' ? '#888' : '#aaa'}
                  value={assistantInput}
                  onChangeText={setAssistantInput}
                  onSubmitEditing={() => handleSendMessage()}
                  textAlign={I18nManager.isRTL ? 'right' : 'left'}
                  multiline
                  blurOnSubmit={false}
                  returnKeyType="send"
                />
                {assistantInput.length > 0 && (
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      right: 56,
                      top: 14,
                      zIndex: 2,
                      padding: 4,
                    }}
                    onPress={() => setAssistantInput('')}
                  >
                    <Feather name="x-circle" size={20} color={theme === 'dark' ? '#aaa' : '#888'} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={[styles.sendButton, !assistantInput.trim() && styles.sendButtonDisabled]}
                  onPress={() => handleSendMessage()}
                  disabled={isLoadingAI || !assistantInput.trim()}
                >
                  <Feather name="send" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {outputVisible && (
            <Animated.View style={[styles.outputPanel, { height: outputPanelHeight }]}>
              <View style={styles.outputHeader}>
                <Text style={[styles.outputTitle, { color: theme === 'dark' ? '#e0e0e0' : '#333' }]}>
                  المخرجات
                </Text>
                <TouchableOpacity onPress={hideOutputPanel}>
                  <MaterialIcons name="close" size={20} color={theme === 'dark' ? '#e0e0e0' : '#333'} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.outputContent}>
                <Text style={[styles.outputText, executionErrors && styles.errorText]}>
                  {outputContent}
                </Text>
              </ScrollView>
            </Animated.View>
          )}
        </View>

        {renderSettingsModal()}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
  },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerText: {
    ...FONTS.h3,
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  headerButton: {
    padding: 10,
    borderRadius: 8,
  },
  editorContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  editorHeaderFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editorHeaderText: {
    ...FONTS.body3,
    marginRight: 8,
  },
  editorLanguageLabel: {
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#3a3a3a',
  },
  editorHeaderControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editorHeaderButton: {
    padding: 8,
    borderRadius: 4,
  },
  editorArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  lineNumbersContainer: {
    width: 28,
    flexShrink: 0,
    paddingVertical: 12,
    paddingRight: 2,
    borderRightWidth: 1,
    minHeight: '50%',
    backgroundColor: '#2d2d2d',
  },
  lineNumber: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'right',
    width: '50%',
    paddingRight: 2,
    opacity: 0.7,
    includeFontPadding: false,
  },
  editorScrollArea: {
    flex: 1, // يأخذ كل المساحة المتبقية
    minWidth: 0,
  },
  editorInput: {
    flex: 1,
    padding: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlignVertical: 'top',
    minWidth: 0,
  },
  panelDivider: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: '#333',
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#555',
  },
  assistantPanel: {
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  assistantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  panelTitle: {
    ...FONTS.h4,
    fontWeight: '600',
  },
  assistantContent: {
    flex: 1,
    paddingHorizontal: 12,
  },
  chatContainer: {
    paddingBottom: 12,
    paddingTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
    marginHorizontal: 8,
    marginBottom: 8,
  },
  assistantInput: {
    flex: 1,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 20,
    padding: 0,
    marginLeft: 0,
    backgroundColor: 'transparent',
    fontSize: 16,
    minHeight: 48,
    maxHeight: 140,
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 44,
    height: 44,
    backgroundColor: '#3f51b5',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#555',
  },
  outputPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#252526',
    borderTopWidth: 1,
    borderTopColor: '#444',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 8,
  },
  outputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  outputTitle: {
    ...FONTS.h4,
    fontWeight: '600',
  },
  outputContent: {
    flex: 1,
    padding: 16,
  },
  outputText: {
    ...FONTS.body4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 20,
  },
  errorText: {
    color: '#f44336',
  },
  chatMessage: {
    padding: 12,
    borderRadius: 18,
    marginVertical: 5,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#0b57d0',
    alignSelf: I18nManager.isRTL ? 'flex-start' : 'flex-end',
    marginLeft: 40,
  },
  assistantMessage: {
    backgroundColor: '#333',
    alignSelf: I18nManager.isRTL ? 'flex-end' : 'flex-start',
    marginRight: 40,
  },
  systemMessage: {
    backgroundColor: '#2d4b60',
    alignSelf: 'center',
    maxWidth: '90%',
  },
  chatMessageText: {
    color: '#ffffff',
    ...FONTS.body4,
    lineHeight: 20,
  },
  systemMessageText: {
    color: '#e0e0e0',
    fontSize: 13,
  },
  loadingIndicator: {
    marginVertical: 8,
    alignSelf: 'center',
  },
  confirmationMessageContainer: {
    backgroundColor: '#324b61',
    padding: 16,
    borderRadius: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#55829b',
  },
  confirmationText: {
    ...FONTS.body4,
    color: '#e0e0e0',
    marginBottom: 12,
  },
  codePreviewScroll: {
    maxHeight: 150,
    backgroundColor: '#1e1e1e',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  codePreviewText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#d4d4d4',
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  confirmationButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#2e7d32',
  },
  undoButton: {
    backgroundColor: '#d32f2f',
  },
  confirmationButtonText: {
    color: '#ffffff',
    ...FONTS.body3,
    fontWeight: '600',
  },
  fileBrowserModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  fileBrowserContent: {
    width: '80%',
    maxWidth: 350,
    height: '100%',
    borderTopRightRadius: I18nManager.isRTL ? 0 : 16,
    borderBottomRightRadius: I18nManager.isRTL ? 0 : 16,
    borderTopLeftRadius: I18nManager.isRTL ? 16 : 0,
    borderBottomLeftRadius: I18nManager.isRTL ? 16 : 0,
    elevation: 5,
  },
  fileBrowserHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  fileBrowserTitle: {
    ...FONTS.h3,
    fontWeight: '600',
  },
  fileControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fileControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flex: 0.48,
    justifyContent: 'center',
  },
  fileControlButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 8,
  },
  fileList: {
    flex: 1,
    padding: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedFileItem: {
    backgroundColor: '#37373d',
    borderWidth: 1,
    borderColor: '#0e639c',
  },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileItemContent: {
    flex: 1,
  },
  fileName: {
    ...FONTS.body3,
    color: '#fff',
    marginBottom: 2,
  },
  fileDetails: {
    fontSize: 12,
    color: '#999',
  },
  fileDivider: {
    height: 1,
    backgroundColor: '#444',
    marginVertical: 2,
  },
  noFilesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noFilesText: {
    ...FONTS.h4,
    textAlign: 'center',
    marginBottom: 8,
  },
  noFilesSubtext: {
    ...FONTS.body4,
    textAlign: 'center',
  },
  settingsModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsContent: {
    width: '80%',
    maxWidth: 400,
    borderRadius: 12,
    backgroundColor: '#252526',
    paddingBottom: 20,
    elevation: 5,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  settingsTitle: {
    ...FONTS.h3,
    color: '#e0e0e0',
    fontWeight: '600',
  },
  settingsCloseButton: {
    ...FONTS.body3,
    color: '#e0e0e0',
    padding: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  settingLabel: {
    ...FONTS.body3,
    color: '#e0e0e0',
  },
  themeButtons: {
    flexDirection: 'row',
  },
  themeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  activeThemeButton: {
    backgroundColor: '#0e639c',
    borderColor: '#0e639c',
  },
  themeButtonText: {
    color: '#e0e0e0',
  },
  fontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fontSizeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  switch: {
    width: 50,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#444',
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: '#0e639c',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ddd',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  copyCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#0e639c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  copyCodeButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '500',
  },
  settingsActionButton: {
    padding: 12,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'center',
    backgroundColor: '#333',
    margin: 4,
  },
  settingsActionButtonText: {
    color: '#e0e0e0',
    fontSize: 12,
    marginTop: 4,
  },
  settingsActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
});

export default ProgrammingScreen;
