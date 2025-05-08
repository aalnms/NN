import { Stack } from 'expo-router';
import AIBiasInAlgorithmsArticle from '../../components/library/AIBiasInAlgorithmsArticle';

export default function AIBiasInAlgorithmsPage() {
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
      <AIBiasInAlgorithmsArticle />
    </>
  );
}
