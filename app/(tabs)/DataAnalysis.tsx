import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  SafeAreaView,
  Share,
  StyleProp,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';
import { FontAwesome5, MaterialIcons, Ionicons, AntDesign } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
// Adjusted import path assuming theme.ts is at the root
import { COLORS, SIZES, FONTS } from '../../theme'; // Ensure this path is correct
import { FontWeight } from '../../src/types'; // Import FontWeight

// Gemini API Key - WARNING: Hardcoding API keys is insecure. Use environment variables or a secure config service.
const GEMINI_API_KEY = 'AIzaSyCG7Bwr3SFikwvFLhX2HZsAjqgEQIFx7DE'; // Replace with your actual key if needed
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent'; // Updated model name

// Get screen dimensions
const { width } = Dimensions.get('window');

// --- Type Definitions ---

type AnalysisType = 'general' | 'sales' | 'customer' | 'financial';
type ActiveTab = 'upload' | 'templates' | 'recent' | 'help';

interface AnalysisTemplate {
  id: number;
  name: string;
  icon: React.ComponentProps<typeof FontAwesome5>['name'];
  type: AnalysisType;
}

interface RecentAnalysis {
  id: number;
  name: string;
  date: string; // ISO date string or similar
  type: AnalysisType;
}

// More specific type for parsed analysis results
interface ParsedAnalysisResult {
  summary?: string;
  recommendations?: string;
  keyMetrics?: string[];
  challenges?: string[];
  opportunities?: string[];
  comparison?: string;
  forecast?: string;
  additionalInsights?: string;
  risks?: string[];
  strategies?: string[];
  // Sales specific
  trends?: string;
  topProducts?: string[];
  salesByRegion?: string;
  salesByChannel?: string;
  seasonalPatterns?: string;
  conversionRates?: string;
  // Customer specific
  segments?: string[];
  loyalty?: string;
  customerLifetimeValue?: string;
  acquisitionCost?: string;
  churnRate?: string;
  customerSatisfaction?: string;
  engagementMetrics?: string;
  // Financial specific
  revenue?: string;
  costs?: string;
  profitMargin?: string;
  roi?: string;
  cashFlow?: string;
  operatingExpenses?: string;
  financialRatios?: string[];
  breakEvenAnalysis?: string;
  // General specific
  insights?: string;
  patterns?: string;
  correlations?: string;
  anomalies?: string[];
  dataQuality?: string;
}

// --- Constants ---

const analysisTemplates: AnalysisTemplate[] = [
  { id: 1, name: 'تحليل المبيعات الشهرية', icon: 'chart-line', type: 'sales' },
  { id: 2, name: 'تقسيم العملاء', icon: 'users', type: 'customer' },
  { id: 3, name: 'تحليل الأرباح والخسائر', icon: 'money-bill-wave', type: 'financial' },
  { id: 4, name: 'تحليل الاتجاهات العامة', icon: 'chart-pie', type: 'general' }
];

// Mock Recent Analyses (Replace with actual storage later)
const recentAnalyses: RecentAnalysis[] = [
  { id: 1, name: 'تحليل مبيعات الربع الأول 2025', date: '2025-04-01', type: 'sales' },
  { id: 2, name: 'تقرير العملاء الجدد', date: '2025-03-15', type: 'customer' },
  { id: 3, name: 'تحليل الميزانية السنوية', date: '2025-02-28', type: 'financial' }
];

// Supported file types
const supportedFiles: string[] = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/json',
  'text/plain', // Added plain text
];

// --- Component ---

export default function DataAnalysisScreen() {
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ParsedAnalysisResult | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('general');
  const [activeTab, setActiveTab] = useState<ActiveTab>('upload');
  const [showTips, setShowTips] = useState<boolean>(false);

  // Pick document function
  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: supportedFiles,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('File selection cancelled');
        return;
      }

      const selectedFile = result.assets[0];

      if (selectedFile) {
        const fileInfo = await FileSystem.getInfoAsync(selectedFile.uri);

        if (fileInfo && 'size' in fileInfo && fileInfo.size > 10 * 1024 * 1024) { // 10MB limit
          Alert.alert('حجم الملف كبير جداً', 'يرجى اختيار ملف بحجم أقل من 10MB');
          return;
        }

        setFile(selectedFile);
        setAnalysisResult(undefined); // Reset results when new file is picked
        setActiveTab('upload'); // Switch back to upload tab
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء اختيار الملف');
    }
  }, []);

  // Helper to extract a section based on heading
  const extractSection = (text: string, sectionName: string): string | undefined => {
    const regex = new RegExp(`(?:\\*\\*|##)\\s*${sectionName}\\s*(?:\\*\\*|##)?[:\\s]*\\n?([\\s\\S]*?)(?=\\n(?:\\*\\*|##)|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : undefined;
  };

  // Helper to extract list items from a section
  const extractList = (text: string, listName: string): string[] | undefined => {
    const section = extractSection(text, listName);
    if (!section) return undefined;
    const items = section.split(/\n\s*[-*•]|\n\s*\d+\.\s*/)
                         .map(item => item.trim())
                         .filter(item => item && item.length > 1);
    return items.length > 0 ? items : undefined;
  };

  // Parse Gemini response into a structured object
  const parseGeminiResponse = (text: string, type: AnalysisType): ParsedAnalysisResult => {
    const result: ParsedAnalysisResult = {
      summary: extractSection(text, 'ملخص تنفيذي') || extractSection(text, 'ملخص'),
      recommendations: extractSection(text, 'التوصيات'),
      keyMetrics: extractList(text, 'مؤشرات الأداء الرئيسية') || extractList(text, 'المؤشرات الرئيسية'),
      challenges: extractList(text, 'التحديات') || extractList(text, 'المشكلات'),
      opportunities: extractList(text, 'الفرص') || extractList(text, 'فرص التحسين'),
      comparison: extractSection(text, 'مقارنة تاريخية') || extractSection(text, 'مقارنة بالفترات السابقة'),
      forecast: extractSection(text, 'التوقعات المستقبلية') || extractSection(text, 'التنبؤات'),
      additionalInsights: extractSection(text, 'رؤى إضافية'),
      risks: extractList(text, 'المخاطر'),
      strategies: extractList(text, 'الاستراتيجيات'),
    };

    switch(type) {
      case 'sales':
        result.trends = extractSection(text, 'الاتجاهات');
        result.topProducts = extractList(text, 'أفضل المنتجات') || extractList(text, 'المنتجات الأكثر مبيعاً');
        result.salesByRegion = extractSection(text, 'المبيعات حسب المنطقة');
        result.salesByChannel = extractSection(text, 'المبيعات حسب القناة');
        result.seasonalPatterns = extractSection(text, 'الأنماط الموسمية');
        result.conversionRates = extractSection(text, 'معدلات التحويل');
        break;
      case 'customer':
        result.segments = extractList(text, 'تقسيم العملاء') || extractList(text, 'فئات العملاء');
        result.loyalty = extractSection(text, 'الولاء') || extractSection(text, 'معدل الاحتفاظ');
        result.customerLifetimeValue = extractSection(text, 'قيمة العميل مدى الحياة');
        result.acquisitionCost = extractSection(text, 'تكلفة اكتساب العملاء');
        result.churnRate = extractSection(text, 'معدل فقدان العملاء');
        result.customerSatisfaction = extractSection(text, 'رضا العملاء');
        result.engagementMetrics = extractSection(text, 'مقاييس المشاركة');
        break;
      case 'financial':
        result.revenue = extractSection(text, 'الإيرادات');
        result.costs = extractSection(text, 'التكاليف');
        result.profitMargin = extractSection(text, 'هامش الربح');
        result.roi = extractSection(text, 'العائد على الاستثمار');
        result.cashFlow = extractSection(text, 'التدفق النقدي');
        result.operatingExpenses = extractSection(text, 'المصاريف التشغيلية');
        result.financialRatios = extractList(text, 'النسب المالية');
        result.breakEvenAnalysis = extractSection(text, 'تحليل نقطة التعادل');
        break;
      default: // General
        result.insights = extractSection(text, 'الرؤى') || extractSection(text, 'رؤى');
        result.patterns = extractSection(text, 'الأنماط');
        result.correlations = extractSection(text, 'الارتباطات');
        result.anomalies = extractList(text, 'الشذوذ') || extractList(text, 'البيانات غير العادية');
        result.dataQuality = extractSection(text, 'جودة البيانات');
    }
    return Object.entries(result).reduce((acc, [key, value]) => {
      if (value) acc[key as keyof ParsedAnalysisResult] = value as any;
      return acc;
    }, {} as ParsedAnalysisResult);
  };

  // Get mock response for fallback/testing
  const getMockResponse = (type: AnalysisType): ParsedAnalysisResult => {
    // Using the detailed mock responses from the original JS file
    switch(type) {
      case 'sales':
        return {
          summary: 'تحليل شامل لبيانات المبيعات يظهر نمواً إيجابياً مع بعض التحديات في أسواق معينة',
          trends: 'نمو بنسبة 15% في الربع الأخير مع زيادة ملحوظة في المبيعات عبر الإنترنت بنسبة 27%',
          topProducts: ['المنتج أ - 32% من إجمالي المبيعات', 'المنتج ب - 24% من إجمالي المبيعات', 'المنتج ج - 18% من إجمالي المبيعات'],
          salesByRegion: 'المنطقة الشمالية: 45%، المنطقة الجنوبية: 30%، المنطقة الشرقية: 15%، المنطقة الغربية: 10%',
          salesByChannel: 'المتاجر الفعلية: 55%، المتاجر الإلكترونية: 35%، تطبيقات الهاتف: 10%',
          seasonalPatterns: 'ارتفاع المبيعات في الربع الرابع بنسبة 40% مقارنة بباقي السنة، مع انخفاض ملحوظ في شهر يوليو',
          conversionRates: 'معدل تحويل الزيارات إلى مبيعات: 3.2% (زيادة 0.5% عن الفترة السابقة)',
          keyMetrics: ['معدل قيمة الطلب: 450 ريال', 'معدل تكرار الشراء: 3.7 مرة سنوياً', 'نسبة المرتجعات: 4.2%'],
          challenges: ['انخفاض المبيعات في المنطقة الغربية', 'ارتفاع تكاليف الشحن', 'منافسة شديدة في فئة المنتج ب'],
          opportunities: ['توسيع نطاق المنتج أ', 'استهداف الفئة العمرية 25-34', 'تحسين تجربة التسوق عبر الهاتف'],
          comparison: 'زيادة إجمالية بنسبة 12% مقارنة بالعام السابق، مع تحسن في هوامش الربح بنسبة 2.5%',
          forecast: 'من المتوقع استمرار النمو بنسبة 10-15% في الأرباع القادمة مع فرص نمو أكبر في المبيعات الرقمية',
          recommendations: 'زيادة الاستثمار في المنتج أ نظراً للأداء المتميز، تحسين استراتيجية التسويق في المنطقة الغربية، تطوير برنامج ولاء للعملاء المتكررين، تخفيض تكاليف الشحن من خلال شراكات جديدة'
        };
      case 'customer':
         return {
          summary: 'تحليل شامل لبيانات العملاء يظهر قاعدة عملاء متنوعة مع فرص كبيرة للنمو في شرائح معينة',
          segments: [
            'الفئة العمرية 25-34 تمثل 42% من العملاء وتنفق 55% من إجمالي المبيعات',
            '60% من العملاء من المناطق الحضرية، 30% من الضواحي، 10% من المناطق الريفية',
            'العملاء ذوو الدخل المرتفع يمثلون 25% من القاعدة لكنهم مسؤولون عن 45% من الإيرادات'
          ],
          loyalty: 'معدل الاحتفاظ بالعملاء 78% مع ارتفاع إلى 92% للعملاء الذين اشتركوا في برنامج الولاء',
          customerLifetimeValue: 'متوسط قيمة العميل مدى الحياة: 4,200 ريال، مع ارتفاع إلى 7,800 ريال للعملاء المخلصين',
          acquisitionCost: 'متوسط تكلفة اكتساب العميل: 210 ريال، بانخفاض 15% عن العام السابق',
          churnRate: 'معدل فقدان العملاء: 22% سنوياً، مع انخفاض في الفئة العمرية 35-44 إلى 14%',
          customerSatisfaction: 'مؤشر رضا العملاء: 8.2/10، بزيادة 0.4 نقطة عن القياس السابق',
          engagementMetrics: 'متوسط زيارات العميل الشهرية: 2.7، متوسط وقت التفاعل: 12 دقيقة',
          keyMetrics: ['نسبة العملاء المتكررين: 65%', 'معدل التوصية: 72%', 'معدل المشاركة في وسائل التواصل: 28%'],
          challenges: ['ارتفاع معدل فقدان العملاء في الفئة العمرية 18-24', 'انخفاض معدل التحويل في المناطق الريفية', 'ضعف المشاركة في برنامج الولاء'],
          opportunities: ['استهداف الفئة العمرية 35-44 بعروض خاصة', 'تطوير استراتيجية للمناطق الريفية', 'تحسين تجربة العملاء الرقمية'],
          comparison: 'زيادة في قاعدة العملاء بنسبة 18% مقارنة بالعام السابق، مع تحسن في معدلات الاحتفاظ بنسبة 5%',
          forecast: 'من المتوقع نمو قاعدة العملاء بنسبة 15-20% في العام القادم، مع زيادة في قيمة العميل بنسبة 10%',
          recommendations: 'تطوير برنامج ولاء مخصص للفئات العمرية المختلفة، تحسين تجربة العملاء في المناطق الريفية، إطلاق حملات استهداف للفئة العمرية 35-44، تعزيز التواصل مع العملاء عبر القنوات المفضلة لديهم'
        };
      case 'financial':
        return {
          summary: 'تحليل شامل للبيانات المالية يظهر أداءً قوياً مع فرص للتحسين في مجالات محددة',
          revenue: 'زيادة الإيرادات بنسبة 12% مقارنة بالعام السابق، مع نمو ثابت في جميع خطوط الأعمال',
          costs: 'انخفاض التكاليف التشغيلية بنسبة 5%، مع توفير 8% في تكاليف سلسلة التوريد',
          profitMargin: 'تحسن هامش الربح الإجمالي من 22% إلى 25%، وهامش الربح الصافي من 8% إلى 10%',
          roi: 'العائد على الاستثمار للمشاريع الجديدة: 18%، بزيادة 3% عن متوسط العام السابق',
          cashFlow: 'تحسن التدفق النقدي التشغيلي بنسبة 15%، مع انخفاض في دورة تحويل النقد بمقدار 7 أيام',
          operatingExpenses: 'نسبة المصاريف التشغيلية إلى الإيرادات: 35%، بانخفاض 2% عن العام السابق',
          financialRatios: ['نسبة السيولة: 2.3', 'نسبة الدين إلى حقوق الملكية: 0.45', 'معدل دوران المخزون: 8.5 مرة سنوياً'],
          breakEvenAnalysis: 'نقطة التعادل تحققت بعد 7.5 أشهر، بتحسن 1.2 شهر عن العام السابق',
          keyMetrics: ['معدل النمو السنوي المركب: 14%', 'تكلفة رأس المال: 7.2%', 'نسبة الكفاءة التشغيلية: 82%'],
          challenges: ['ارتفاع تكاليف المواد الخام', 'تقلبات أسعار الصرف', 'زيادة تكاليف الاقتراض'],
          opportunities: ['تنويع مصادر الإيرادات', 'تحسين كفاءة رأس المال العامل', 'الاستثمار في التكنولوجيا لخفض التكاليف'],
          comparison: 'أداء مالي أفضل بنسبة 15% من متوسط القطاع، مع تفوق في معدلات النمو والربحية',
          forecast: 'توقعات بنمو الإيرادات بنسبة 10-12% في السنة المالية القادمة، مع تحسن إضافي في هوامش الربح',
          recommendations: 'فرص لتحسين هامش الربح في قسم المبيعات الدولية، تطبيق استراتيجيات لإدارة تكاليف المواد الخام، تحسين دورة رأس المال العامل، الاستثمار في مبادرات التحول الرقمي لزيادة الكفاءة'
        };
      default: // General
        return {
          summary: 'تحليل عام وشامل للبيانات يكشف عن اتجاهات وأنماط مهمة مع فرص للتحسين',
          insights: 'تم اكتشاف 5 اتجاهات رئيسية تؤثر على الأداء العام، مع وجود علاقات قوية بين متغيرات مختلفة',
          patterns: 'نمط موسمي واضح خلال الربع الثاني من كل عام، مع دورات متكررة كل 3-4 أشهر',
          correlations: 'ارتباط قوي (0.82) بين نشاط العملاء والإنفاق الإعلاني، وارتباط متوسط (0.65) بين رضا الموظفين والإنتاجية',
          anomalies: ['زيادة غير متوقعة في الطلب خلال شهر مارس', 'انخفاض مفاجئ في معدلات التحويل في المنطقة الشرقية', 'ارتفاع غير عادي في تكاليف التشغيل في الربع الثالث'],
          dataQuality: 'جودة البيانات جيدة بشكل عام (92%)، مع بعض الثغرات في بيانات المناطق الريفية',
          keyMetrics: ['معدل النمو: 8.5%', 'مؤشر الأداء الرئيسي 1: 78/100', 'مؤشر الأداء الرئيسي 2: 92% من المستهدف'],
          challenges: ['نقص في بعض البيانات التاريخية', 'صعوبة في تتبع بعض المؤشرات', 'تباين كبير في بعض المتغيرات'],
          opportunities: ['تحسين جمع البيانات', 'تطوير نماذج تنبؤية أكثر دقة', 'دمج مصادر بيانات إضافية'],
          comparison: 'تحسن في دقة التحليلات بنسبة 25% مقارنة بالتقارير السابقة، مع تغطية أوسع للمتغيرات',
          forecast: 'توقعات بتحسن المؤشرات الرئيسية بنسبة 10-15% في الفترة القادمة بناءً على الاتجاهات الحالية',
          recommendations: 'تحسين جمع البيانات للحصول على رؤى أكثر دقة، تطوير لوحات متابعة تفاعلية لمراقبة المؤشرات الرئيسية، الاستثمار في تحليلات متقدمة للتنبؤ بالاتجاهات المستقبلية، تدريب الفريق على تفسير البيانات واتخاذ قرارات مبنية عليها'
        };
    }
  };

  // Analyze file using Gemini API
  const analyzeFile = useCallback(async () => {
    if (!file || !file.name) {
      Alert.alert('تنبيه', 'يرجى اختيار ملف أولاً');
      return;
    }

    setLoading(true);
    setAnalysisResult(undefined); // Clear previous results

    try {
      let fileContent: string;
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

      if (['csv', 'json', 'txt'].includes(fileExtension)) {
        fileContent = await FileSystem.readAsStringAsync(file.uri);
      } else { // For Excel etc., send as base64
        fileContent = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      }

      let analysisPrompt = '';
      switch(analysisType) {
        case 'sales':
          analysisPrompt = `قم بتحليل بيانات المبيعات التالية بالتفصيل. قدم ملخصاً تنفيذياً، الاتجاهات الرئيسية، أفضل وأسوأ المنتجات أداءً، تحليل المبيعات حسب المنطقة والقناة (إن وجدت)، الأنماط الموسمية، معدلات التحويل، مؤشرات الأداء الرئيسية (مثل متوسط قيمة الطلب، تكرار الشراء)، التحديات الرئيسية، الفرص المتاحة، مقارنة بالفترات السابقة (إن أمكن)، وتوقعات مستقبلية موجزة. وأخيراً، قدم توصيات عملية وقابلة للتنفيذ لتحسين المبيعات.`;
          break;
        case 'customer':
          analysisPrompt = `قم بتحليل بيانات العملاء التالية بالتفصيل. قدم ملخصاً تنفيذياً، تقسيم العملاء إلى شرائح رئيسية (ديموغرافياً وسلوكياً)، تحليل الولاء ومعدل الاحتفاظ، قيمة العميل مدى الحياة (LTV)، تكلفة اكتساب العملاء (CAC)، معدل فقدان العملاء (Churn Rate)، تحليل رضا العملاء (إن وجد)، مقاييس المشاركة، مؤشرات الأداء الرئيسية، التحديات الرئيسية، الفرص المتاحة، مقارنة بالفترات السابقة (إن أمكن)، وتوقعات مستقبلية موجزة. وأخيراً، قدم توصيات عملية لتعزيز ولاء العملاء وتحسين تجربتهم.`;
          break;
        case 'financial':
          analysisPrompt = `قم بتحليل البيانات المالية التالية بالتفصيل. قدم ملخصاً تنفيذياً، تحليل الإيرادات والتكاليف، هوامش الربح (الإجمالي والصافي)، العائد على الاستثمار (ROI)، تحليل التدفق النقدي، المصاريف التشغيلية، النسب المالية الهامة (مثل السيولة، الرافعة المالية، النشاط)، تحليل نقطة التعادل، مؤشرات الأداء الرئيسية، التحديات المالية الرئيسية، الفرص المتاحة، مقارنة بالميزانية أو الفترات السابقة (إن أمكن)، وتوقعات مالية موجزة. وأخيراً، قدم توصيات عملية لتحسين الأداء المالي.`;
          break;
        default: // General
          analysisPrompt = `قم بتحليل البيانات التالية بشكل عام وشامل. قدم ملخصاً تنفيذياً، الرؤى الرئيسية المكتشفة، الأنماط والاتجاهات الهامة، الارتباطات بين المتغيرات (إن وجدت)، اكتشاف أي بيانات شاذة أو غير طبيعية، تقييم جودة البيانات (إن أمكن)، مؤشرات الأداء الرئيسية، التحديات الرئيسية، الفرص المتاحة، مقارنة بالفترات السابقة (إن أمكن)، وتوقعات مستقبلية موجزة. وأخيراً، قدم توصيات عامة وعملية بناءً على التحليل.`;
      }

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: `${analysisPrompt}\n\n--- بيانات الملف ---\nنوع الملف: ${file.mimeType}\nاسم الملف: ${file.name}\n\nمحتوى الملف (أو جزء منه للأنواع النصية):\n${fileExtension === 'csv' || fileExtension === 'json' || fileExtension === 'txt' ? fileContent.substring(0, 5000) : '[محتوى الملف غير نصي أو طويل جداً]'}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.6,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 3072,
        }
      };

      // --- API Call (around line 398) ---
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      // --- Refined Error Handling ---
      if (!response.ok) {
        let errorMsg = `API error: ${response.status} - ${response.statusText}`;
        try {
          const errorBody = await response.json(); // Try to parse JSON error
          errorMsg += `\n${errorBody?.error?.message || JSON.stringify(errorBody)}`;
        } catch (parseError) {
          // If parsing fails, use the raw text
          const errorBodyText = await response.text();
          errorMsg += `\n${errorBodyText}`;
        }
        console.error("API Error Response:", errorMsg);

        let userAlertMessage = `حدث خطأ أثناء الاتصال بالـ API (${response.status}).`;
        if (response.status === 400) {
            userAlertMessage += "\nقد يكون هناك خطأ في تنسيق الطلب أو البيانات المرسلة.";
        } else if (response.status === 403) {
            userAlertMessage += "\nقد يكون مفتاح API غير صحيح أو لا يملك الصلاحيات اللازمة.";
        } else if (response.status === 429) {
            userAlertMessage += "\nتم تجاوز حد الطلبات المسموح به. يرجى المحاولة لاحقاً.";
        } else if (response.status >= 500) {
            userAlertMessage += "\nحدث خطأ في خادم API. يرجى المحاولة لاحقاً.";
        }
        userAlertMessage += "\nتم عرض بيانات توضيحية.";

        throw new Error(userAlertMessage); // Throw refined error message for the catch block
      }
      // --- End Refined Error Handling ---

      const responseData = await response.json();

      if (responseData.candidates && responseData.candidates.length > 0 && responseData.candidates[0].content) {
        const analysisText = responseData.candidates[0].content.parts[0].text;
        const parsedResult = parseGeminiResponse(analysisText, analysisType);
        setAnalysisResult(parsedResult);
      } else {
        console.warn("No valid content in API response, using mock data.", responseData);
        setAnalysisResult(getMockResponse(analysisType)); // Fallback to mock
      }

    } catch (error: any) {
      console.error('Error analyzing file:', error);
      setAnalysisResult(getMockResponse(analysisType)); // Fallback to mock on error
      // Use the error message directly if it was refined, otherwise use a generic message
      const alertMessage = error?.message?.includes("API error") || error?.message?.includes("حدث خطأ")
                           ? error.message
                           : `حدث خطأ غير متوقع أثناء التحليل. تم عرض بيانات توضيحية.\n${error.message}`;
      Alert.alert('خطأ في التحليل', alertMessage);
    } finally {
      setLoading(false);
    }
  }, [file, analysisType]); // Dependencies for useCallback

  // Render analysis results section
  const renderAnalysisResult = () => {
    if (!analysisResult) return null;

    // Helper to render a section if data exists
    const renderSection = (title: string, data: string | string[] | undefined, isList: boolean = false) => {
      if (!data) return null;
      return (
        <View style={styles.resultSectionContainer}>
          <Text style={styles.resultSubtitle}>{title}</Text>
          {isList && Array.isArray(data) ? (
            data.map((item, index) => <Text key={index} style={styles.resultListItem}>• {item}</Text>)
          ) : (
            <Text style={styles.resultText}>{data as string}</Text> // Added type assertion
          )}
        </View>
      );
    };

    // Function to format the result text for sharing
    const formatResultForSharing = (): string => {
      let shareText = `*نتائج تحليل ${file?.name || 'الملف'} (نوع: ${analysisType})*\n\n`;

      const sections: { [key: string]: string | string[] | undefined } = {
        "ملخص تنفيذي": analysisResult.summary,
        "الاتجاهات": analysisResult.trends,
        "الرؤى المكتشفة": analysisResult.insights,
        "أفضل المنتجات": analysisResult.topProducts,
        "تقسيم العملاء": analysisResult.segments,
        "الأنماط": analysisResult.patterns,
        "الإيرادات": analysisResult.revenue,
        "التكاليف": analysisResult.costs,
        "ولاء العملاء": analysisResult.loyalty,
        "مؤشرات الأداء الرئيسية": analysisResult.keyMetrics,
        "التحديات": analysisResult.challenges,
        "الفرص": analysisResult.opportunities,
        "مقارنة تاريخية": analysisResult.comparison,
        "التوقعات المستقبلية": analysisResult.forecast,
        "المبيعات حسب المنطقة": analysisResult.salesByRegion,
        "المبيعات حسب القناة": analysisResult.salesByChannel,
        "الأنماط الموسمية": analysisResult.seasonalPatterns,
        "معدلات التحويل": analysisResult.conversionRates,
        "قيمة العميل مدى الحياة": analysisResult.customerLifetimeValue,
        "تكلفة اكتساب العملاء": analysisResult.acquisitionCost,
        "معدل فقدان العملاء": analysisResult.churnRate,
        "رضا العملاء": analysisResult.customerSatisfaction,
        "مقاييس المشاركة": analysisResult.engagementMetrics,
        "هامش الربح": analysisResult.profitMargin,
        "العائد على الاستثمار": analysisResult.roi,
        "التدفق النقدي": analysisResult.cashFlow,
        "المصاريف التشغيلية": analysisResult.operatingExpenses,
        "النسب المالية": analysisResult.financialRatios,
        "تحليل نقطة التعادل": analysisResult.breakEvenAnalysis,
        "الارتباطات": analysisResult.correlations,
        "الشذوذ": analysisResult.anomalies,
        "جودة البيانات": analysisResult.dataQuality,
        "التوصيات": analysisResult.recommendations,
        "رؤى إضافية": analysisResult.additionalInsights,
        "المخاطر": analysisResult.risks,
        "الاستراتيجيات": analysisResult.strategies,
      };

      for (const [title, data] of Object.entries(sections)) {
        if (data) {
          shareText += `*${title}:*\n`;
          if (Array.isArray(data)) {
            data.forEach(item => shareText += `- ${item}\n`);
          } else {
            shareText += `${data}\n`;
          }
          shareText += '\n';
        }
      }
      return shareText;
    };

    // Share function
    const onShare = async () => {
      try {
        const message = formatResultForSharing();
        const result = await Share.share({
          message: message,
          title: `نتائج تحليل ${file?.name || 'الملف'}`,
        });
        if (result.action === Share.sharedAction) {
          // Shared
        } else if (result.action === Share.dismissedAction) {
          // Dismissed
        }
      } catch (error: any) {
        Alert.alert('خطأ', error.message);
      }
    };

    return (
      <View style={styles.resultContainer}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>نتائج التحليل</Text>
          <TouchableOpacity onPress={onShare} style={styles.shareButton}>
            <Ionicons name="share-social-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.resultCard}>
          {renderSection('ملخص تنفيذي', analysisResult.summary)}
          {renderSection('الاتجاهات', analysisResult.trends)}
          {renderSection('الرؤى المكتشفة', analysisResult.insights)}
          {renderSection('أفضل المنتجات', analysisResult.topProducts, true)}
          {renderSection('تقسيم العملاء', analysisResult.segments, true)}
          {renderSection('الأنماط', analysisResult.patterns)}
          {renderSection('الإيرادات', analysisResult.revenue)}
          {renderSection('التكاليف', analysisResult.costs)}
          {renderSection('ولاء العملاء', analysisResult.loyalty)}
          {renderSection('مؤشرات الأداء الرئيسية', analysisResult.keyMetrics, true)}
          {renderSection('التحديات', analysisResult.challenges, true)}
          {renderSection('الفرص', analysisResult.opportunities, true)}
          {renderSection('مقارنة تاريخية', analysisResult.comparison)}
          {renderSection('التوقعات المستقبلية', analysisResult.forecast)}
          {/* Sales Specific */}
          {renderSection('المبيعات حسب المنطقة', analysisResult.salesByRegion)}
          {renderSection('المبيعات حسب القناة', analysisResult.salesByChannel)}
          {renderSection('الأنماط الموسمية', analysisResult.seasonalPatterns)}
          {renderSection('معدلات التحويل', analysisResult.conversionRates)}
          {/* Customer Specific */}
          {renderSection('قيمة العميل مدى الحياة', analysisResult.customerLifetimeValue)}
          {renderSection('تكلفة اكتساب العملاء', analysisResult.acquisitionCost)}
          {renderSection('معدل فقدان العملاء', analysisResult.churnRate)}
          {renderSection('رضا العملاء', analysisResult.customerSatisfaction)}
          {renderSection('مقاييس المشاركة', analysisResult.engagementMetrics)}
          {/* Financial Specific */}
          {renderSection('هامش الربح', analysisResult.profitMargin)}
          {renderSection('العائد على الاستثمار', analysisResult.roi)}
          {renderSection('التدفق النقدي', analysisResult.cashFlow)}
          {renderSection('المصاريف التشغيلية', analysisResult.operatingExpenses)}
          {renderSection('النسب المالية', analysisResult.financialRatios, true)}
          {renderSection('تحليل نقطة التعادل', analysisResult.breakEvenAnalysis)}
          {/* General Specific */}
          {renderSection('الارتباطات', analysisResult.correlations)}
          {renderSection('الشذوذ', analysisResult.anomalies, true)}
          {renderSection('جودة البيانات', analysisResult.dataQuality)}

          {/* Always shown if available */}
          {renderSection('التوصيات', analysisResult.recommendations)}
          {renderSection('رؤى إضافية', analysisResult.additionalInsights)}
          {renderSection('المخاطر', analysisResult.risks, true)}
          {renderSection('الاستراتيجيات', analysisResult.strategies, true)}
        </View>
      </View>
    );
  };

  // Render Templates Section
  const renderTemplatesSection = () => {
    return (
      <View style={styles.templatesSection}>
        <Text style={styles.sectionTitle}>قوالب التحليل الجاهزة</Text>
        <Text style={styles.sectionSubtitle}>استخدم أحد القوالب الجاهزة للحصول على تحليل سريع</Text>

        <View style={styles.templatesList}>
          {analysisTemplates.map(template => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateCard}
              onPress={() => {
                setAnalysisType(template.type);
                setActiveTab('upload'); // Switch to upload tab with selected type
                Alert.alert('تم اختيار القالب', `تم تحديد نوع التحليل "${template.name}". يرجى رفع الملف الآن.`);
              }}
            >
              <View style={[styles.templateIconContainer, {backgroundColor: '#6c757d'}]}> {/* Replaced COLORS.secondary */}
                <FontAwesome5 name={template.icon} size={24} color={COLORS.white} />
              </View>
              <Text style={styles.templateName}>{template.name}</Text>
              <AntDesign name="arrowleft" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Render Recent Analyses Section
  const renderRecentAnalysesSection = () => {
    return (
      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>التحليلات الأخيرة</Text>

        {recentAnalyses.length === 0 ? (
          <Text style={styles.emptyStateText}>لا توجد تحليلات سابقة.</Text>
        ) : (
          recentAnalyses.map(analysis => {
            const date = new Date(analysis.date);
            const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

            let icon: React.ComponentProps<typeof FontAwesome5>['name'];
            let iconColor = COLORS.primary;
            switch(analysis.type) {
              case 'sales': icon = 'chart-line'; iconColor = '#28a745'; break;
              case 'customer': icon = 'users'; iconColor = '#17a2b8'; break;
              case 'financial': icon = 'money-bill-wave'; iconColor = '#ffc107'; break;
              default: icon = 'chart-pie'; iconColor = '#6c757d'; // Keep gray for general
            }

            return (
              <TouchableOpacity
                key={analysis.id}
                style={styles.recentAnalysisCard}
                onPress={() => {
                  // In a real app, load the previous analysis data
                  Alert.alert('تحميل التحليل', `سيتم تحميل تحليل: ${analysis.name}`);
                }}
              >
                <View style={[styles.recentAnalysisIconContainer, {backgroundColor: iconColor}]}>
                  <FontAwesome5 name={icon} size={18} color={COLORS.white} />
                </View>
                <View style={styles.recentAnalysisInfo}>
                  <Text style={styles.recentAnalysisName} numberOfLines={1}>{analysis.name}</Text>
                  <Text style={styles.recentAnalysisDate}>{formattedDate}</Text>
                </View>
                <MaterialIcons name="keyboard-arrow-left" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            );
          })
        )}
      </View>
    );
  };

  // Render New Data Lifecycle Sections
  const renderDataLifecycleSections = () => {
    const stages = [
      { icon: 'database', title: 'استخراج البيانات', desc: 'نقوم بجمع واستخراج البيانات من مصادر متعددة بكفاءة عالية.' },
      { icon: 'broom', title: 'تنظيف البيانات', desc: 'معالجة البيانات المفقودة والقيم الشاذة لضمان جودة التحليل.' },
      { icon: 'cogs', title: 'معالجة البيانات', desc: 'تحويل البيانات الخام إلى صيغة قابلة للتحليل والتفسير.' },
      { icon: 'project-diagram', title: 'نمذجة البيانات', desc: 'بناء نماذج إحصائية متقدمة لفهم العلاقات والأنماط.' },
    ];

    const lifecycle = [
      { icon: 'cloud-download-alt', title: 'استخراج البيانات', desc: 'جمع البيانات من مصادر متعددة باستخدام تقنيات متقدمة للاستخراج الآلي والتكامل مع قواعد البيانات المختلفة.' },
      { icon: 'magic', title: 'تنظيف البيانات', desc: 'معالجة البيانات المفقودة، تصحيح الأخطاء، وإزالة التكرارات لضمان جودة التحليل.' },
      { icon: 'sync-alt', title: 'معالجة البيانات', desc: 'تحويل البيانات إلى صيغ موحدة، تطبيع المقاييس، وتجهيز البيانات للتحليل المتقدم.' },
      { icon: 'brain', title: 'نمذجة البيانات', desc: 'بناء نماذج إحصائية وخوارزميات تحليل البيانات لاكتشاف الأنماط والعلاقات.' },
    ];

    const renderSteps = (steps: typeof stages) => (
      steps.map((step, index) => (
        <View key={index} style={styles.infoStepItem}>
          <FontAwesome5 name={step.icon as any} size={20} color={COLORS.primary} style={styles.infoStepIcon} />
          <View style={styles.infoStepTextContainer}>
            <Text style={styles.infoStepTitle}>{step.title}</Text>
            <Text style={styles.infoStepDescription}>{step.desc}</Text>
          </View>
        </View>
      ))
    );

    return (
      <>
        <View style={styles.infoSectionContainer}>
          <Text style={styles.infoSectionTitle}>مراحل تحليل البيانات المتكاملة</Text>
          {renderSteps(stages)}
        </View>
        <View style={styles.infoSectionContainer}>
          <Text style={styles.infoSectionTitle}>دورة حياة تحليل البيانات الشاملة</Text>
          {renderSteps(lifecycle)}
        </View>
      </>
    );
  };


  // Render Help & Tips Section
  const renderHelpSection = () => {
    return (
      <View style={styles.helpSection}>
        <Text style={styles.sectionTitle}>مساعدة ونصائح</Text>

        <TouchableOpacity
          style={styles.helpCard}
          onPress={() => setShowTips(!showTips)}
        >
          <View style={styles.helpCardHeader}>
            <Ionicons name="bulb-outline" size={24} color={COLORS.primary} />
            <Text style={styles.helpCardTitle}>نصائح لتحليل أفضل</Text>
            <Ionicons
              name={showTips ? "chevron-up" : "chevron-down"}
              size={24}
              color={COLORS.primary}
            />
          </View>

          {showTips && (
            <View style={styles.tipsContainer}>
              <Text style={styles.tipText}>• تأكد من أن ملفاتك منظمة وخالية من الأخطاء.</Text>
              <Text style={styles.tipText}>• استخدم عناوين واضحة للأعمدة في ملفات البيانات.</Text>
              <Text style={styles.tipText}>• اختر نوع التحليل المناسب لبياناتك للحصول على أفضل النتائج.</Text>
              <Text style={styles.tipText}>• قم بتنظيف البيانات من القيم المفقودة أو غير الصحيحة قبل الرفع.</Text>
              <Text style={styles.tipText}>• استخدم القوالب الجاهزة لتحليل سريع ومتخصص.</Text>
              <Text style={styles.tipText}>• للملفات الكبيرة جداً، قد يكون التحليل أبطأ.</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.helpCard}>
          <View style={styles.helpCardHeader}>
            <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
            <Text style={styles.helpCardTitle}>أنواع التحليل المتاحة</Text>
          </View>

          <View style={styles.analysisTypesHelp}>
            {[
              { icon: 'chart-pie', title: 'تحليل عام', desc: 'تحليل شامل للبيانات واكتشاف الاتجاهات والأنماط.', color: '#6c757d' },
              { icon: 'chart-line', title: 'تحليل المبيعات', desc: 'تحليل أداء المبيعات والمنتجات وقنوات البيع.', color: '#28a745' },
              { icon: 'users', title: 'تحليل العملاء', desc: 'تحليل سلوك العملاء وتقسيمهم ومعدلات الولاء.', color: '#17a2b8' },
              { icon: 'money-bill-wave', title: 'تحليل مالي', desc: 'تحليل الإيرادات والتكاليف والربحية والتدفقات النقدية.', color: '#ffc107' }
            ].map((item, index) => (
              <View key={index} style={styles.analysisTypeHelpItem}>
                <FontAwesome5 name={item.icon as React.ComponentProps<typeof FontAwesome5>['name']} size={18} color={item.color} />
                <View style={styles.analysisTypeHelpText}>
                  <Text style={styles.analysisTypeHelpTitle}>{item.title}</Text>
                  <Text style={styles.analysisTypeHelpDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.contactSupportButton} onPress={() => Alert.alert('الدعم الفني', 'سيتم فتح شاشة التواصل مع الدعم الفني قريباً.')}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.white} />
          <Text style={styles.contactSupportText}>تواصل مع الدعم الفني</Text>
        </TouchableOpacity>

        {/* Render the new lifecycle sections */}
        {renderDataLifecycleSections()}

      </View>
    );
  };

  // Render Upload Section
  const renderUploadSection = () => {
    return (
      <View style={styles.uploadSection}>
        {/* Analysis Type Selection */}
        <View style={styles.analysisTypeContainer}>
          <Text style={styles.sectionTitle}>1. اختر نوع التحليل</Text>
          <View style={styles.analysisOptions}>
            {[
              { type: 'general', icon: 'chart-pie', label: 'عام' },
              { type: 'sales', icon: 'chart-line', label: 'المبيعات' },
              { type: 'customer', icon: 'users', label: 'العملاء' },
              { type: 'financial', icon: 'money-bill-wave', label: 'مالي' }
            ].map(option => (
              <TouchableOpacity
                key={option.type}
                style={[styles.analysisOption, analysisType === option.type && styles.selectedAnalysisOption]}
                onPress={() => setAnalysisType(option.type as AnalysisType)}
              >
                <FontAwesome5 name={option.icon as React.ComponentProps<typeof FontAwesome5>['name']} size={20} color={analysisType === option.type ? COLORS.white : COLORS.primary} />
                <Text style={[styles.analysisOptionText, analysisType === option.type && styles.selectedAnalysisOptionText]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* File Upload */}
        <Text style={styles.sectionTitle}>2. ارفع الملف</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
          <FontAwesome5 name="file-upload" size={30} color={COLORS.primary} />
          <Text style={styles.uploadText}>{file ? 'تغيير الملف' : 'اختر ملفاً للتحليل'}</Text>
          <Text style={styles.supportedFormats}>الملفات المدعومة: Excel, CSV, JSON (حتى 10MB)</Text>
        </TouchableOpacity>

        {file && (
          <View style={styles.fileInfoContainer}>
            <FontAwesome5
              name={
                file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? 'file-excel' :
                file.name.endsWith('.csv') ? 'file-csv' :
                file.name.endsWith('.json') ? 'file-code' : 'file-alt'
              }
              size={24}
              color={COLORS.primary}
            />
            <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
            <TouchableOpacity onPress={() => { setFile(null); setAnalysisResult(undefined); }}>
              <FontAwesome5 name="times-circle" size={24} color={COLORS.accent || '#dc3545'} />
            </TouchableOpacity>
          </View>
        )}

        {/* Analyze Button */}
        <TouchableOpacity
          style={[styles.analyzeButton, (!file || loading) && styles.disabledButton]}
          onPress={analyzeFile}
          disabled={!file} // Remove loading from disabled condition if desired, or keep it if the button should still be disabled during loading
        >
          {/* Removed loading indicator - always show text and icon */}
          <>
            <FontAwesome5 name="brain" size={20} color={COLORS.white} style={{marginRight: 10}} />
            <Text style={styles.analyzeButtonText}>بدء التحليل بواسطة Bright AI</Text>
          </>
        </TouchableOpacity>

        {/* Analysis Results */}
        {renderAnalysisResult()}
      </View>
    );
  };

  // Main component return
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>تحليل البيانات الذكي</Text>
          <Text style={styles.headerSubtitle}>مدعوم بواسطة Bright AI</Text>
        </View>

        {/* Tab Bar Navigation */}
        <View style={styles.tabBar}>
          {[
            { key: 'upload', icon: 'file-upload', label: 'تحليل جديد' },
            { key: 'templates', icon: 'clipboard-list', label: 'القوالب' },
            { key: 'recent', icon: 'history', label: 'السابقة' },
            { key: 'help', icon: 'question-circle', label: 'مساعدة' }
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key as ActiveTab)}
            >
              <FontAwesome5
                name={tab.icon as React.ComponentProps<typeof FontAwesome5>['name']}
                size={20}
                color={activeTab === tab.key ? COLORS.primary : '#6c757d'} // Replaced COLORS.textMuted
              />
              <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Scrollable Content Area */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === 'upload' && renderUploadSection()}
          {activeTab === 'templates' && renderTemplatesSection()}
          {activeTab === 'recent' && renderRecentAnalysesSection()}
          {activeTab === 'help' && renderHelpSection()}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// Styles - Using the more detailed styles from the JS file, adapted for TS
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background || '#f8f9fa',
  },
  container: {
    flex: 1,
  },
  // Header Styles
  header: {
    // تدرج لوني للهيدر
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? SIZES.padding : SIZES.padding * 1.5,
    paddingBottom: SIZES.padding * 2.5,
    paddingHorizontal: SIZES.padding,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    // تدرج لوني عبر overlay
    overflow: 'hidden',
  },
  headerTitle: {
    ...FONTS.h2,
    color: COLORS.white,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
    textShadowColor: '#0002',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  } as TextStyle,
  headerSubtitle: {
    ...FONTS.body4,
    color: COLORS.white,
    textAlign: 'center',
    opacity: 0.95,
    marginTop: SIZES.base / 2,
    letterSpacing: 0.5,
  } as TextStyle,
  // Tab Bar Styles
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.padding,
    marginTop: -SIZES.padding * 1.5,
    borderRadius: SIZES.radius * 2,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    paddingVertical: SIZES.base * 0.7,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SIZES.base * 1.1,
    borderRadius: SIZES.radius * 1.5,
    marginHorizontal: 2,
    flexDirection: 'column',
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: COLORS.primary + '13',
    borderRadius: SIZES.radius * 1.5,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  tabText: {
    ...FONTS.body4,
    color: '#6c757d',
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  } as TextStyle,
  activeTabText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    textShadowColor: COLORS.primary + '22',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  } as TextStyle,
  // Scrollable Content Styles
  scrollContent: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: SIZES.padding * 3,
    paddingTop: SIZES.padding * 1.5,
  },
  // Section Styles
  sectionTitle: {
    ...FONTS.h3,
    color: COLORS.primary,
    marginBottom: SIZES.padding * 0.75,
    marginTop: SIZES.padding * 1.5,
    textAlign: 'right',
    fontWeight: '800',
    letterSpacing: 0.5,
  } as TextStyle,
  sectionSubtitle: {
    ...FONTS.body4,
    color: '#6c757d',
    marginBottom: SIZES.padding,
    textAlign: 'right',
    lineHeight: 18,
  } as TextStyle,
  // Analysis Type Styles
  analysisTypeContainer: {
    marginBottom: SIZES.padding * 1.5,
  },
  analysisOptions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: SIZES.base,
  },
  analysisOption: {
    backgroundColor: COLORS.white,
    paddingVertical: SIZES.padding * 1.1,
    paddingHorizontal: SIZES.padding * 1.1,
    borderRadius: SIZES.radius * 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row-reverse',
    width: '48%',
    marginBottom: SIZES.base,
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  selectedAnalysisOption: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  analysisOptionText: {
    ...FONTS.body3,
    color: COLORS.primary,
    marginLeft: SIZES.base,
    fontWeight: '700',
    fontSize: 15,
  } as TextStyle,
  selectedAnalysisOptionText: {
    color: COLORS.white,
    textShadowColor: COLORS.primary + '22',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  } as TextStyle,
  // Upload Section Styles
  uploadSection: {},
  uploadButton: {
    backgroundColor: COLORS.primary + '18',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: SIZES.radius * 2,
    paddingVertical: SIZES.padding * 1.7,
    paddingHorizontal: SIZES.padding,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.base,
    marginTop: SIZES.base,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 3,
  },
  uploadText: {
    ...FONTS.body3,
    color: COLORS.primary,
    marginTop: SIZES.base,
    fontWeight: '700',
    fontSize: 15,
  } as TextStyle,
  supportedFormats: {
    ...FONTS.body4,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: SIZES.padding * 1.5,
    marginTop: 2,
  } as TextStyle,
  fileInfoContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray || '#e9ecef',
    paddingVertical: SIZES.padding * 0.75,
    paddingHorizontal: SIZES.padding,
    borderRadius: SIZES.radius * 1.5,
    marginBottom: SIZES.padding * 1.5,
    marginTop: 2,
    elevation: 1,
  },
  fileName: {
    ...FONTS.body3,
    flex: 1,
    marginHorizontal: SIZES.base,
    textAlign: 'right',
    color: COLORS.text,
    fontWeight: '600',
  } as TextStyle,
  // Analyze Button Styles
  analyzeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.padding * 1.1,
    borderRadius: 50,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    marginBottom: SIZES.padding,
    marginTop: SIZES.base,
  },
  disabledButton: {
    backgroundColor: COLORS.lightGray || '#ced4da',
    opacity: 0.7,
    elevation: 0,
    shadowOpacity: 0,
  },
  analyzeButtonText: {
    ...FONTS.h4,
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 0.5,
  } as TextStyle,
  // Result Section Styles
  resultContainer: {
    marginTop: SIZES.padding * 1.5,
    paddingBottom: SIZES.padding * 2,
  },
  resultHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.padding,
    paddingHorizontal: 2,
  },
  resultTitle: {
    ...FONTS.h3,
    color: COLORS.primary,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
    letterSpacing: 0.5,
  } as TextStyle,
  shareButton: {
    padding: SIZES.base,
    backgroundColor: COLORS.primary + '18',
    borderRadius: 50,
    marginLeft: 6,
  },
  resultCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius * 1.5,
    padding: SIZES.padding * 1.3,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 6,
    marginBottom: SIZES.padding,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  resultSectionContainer: {
    marginBottom: SIZES.padding,
    backgroundColor: COLORS.primary + '09',
    borderRadius: SIZES.radius,
    padding: SIZES.base,
    marginTop: 2,
  },
  resultSubtitle: {
    ...FONTS.h4,
    color: '#343a40',
    marginBottom: SIZES.base * 0.75,
    marginTop: SIZES.padding * 0.75,
    textAlign: 'right',
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray || '#eee',
    paddingBottom: SIZES.base / 2,
    letterSpacing: 0.2,
  } as TextStyle,
  resultText: {
    ...FONTS.body3,
    color: COLORS.text,
    textAlign: 'right',
    lineHeight: 22,
    marginBottom: SIZES.base,
    fontWeight: '500',
  } as TextStyle,
  resultListItem: {
    ...FONTS.body3,
    color: COLORS.text,
    textAlign: 'right',
    lineHeight: 22,
    marginBottom: SIZES.base / 2,
    marginRight: SIZES.base,
    fontWeight: '500',
  } as TextStyle,
  // Templates Section Styles
  templatesSection: {
    paddingTop: SIZES.padding,
  },
  templatesList: {},
  templateCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius * 1.5,
    padding: SIZES.padding * 1.1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: SIZES.padding * 0.75,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  templateIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SIZES.padding,
    backgroundColor: COLORS.primary + '22',
    elevation: 1,
  },
  templateName: {
    ...FONTS.body3,
    color: COLORS.text,
    flex: 1,
    textAlign: 'right',
    fontWeight: '700',
    fontSize: 15,
  } as TextStyle,
  // Recent Analyses Section Styles
  recentSection: {
    paddingTop: SIZES.padding,
  },
  recentAnalysisCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius * 1.5,
    padding: SIZES.padding,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: SIZES.padding * 0.75,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.09,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  recentAnalysisIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SIZES.padding,
    backgroundColor: COLORS.primary + '22',
  },
  recentAnalysisInfo: {
    flex: 1,
    marginRight: SIZES.base,
  },
  recentAnalysisName: {
    ...FONTS.body3,
    color: COLORS.text,
    fontWeight: '700',
    textAlign: 'right',
    fontSize: 15,
  } as TextStyle,
  recentAnalysisDate: {
    ...FONTS.body4,
    color: '#6c757d',
    textAlign: 'right',
    fontSize: 12,
  } as TextStyle,
  emptyStateText: {
    ...FONTS.body3,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: SIZES.padding * 2,
    fontWeight: '600',
  } as TextStyle,
  // Help Section Styles
  helpSection: {
    paddingTop: SIZES.padding,
  },
  helpCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius * 1.5,
    padding: SIZES.padding,
    marginBottom: SIZES.padding,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.09,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  helpCardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helpCardTitle: {
    ...FONTS.h4,
    color: COLORS.primary,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
    marginHorizontal: SIZES.base,
    letterSpacing: 0.2,
  } as TextStyle,
  tipsContainer: {
    marginTop: SIZES.padding,
    paddingRight: SIZES.base,
  },
  tipText: {
    ...FONTS.body4,
    color: COLORS.text,
    marginBottom: SIZES.base * 0.75,
    lineHeight: 18,
    textAlign: 'right',
    fontWeight: '500',
  } as TextStyle,
  analysisTypesHelp: {
    marginTop: SIZES.padding,
  },
  analysisTypeHelpItem: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    marginBottom: SIZES.padding * 0.75,
  },
  analysisTypeHelpText: {
    flex: 1,
    marginLeft: SIZES.base,
  },
  analysisTypeHelpTitle: {
    ...FONTS.body3,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'right',
    fontSize: 15,
  } as TextStyle,
  analysisTypeHelpDesc: {
    ...FONTS.body4,
    color: '#6c757d',
    textAlign: 'right',
    lineHeight: 18,
    fontWeight: '500',
  } as TextStyle,
  contactSupportButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.padding * 0.9,
    borderRadius: 50,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.padding,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
  },
  contactSupportText: {
    ...FONTS.body3,
    color: COLORS.white,
    fontWeight: 'bold',
    marginLeft: SIZES.base,
    fontSize: 15,
  } as TextStyle,
  // Styles for New Info Sections
  infoSectionContainer: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius * 1.5,
    padding: SIZES.padding,
    marginBottom: SIZES.padding,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.09,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  infoSectionTitle: {
    ...FONTS.h4,
    color: COLORS.primary,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingBottom: SIZES.base,
    letterSpacing: 0.2,
  } as TextStyle,
  infoStepItem: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    marginBottom: SIZES.padding * 0.75,
  },
  infoStepIcon: {
    marginHorizontal: SIZES.padding * 0.75,
    marginTop: 3,
  },
  infoStepTextContainer: {
    flex: 1,
  },
  infoStepTitle: {
    ...FONTS.body3,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'right',
    marginBottom: SIZES.base / 2,
    fontSize: 15,
  } as TextStyle,
  infoStepDescription: {
    ...FONTS.body4,
    color: '#6c757d',
    textAlign: 'right',
    lineHeight: 18,
    fontWeight: '500',
  } as TextStyle,
});
