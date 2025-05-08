import { Stack } from 'expo-router';
import AIHealthcareArticle from '@/components/library/AIHealthcareArticle';

export default function AIHealthcare() {
  return (
    <>
      <Stack.Screen 
        options={{
          headerTitle: "المكتبة الذكية",
          headerBackTitle: "العودة",
          headerTitleStyle: {
            fontWeight: '600'
          }
        }} 
      />
      <AIHealthcareArticle />
    </>
  );
}
