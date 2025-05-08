import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Image, TouchableOpacity, Dimensions, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const featuredArticles = [
  {
    id: '1',
    title: 'مستقبل الذكاء الاصطناعي في التعليم',
    image: require('../../assets/images/2.jpg'),
  },
  {
    id: '2',
    title: 'أفضل 10 كتب للمبتكرين',
    image: require('../../assets/images/14DA819B-0579-46CC-9E93-FE1DBB4B5720.png'),
  },
  {
    id: '3',
    title: 'كيف تغير التكنولوجيا المكتبات',
    image: require('../../assets/images/تنزيل (1).jpeg'),
  },
];

const categories = ['ذكاء اصطناعي', 'ابتكار', 'تكنولوجيا', 'علوم', 'تصميم', 'أعمال'];

const articles = [
  {
    id: 'a1',
    title: 'أساسيات التعلم العميق',
    summary: 'دليل شامل لفهم التعلم العميق وتطبيقاته في الذكاء الاصطناعي.',
    image: require('../../assets/images/تنزيل (3).jpeg'),
  },
  {
    id: 'a2',
    title: 'معالجة اللغة الطبيعية للمبتدئين',
    summary: 'كيف تعمل تقنيات معالجة اللغة الطبيعية وتطبيقاتها في الذكاء الاصطناعي.',
    image: require('../../assets/images/تنزيل (4).jpeg'),
  },
  {
    id: 'a3',
    title: 'تصميم التفكير في عام 2025',
    summary: ' كيف يتطور التفكير التصميمي مع الأدوات والعقليات الجديدة.',
    image: require('../../assets/images/تنزيل.jpeg'),
  },
  {
    id: 'a4',
    title: 'استكشاف الحوسبة الكمومية',
    summary: 'دليل للمبتدئين حول عالم الحواسيب الكمومية وإمكاناتها المستقبلية.',
    image: require('../../assets/images/C1E06BA7-E7B3-4F36-8328-F9D57E390E20.png'),
  },
  {
    id: 'a5',
    title: ' صعود المكتبات الذكية',
    summary: '  المكتبات تصبح أكثر رقمية واتصالًا وتركزًا على المستخدم.',
    image: require('../../assets/images/DFF0896E-9437-45C5-AE2B-AE72744E6F01.png'),
  },
  {
    id: 'a6',
    title: 'شبكات التعلم العصبية والتطبيقات العملية',
    summary: 'دليل تفصيلي حول كيفية عمل الشبكات العصبية وتطبيقاتها في العالم الحقيقي.',
    image: require('../../assets/images/AADOH1ywK1.png'),
  },
  {
    id: 'a7',
    title: 'تقنيات التعلم الآلي للبيانات الضخمة',
    summary: 'كيفية استخدام التعلم الآلي في تحليل ومعالجة البيانات الضخمة بكفاءة.',
    image: require('../../assets/images/ahyqACmg4F.png'),
  },
  {
    id: 'a8',
    title: 'الذكاء الاصطناعي في الرعاية الصحية',
    summary: 'استكشاف تطبيقات الذكاء الاصطناعي في تحسين الرعاية الصحية والتشخيص الطبي.',
    image: require('../../assets/images/fjzBCVfDak.png'),
  },
  // أوراق علمية جديدة
  {
    id: 'a9',
    title: 'ورقة علمية: تعزيز التعلم العميق باستخدام البيانات الضخمة',
    summary: 'دراسة حول كيفية تحسين أداء نماذج التعلم العميق من خلال تقنيات معالجة البيانات الضخمة.',
    image: require('../../assets/images/DeepLearningWithBigDataArticle.jpg'),
  },
  {
    id: 'a10',
    title: 'بحث: أخلاقيات الذكاء الاصطناعي في اتخاذ القرار',
    summary: 'تحليل معمق للتحديات الأخلاقية التي تواجه الذكاء الاصطناعي في المجالات الحساسة.',
    image: require('../../assets/images/AIEthicsInDecisionMakingArticle.jpg'),
  },
  {
    id: 'a11',
    title: 'دراسة: الذكاء الاصطناعي وتطوير اللغات الطبيعية',
    summary: 'مراجعة أحدث الأساليب في معالجة اللغة الطبيعية باستخدام الذكاء الاصطناعي.',
    image: require('../../assets/images/AIBiasInAlgorithmsArticle.jpg'),
  },
  {
    id: 'a12',
    title: 'ورقة بحثية: الذكاء الاصطناعي في التعليم الذكي',
    summary: 'استكشاف تطبيقات الذكاء الاصطناعي في تطوير أنظمة التعليم الذكية والشخصية.',
    image: require('../../assets/images/AIEducationArticle.jpg'),
  },
  {
    id: 'a13',
    title: 'بحث: التحيز في خوارزميات الذكاء الاصطناعي',
    summary: 'دراسة حول مصادر التحيز في الخوارزميات وطرق الحد منها.',
    image: require('../../assets/images/AINaturalLanguageDevelopmentArticle.jpg'),
  },
];

export default function BlogScreen() {
  const router = useRouter();

  return (
    <ImageBackground
      source={require('../../assets/Background/librarybackground.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>المكتبة الذكية</Text>
          <Text style={styles.subtitle}>اكتشف أحدث المقالات والكتب</Text>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            placeholder="ابحث عن كتاب أو مقال..."
            placeholderTextColor="#888"
            style={styles.searchInput}
          />
        </View>

        <Text style={styles.sectionTitle}> مميزة</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredScroll}>
          {featuredArticles.map((item) => (
            <TouchableOpacity key={item.id} style={styles.featuredCard}>
              <Image source={item.image} style={styles.featuredImage} />
              <Text style={styles.featuredTitle}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>التصنيفات</Text>
        <View style={styles.categoriesContainer}>
          {categories.map((cat, index) => (
            <TouchableOpacity key={index} style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>الأحدث </Text>
        <View style={styles.articlesContainer}>
          {articles.map((article) => (
            <TouchableOpacity
              key={article.id}
              style={styles.articleCard}
              onPress={() => {
                if (article.title === 'معالجة اللغة الطبيعية للمبتدئين') {
                  router.push('/(articles)/natural-language');
                } else if (article.title === 'استكشاف الحوسبة الكمومية') {
                  router.push('/(articles)/quantum-computing');
                } else if (article.title === 'تصميم التفكير في عام 2025') {
                  router.push('/(articles)/design-thinking-2025');
                } else if (article.title === ' صعود المكتبات الذكية') {
                  router.push('/(articles)/smart-libraries');
                } else if (article.title === 'شبكات التعلم العصبية والتطبيقات العملية') {
                  router.push('/(articles)/neural-networks');
                } else if (article.title === 'تقنيات التعلم الآلي للبيانات الضخمة') {
                  router.push('/(articles)/machine-learning');
                } else if (article.title === 'أساسيات التعلم العميق') {
                  router.push('/(articles)/deep-learning');
                } else if (article.title === 'الذكاء الاصطناعي في الرعاية الصحية') {
                  router.push('/(articles)/ai-healthcare');
                } else if (article.title === 'ورقة علمية: تعزيز التعلم العميق باستخدام البيانات الضخمة') {
                  router.push('/(articles)/deep-learning-with-big-data');
                } else if (article.title === 'بحث: أخلاقيات الذكاء الاصطناعي في اتخاذ القرار') {
                  router.push('/(articles)/ai-ethics-in-decision-making');
                } else if (article.title === 'دراسة: الذكاء الاصطناعي وتطوير اللغات الطبيعية') {
                  router.push('/(articles)/ai-natural-language-development');
                } else if (article.title === 'ورقة بحثية: الذكاء الاصطناعي في التعليم الذكي') {
                  router.push('/(articles)/ai-education');
                } else if (article.title === 'بحث: التحيز في خوارزميات الذكاء الاصطناعي') {
                  router.push('/(articles)/ai-bias-in-algorithms');
                }
              }}
            >
              <Image source={article.image} style={styles.articleImage} />
              <View style={styles.articleContent}>
                <Text style={styles.articleTitle}>{article.title}</Text>
                <Text style={styles.articleSummary}>{article.summary}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    // backgroundColor: '#f7f9fc', // تم إزالة اللون الخلفي ليظهر صورة الخلفية
    // تم إزالة الطبقة الشفافة بناءً على طلب المستخدم
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    paddingTop: 50,
  },
  header: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  logo: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 15,
    color: '#fff',
    marginTop: 4,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  searchContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  searchInput: {
    fontSize: 16,
    color: '#333',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 12,
    color: '#333',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  featuredScroll: {
    paddingHorizontal: 4,
    flexDirection: 'row-reverse',
  },
  featuredCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginLeft: 12,
    width: width * 0.5,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
  },
  featuredImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  featuredTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  categoriesContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  categoryBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    color: '#333',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  articlesContainer: {
    marginBottom: 30,
  },
  articleCard: {
    flexDirection: 'row-reverse',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  articleImage: {
    width: 100,
    height: 100,
  },
  articleContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#222',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  articleSummary: {
    fontSize: 14,
    color: '#666',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
