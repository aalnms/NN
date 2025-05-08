import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../theme'; // Adjust path as needed

const ProgrammingScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>البرمجة</Text>
      <Text style={styles.description}>
        تعلم البرمجة بمساعدة الذكاء الاصطناعي، واحصل على أدوات ومساعدة لتسريع عملية التطوير.
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

export default ProgrammingScreen;
