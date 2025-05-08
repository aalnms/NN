import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../src/theme'; // Adjusted path

const AppCreationScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>إنشاء التطبيقات</Text>
      <Text style={styles.description}>
      استكشف الأدوات والموارد لتطوير تطبيقات مبتكرة مدعومة بالذكاء الاصطناعي.
      </Text>
      {/* Add more specific content, tools, or links here */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background || '#f8f9fa',
  },
  title: {
    ...FONTS.h2,
    color: COLORS.primary,
    marginBottom: 15,
    textAlign: 'center',
  },
  description: {
    ...FONTS.body3,
    color: COLORS.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default AppCreationScreen;
