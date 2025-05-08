import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import ChatAgentBox from '../../components/ChatAgentBox'; // Adjust path if necessary
import { COLORS } from '../../src/theme'; // Adjust path if necessary

export default function AgentChatScreen() {
  // Get the parameters passed from the Link component, including the id
  const { id, agentName, description, placeholderText } = useLocalSearchParams<{
    id: string; // Add id here
    agentName: string;
    description: string;
    placeholderText: string;
  }>();

  // Provide default values or handle cases where params might be missing
  const name = agentName || 'Agent';
  const agentId = id || 'unknown'; // Get the agent ID, provide a fallback
  const desc = description || 'Chat with this agent.';
  const placeholder = placeholderText || 'Type your message...';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Configure the header title dynamically */}
      <Stack.Screen options={{ title: name }} />
      <View style={styles.container}>
        <ChatAgentBox
          agentId={agentId} // Pass the agentId prop
          agentName={name}
          description={desc}
          placeholderText={placeholder}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background, // Match background
  },
  container: {
    flex: 1,
    padding: 10, // Add some padding around the chat box
  },
});
