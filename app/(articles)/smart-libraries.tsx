import SmartLibrariesArticle from '../../components/library/SmartLibrariesArticle'; // استيراد المقالة
import { Stack } from 'expo-router'; // استيراد Stack
import { StyleSheet } from 'react-native'; // التأكد من استيراد StyleSheet

export default function SmartLibrariesScreen() {
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
      <SmartLibrariesArticle /> {/* استخدام المقالة */}
    </>
  );
}

const styles = StyleSheet.create({ // إصلاح StyleSheet.create
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'right',
  },
});
