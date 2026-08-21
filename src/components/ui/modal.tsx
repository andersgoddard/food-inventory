/**
 * Modal Component
 * Reusable modal/dialog for confirmations and content
 */

import { StyleSheet, Modal, Pressable, View, ViewStyle } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Button } from './button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ModalProps {
  visible: boolean;
  title: string;
  message?: string;
  onClose: () => void;
  primaryButtonText?: string;
  onPrimaryPress?: () => void;
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
  children?: React.ReactNode;
  contentStyle?: ViewStyle;
}

export function ModalDialog({
  visible,
  title,
  message,
  onClose,
  primaryButtonText,
  onPrimaryPress,
  secondaryButtonText = 'Cancel',
  onSecondaryPress,
  children,
  contentStyle,
}: ModalProps) {
  const theme = useTheme();

  const handleSecondary = () => {
    if (onSecondaryPress) {
      onSecondaryPress();
    } else {
      onClose();
    }
  };

  const handlePrimary = () => {
    if (onPrimaryPress) {
      onPrimaryPress();
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
      >
        <Pressable
          style={[styles.modalContent, { backgroundColor: theme.backgroundElement }]}
          onPress={(e) => e.stopPropagation()}
        >
          <ThemedText type="title" style={styles.title}>
            {title}
          </ThemedText>

          {message && (
            <ThemedText type="default" style={styles.message}>
              {message}
            </ThemedText>
          )}

          {children && (
            <ThemedView style={[styles.customContent, contentStyle]}>
              {children}
            </ThemedView>
          )}

          <ThemedView style={styles.buttonContainer}>
            <Button
              title={secondaryButtonText}
              variant="secondary"
              onPress={handleSecondary}
              style={styles.button}
            />
            {primaryButtonText && (
              <Button
                title={primaryButtonText}
                variant="primary"
                onPress={handlePrimary}
                style={styles.button}
              />
            )}
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    minWidth: '80%',
    maxWidth: '90%',
    gap: Spacing.three,
  },
  title: {
    marginBottom: Spacing.one,
  },
  message: {
    marginBottom: Spacing.two,
  },
  customContent: {
    gap: Spacing.two,
  },
  buttonContainer: {
    gap: Spacing.two,
    marginTop: Spacing.two,
    flexDirection: 'row',
  },
  button: {
    flex: 1,
  },
});
