import { Stack } from 'expo-router';
import MachineLearningArticle from '@/components/library/MachineLearningArticle';

export default function MachineLearning() {
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
      <MachineLearningArticle />
    </>
  );
}
