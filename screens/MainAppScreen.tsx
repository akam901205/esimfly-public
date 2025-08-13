import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';

type MainAppScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainApp'>;

type Props = {
  navigation: MainAppScreenNavigationProp;
};

export default function MainAppScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  
  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('tokenExpires');
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Math.max(insets.top, 10) }]}>
      <Text style={styles.title}>Welcome to the App!</Text>
      <Text style={styles.subtitle}>You are now logged in.</Text>
      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fbfbfc',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#00001d',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    color: '#43415e',
  },
  button: {
    backgroundColor: '#6661ee',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});