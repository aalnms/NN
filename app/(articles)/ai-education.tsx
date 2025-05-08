import { Stack } from 'expo-router';
import AIEducationArticle from '../../components/library/AIEducationArticle';

export default function AIEducationPage() {
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
      <AIEducationArticle />
    </>
  );
}
