import { Stack } from 'expo-router';
import DeepLearningArticle from '@/components/library/DeepLearningArticle';

export default function DeepLearning() {
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
      <DeepLearningArticle />
    </>
  );
}
