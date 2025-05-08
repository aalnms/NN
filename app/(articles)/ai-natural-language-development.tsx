import { Stack } from 'expo-router';
import AINaturalLanguageDevelopmentArticle from '../../components/library/AINaturalLanguageDevelopmentArticle';

export default function AINaturalLanguageDevelopmentPage() {
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
      <AINaturalLanguageDevelopmentArticle />
    </>
  );
}
