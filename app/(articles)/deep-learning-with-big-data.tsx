import { Stack } from 'expo-router';
import { DeepLearningWithBigDataArticle } from '../../components/library/DeepLearningWithBigDataArticle';

export default function DeepLearningWithBigDataPage() {
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
      <DeepLearningWithBigDataArticle />
    </>
  );
}
