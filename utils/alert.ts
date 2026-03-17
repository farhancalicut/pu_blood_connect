import { Alert as RNAlert, Platform } from 'react-native';

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

/**
 * Cross-platform alert function that works on both native and web
 */
export const showAlert = (
  title: string,
  message?: string,
  buttons?: Array<AlertButton>,
) => {
  if (Platform.OS === 'web') {
    const fullMessage = message ? `${title}\n\n${message}` : title;

    if (!buttons || buttons.length === 0) {
      window.alert(fullMessage);
      return;
    }

    if (buttons.length === 1) {
      window.alert(fullMessage);
      buttons[0].onPress?.();
      return;
    }

    const confirmButton =
      buttons.find((button) => button.style === 'destructive') ||
      buttons.find((button) => button.style !== 'cancel') ||
      buttons[buttons.length - 1];

    const cancelButton =
      buttons.find((button) => button.style === 'cancel') ||
      buttons[0];

    const confirmed = window.confirm(fullMessage);

    if (confirmed) {
      confirmButton?.onPress?.();
    } else {
      cancelButton?.onPress?.();
    }
  } else {
    // Use React Native Alert for native platforms
    RNAlert.alert(title, message, buttons);
  }
};
