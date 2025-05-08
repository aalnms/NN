import QuantumComputingArticle from '../../components/library/QuantumComputingArticle';
import { Stack } from 'expo-router';

export default function QuantumComputing() {
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
      <QuantumComputingArticle />
    </>
  );
}
