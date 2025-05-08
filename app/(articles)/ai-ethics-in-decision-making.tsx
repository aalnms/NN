import { Stack } from 'expo-router';
import AIEthicsInDecisionMakingArticle from '../../components/library/AIEthicsInDecisionMakingArticle';

export default function AIEthicsInDecisionMakingPage() {
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
      <AIEthicsInDecisionMakingArticle />
    </>
  );
}
