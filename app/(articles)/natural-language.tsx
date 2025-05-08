import { Stack } from 'expo-router';
import NaturalLanguageArticle from '@/components/library/NaturalLanguageArticle';
import React from 'react';
import { View } from 'react-native';

const NaturalLanguage: React.FC = () => {
  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <Stack.Screen 
        options={{
          headerTitle: "معالجة اللغة الطبيعية",
          headerBackTitle: "العودة",
          headerTitleStyle: {
            fontWeight: '600'
          },
          headerTitleAlign: 'center'
        }} 
      />
      <NaturalLanguageArticle />
    </View>
  );
}

export default NaturalLanguage;
