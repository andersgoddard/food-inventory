import { Spacing } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Something went wrong</ThemedText>
        <ThemedText type="default">Please try again.</ThemedText>
        <Pressable accessibilityRole="button" onPress={this.handleRetry} style={styles.button}>
          <ThemedText type="default" style={styles.buttonText}>Try again</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  button: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: '#007AFF',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
});