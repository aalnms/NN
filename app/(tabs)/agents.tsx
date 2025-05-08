import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, Dimensions, ActivityIndicator, ScrollView, Animated, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../../src/firebaseConfig';
import { collection, doc, setDoc, increment, onSnapshot } from 'firebase/firestore';
import { COLORS, SIZES, FONTS } from '../../src/theme';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; // تحتاج لتثبيت المكتبة

const { width } = Dimensions.get('window');
const numColumns = 2;
const itemMargin = SIZES.padding / 2;
const itemWidth = (width - itemMargin * (numColumns + 1)) / numColumns;

const collaborativeLearningAgents = [
  {
    id: '7',
    name: 'مدرس الرياضيات',
    description: 'معلم ذكي متخصص في مادة الرياضيات للصف الأول الابتدائي.',
    shortDescription: 'مدرس الرياضيات',
    placeholder: 'اسأل عن درس في الرياضيات...',
    icon: 'calculator',
  },
  {
    id: '8',
    name: 'مدرس العلوم',
    description: 'معلم ذكي متخصص في مادة العلوم للصف الأول الابتدائي.',
    shortDescription: 'مدرس العلوم',
    placeholder: 'اسأل عن درس في العلوم...',
    icon: 'flask',
  },
  {
    id: '9',
    name: 'مدرس الدراسات الإسلامية',
    description: 'معلم ذكي متخصص في مادة الدراسات الإسلامية للصف الأول الابتدائي.',
    shortDescription: 'مدرس الدراسات الإسلامية',
    placeholder: 'اسأل عن درس في الدراسات الإسلامية...',
    icon: 'mosque',
  },
  {
    id: '10',
    name: 'مدرس لغتي',
    description: 'معلم ذكي متخصص في مادة لغتي للصف الأول الابتدائي.',
    shortDescription: 'مدرس لغتي',
    placeholder: 'اسأل عن درس في لغتي...',
    icon: 'book',
  },
  {
    id: '11',
    name: 'مدرس الإنجليزي',
    description: 'معلم ذكي متخصص في مادة الإنجليزي للصف الأول الابتدائي.',
    shortDescription: 'مدرس الإنجليزي',
    placeholder: 'اسأل عن درس في الإنجليزي...',
    icon: 'language',
  },
  {
    id: '12',
    name: 'مدرس التربية الفنية',
    description: 'معلم ذكي متخصص في مادة التربية الفنية للصف الأول الابتدائي.',
    shortDescription: 'مدرس التربية الفنية',
    placeholder: 'اسأل عن درس في التربية الفنية...',
    icon: 'paint-brush',
  },
  {
    id: '13',
    name: 'مدرس المهارات الحياتية',
    description: 'معلم ذكي متخصص في مادة المهارات الحياتية للصف الأول الابتدائي.',
    shortDescription: 'مدرس المهارات الحياتية',
    placeholder: 'اسأل عن درس في المهارات الحياتية...',
    icon: 'hands-helping',
  },
];

const otherAgents = [
  {
    id: '1',
    name: 'BrightSupport',
    description: 'روبوت محادثة متخصص في خدمة العملاء، يقدم دعماً فورياً على مدار الساعة ويحل المشكلات الشائعة بكفاءة عالية.',
    shortDescription: 'روبوت خدمة عملاء',
    placeholder: 'كيف يمكنني مساعدتك اليوم؟',
    icon: 'headset',
  },
  {
    id: '2',
    name: 'BrightSales',
    description: 'روبوت ذكي يساعد في تأهيل العملاء المحتملين وزيادة المبيعات من خلال التفاعل الشخصي والإجابة على استفسارات المنتجات.',
    shortDescription: 'روبوت مبيعات',
    placeholder: 'هل لديك أي استفسار عن منتجاتنا؟',
    icon: 'chart-line',
  },
  {
    id: '3',
    name: 'BrightRecruiter',
    description: 'روبوت متخصص في عمليات التوظيف، يساعد في فرز السير الذاتية وإجراء المقابلات الأولية وتقييم المرشحين بكفاءة.',
    shortDescription: 'روبوت توظيف',
    placeholder: 'أخبرني عن خبراتك أو اسأل عن الوظائف الشاغرة...',
    icon: 'user-tie',
  },
  {
    id: '4',
    name: 'BrightProject',
    description: 'روبوت إدارة مشاريع ذكي يساعد في تنظيم المهام ومتابعة التقدم وتحسين التواصل بين أعضاء الفريق.',
    shortDescription: 'روبوت إدارة مشاريع',
    placeholder: 'ما هي المهمة التي تريد تنظيمها أو متابعتها؟',
    icon: 'tasks',
  },
  {
    id: '5',
    name: 'BrightMath',
    description: 'مساعد متخصص في تعليم الرياضيات للطلاب الثانوية ومساعدتك في المشاريع، يقدم شرحاً مفصلاً وحلولاً للمسائل الرياضية بأسلوب سهل وتفاعلي.',
    shortDescription: 'مساعد رياضيات',
    placeholder: 'ما هي المسألة الرياضية التي تحتاج مساعدة فيها؟',
    icon: 'calculator',
  },
  {
    id: '6',
    name: 'BrightTourism',
    description: 'مرشد سياحي ذكي يقدم معلومات شاملة عن المواقع السياحية والتراثية في المملكة العربية السعودية.',
    shortDescription: 'مرشد سياحي',
    placeholder: 'عن أي معلم سياحي في السعودية تود أن تسأل؟',
    icon: 'map-marked-alt',
  },
];

type Agent = typeof collaborativeLearningAgents[0] | typeof otherAgents[0];
type AgentCounts = Record<string, number>;
const AGENTS_COLLECTION = 'agentCounts';

export default function AgentsScreen() {
  const [agentCounts, setAgentCounts] = useState<AgentCounts>({});
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const router = useRouter();

  // Fetch counts from Firestore and set up real-time listener
  useEffect(() => {
    setIsLoading(true);
    const countsCollectionRef = collection(db, AGENTS_COLLECTION);
    const initialCounts: AgentCounts = {};

    // Set up the real-time listener
    const unsubscribe = onSnapshot(countsCollectionRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          const data = change.doc.data();
          initialCounts[change.doc.id] = data.count || 0;
        }
        // Handle 'removed' if needed, though unlikely for counters
      });
      // Ensure all agents have a count, even if not in Firestore yet
      [...collaborativeLearningAgents, ...otherAgents].forEach(agent => {
        if (!(agent.id in initialCounts)) {
          initialCounts[agent.id] = 0;
        }
      });
      setAgentCounts({ ...initialCounts }); // Update state with latest counts
      setIsLoading(false); // Loading finished after initial fetch/update
    }, (error) => {
      console.error("Error fetching agent counts: ", error);
      setIsLoading(false); // Stop loading even on error
      // Optionally show an error message to the user
    });

    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Function to increment count in Firestore
  const handleAgentPress = async (agent: Agent) => {
    const agentId = agent.id;
    const agentDocRef = doc(db, AGENTS_COLLECTION, agentId);

    try {
      // Use setDoc with merge: true to create the document if it doesn't exist,
      // and increment the count field.
      await setDoc(agentDocRef, { count: increment(1) }, { merge: true });
      console.log(`Incremented count for agent ${agentId}`);
    } catch (e) {
      console.error(`Failed to increment count for agent ${agentId}`, e);
      // Handle error - maybe show a message to the user
      // Note: State updates are now handled by the onSnapshot listener,
      // so no optimistic update is strictly needed here, but could be added
      // for faster perceived UI response if desired.
    }

    // Navigate after attempting increment
    router.push({
      // Use object syntax for pathname with dynamic segment
      pathname: '/chat/[id]',
      params: {
        id: agent.id, // Pass the agent id as a param
        agentName: agent.name,
        description: agent.description,
        placeholderText: agent.placeholder,
      },
    });
  };

  // تأثير ضغط البطاقة
  const renderAgentItem = ({ item: agent }: { item: Agent }) => (
    <Pressable
      key={agent.id}
      style={({ pressed: isPressed }) => [
        styles.agentItem,
        isPressed && styles.agentItemPressed,
      ]}
      onPress={() => handleAgentPress(agent)}
    >
      <View style={styles.usageBadge}>
        <FontAwesome5 name="fire" size={12} color="#fff" />
        <Text style={styles.usageBadgeText}>
          {agentCounts[agent.id] !== undefined ? agentCounts[agent.id] : '...'}
        </Text>
      </View>
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        style={styles.iconGradient}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
      >
        <View style={styles.iconShadow}>
          <FontAwesome5 name={agent.icon} size={30} color="#fff" />
        </View>
      </LinearGradient>
      <View style={styles.agentTextContainer}>
        <Text style={styles.agentName}>{agent.name}</Text>
        <Text style={styles.agentDescription}>{agent.shortDescription}</Text>
      </View>
    </Pressable>
  );

  const renderAgentSection = (title: string, agents: Agent[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        data={agents}
        renderItem={renderAgentItem}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        style={styles.flatList}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  if (isLoading) {
    return (
      <LinearGradient colors={[COLORS.background, COLORS.primary]} style={styles.gradientBg}>
        <SafeAreaView style={[styles.safeArea, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>جاري تحميل بيانات الوكلاء...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[COLORS.background, COLORS.primary]} style={styles.gradientBg}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {renderAgentSection('التعلم التعاوني والتشاركي', collaborativeLearningAgents)}
          {renderAgentSection('قسم مشترك', otherAgents)}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBg: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContainer: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: SIZES.padding * 2,
    paddingTop: SIZES.padding,
  },
  section: {
    marginBottom: SIZES.padding * 2,
  },
  sectionTitle: {
    ...FONTS.h2,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SIZES.padding,
    fontWeight: 'bold',
    letterSpacing: 1,
    textShadowColor: COLORS.secondary,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  flatList: {
    flex: 1,
  },
  flatListContent: {
    paddingHorizontal: itemMargin / 2,
    paddingBottom: SIZES.padding,
  },
  agentItem: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius * 2.5,
    marginBottom: itemMargin * 2,
    marginHorizontal: itemMargin / 2,
    width: itemWidth,
    padding: SIZES.padding,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
    transform: [{ scale: 1 }],
    transitionDuration: '150ms',
  },
  agentItemPressed: {
    transform: [{ scale: 0.97 }],
    shadowOpacity: 0.08,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.padding * 0.8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  iconShadow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentTextContainer: {
    alignItems: 'center',
  },
  agentName: {
    ...FONTS.h4,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SIZES.base * 0.5,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  agentDescription: {
    ...FONTS.body4,
    color: COLORS.text,
    textAlign: 'center',
    paddingHorizontal: SIZES.base,
    marginBottom: SIZES.base * 0.5,
    opacity: 0.85,
  },
  usageBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  usageBadgeText: {
    ...FONTS.caption,
    color: '#fff',
    marginLeft: 4,
    fontWeight: 'bold',
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: SIZES.padding,
    ...FONTS.body3,
    color: COLORS.primary,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
