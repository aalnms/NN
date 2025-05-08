import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import SupportChat from '../components/SupportChat';
import { COLORS, FONTS, SIZES } from './theme.js'; // Assuming theme.js exists and is configured

// Sample data for the chart
const usageData = {
  labels: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو"],
  datasets: [
    { 
      data: [20, 45, 28, 80, 99, 43],
      color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`, // optional
      strokeWidth: 2 // optional
    }
  ],
  legend: ["استخدام التطبيق"] // optional
};

// Chart configuration
const chartConfig = {
  backgroundGradientFrom: "#ffffff",
  backgroundGradientFromOpacity: 0.8,
  backgroundGradientTo: "#ffffff",
  backgroundGradientToOpacity: 0.8,
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  strokeWidth: 2, // optional, default 3
  barPercentage: 0.5,
  useShadowColorFromDataset: false // optional
};

// Dummy articles (latest 2)
const latestArticles = [
  {
    id: '1',
    title: 'مقدمة في الذكاء الاصطناعي',
    date: '25 مارس 2025',
    imageUrl: 'https://picsum.photos/seed/ai1/50/50',
  },
  {
    id: '2',
    title: 'تعلم الآلة للمبتدئين',
    date: '20 مارس 2025',
    imageUrl: 'https://picsum.photos/seed/ml1/50/50',
  },
];

const screenWidth = Dimensions.get('window').width;

const HomeScreen = ({ navigation }) => {
  const [showSupport, setShowSupport] = useState(false);

  // شعار التطبيق
  const logoSource = require('../assets/images/logo-without.jpg');

  // خدمة واحدة كزر تفاعلي
  const ServiceButton = ({ icon, label, color, onPress }) => (
    <TouchableOpacity style={styles.serviceButton} onPress={onPress}>
      <FontAwesome5 name={icon} size={28} color={color} />
      <Text style={styles.serviceButtonLabel}>{label}</Text>
    </TouchableOpacity>
  );

  // عنصر مقال حديث
  const renderArticle = ({ item }) => (
    <View style={styles.articleCard}>
      <Image source={{ uri: item.imageUrl }} style={styles.articleImage} />
      <View style={{ flex: 1 }}>
        <Text style={styles.articleTitle}>{item.title}</Text>
        <Text style={styles.articleDate}>{item.date}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* شعار ورسالة */}
        <View style={styles.header}>
          <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Bright AI</Text>
          <Text style={styles.headerSubtitle}>حلول ذكاء اصطناعي مبتكرة للأعمال</Text>
        </View>

        {/* قسم الخدمات الجديد */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>ابدأ مشروعك</Text>
          <View style={styles.servicesRow}>
            <ServiceButton
              icon="gamepad"
              label="انشاء الالعاب"
              color="#6a1b9a" // Example color
              onPress={() => navigation.navigate('GameCreation')} // Placeholder navigation
            />
            <ServiceButton
              icon="mobile-alt"
              label="انشاء تطبيقات"
              color="#1e88e5" // Example color
              onPress={() => navigation.navigate('AppCreation')} // Placeholder navigation
            />
            <ServiceButton
              icon="code"
              label="البرمجة"
              color="#00acc1" // Example color
              onPress={() => navigation.navigate('Programming')} // Placeholder navigation
            />
          </View>
        </View>

        {/* موجز المقالات الجديدة */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>أحدث المقالات</Text>
          <FlatList
            data={latestArticles}
            renderItem={renderArticle}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 4 }}
          />
        </View>

        {/* إحصائيات الاستخدام */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>إحصائيات الاستخدام</Text>
          <LineChart
            data={usageData}
            width={screenWidth * 0.9}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>
      </ScrollView>

      {/* زر الدعم الفني العائم */}
      <TouchableOpacity style={styles.supportFab} onPress={() => setShowSupport(true)}>
        <Ionicons name="chatbubble-ellipses" size={24} color={COLORS.white} />
      </TouchableOpacity>
      <SupportChat visible={showSupport} onClose={() => setShowSupport(false)} />

      {/* شريط تنقل سفلي (اختياري - يتطلب تكامل مع Navigation) */}
      {/* ...يمكن إضافة BottomTabNavigator هنا حسب الحاجة... */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background || '#f8f9fa' },
  scrollContainer: { paddingBottom: 100, paddingTop: 30 },
  header: { alignItems: 'center', marginBottom: SIZES.padding * 2 },
  logo: { width: 80, height: 80, marginBottom: 10 },
  headerTitle: { ...FONTS.h1, color: COLORS.primary, fontWeight: 'bold', letterSpacing: 1 },
  headerSubtitle: { ...FONTS.body2, color: COLORS.secondary, marginTop: 4, marginBottom: 8, textAlign: 'center' },
  servicesSection: { // Style for the new section container
    marginBottom: SIZES.padding * 1.5,
    paddingHorizontal: SIZES.padding,
  },
  servicesRow: {
    flexDirection: 'row-reverse', // Keep items aligned right-to-left
    justifyContent: 'space-around', // Distribute space between buttons
    marginBottom: SIZES.padding * 2,
    marginHorizontal: 8,
  },
  serviceButton: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius * 1.5,
    padding: 18,
    elevation: 2,
    width: 100,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    minHeight: 110, // Ensure buttons have enough height
  },
  serviceButtonLabel: {
    ...FONTS.body3,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
  },
  sectionBox: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.padding,
    marginHorizontal: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  sectionTitle: {
    ...FONTS.h4,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'right',
  },
  articleCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray || '#f1f3f6',
    borderRadius: 12,
    padding: 10,
    marginRight: 8,
    minWidth: 180,
  },
  articleImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 10,
  },
  articleTitle: {
    ...FONTS.body3,
    color: COLORS.text,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  articleDate: {
    ...FONTS.caption,
    color: COLORS.textMuted || '#6c757d',
    textAlign: 'right',
    fontSize: 10,
  },
  supportFab: {
    position: 'absolute',
    left: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default HomeScreen;
