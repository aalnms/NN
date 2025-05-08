import { ScrollView, StyleSheet, Image } from 'react-native';
import { Stack } from 'expo-router';
import NeuralNetworksArticle from '../../components/library/NeuralNetworksArticle';

export default function NeuralNetworksScreen() {
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
      <ScrollView style={styles.container}>
        <Image 
          source={require('../../assets/images/AADOH1ywK1.png')}
          style={styles.headerImage}
        />
        <NeuralNetworksArticle />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
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
