import { useNavigation } from '@react-navigation/native';
import HomeScreenComponent from '../../src/HomeScreen.js';

export default function HomeScreen() {
  const navigation = useNavigation();
  return <HomeScreenComponent navigation={navigation} />;
}
