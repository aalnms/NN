import DesignThinking2025Article from '../../components/library/DesignThinking2025Article';
import { Stack } from 'expo-router';

export default function DesignThinking2025() {
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
      <DesignThinking2025Article />
    </>
  );
}
