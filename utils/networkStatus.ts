import { Platform } from 'react-native';

/**
 * Check if the device has network connectivity
 * @returns Promise<boolean> - true if online, false if offline
 */
export const isOnline = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    // For web, check navigator.onLine
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true; // Assume online if we can't check
  }
  
  // For mobile, we'd use @react-native-community/netinfo
  return true; // Default to true for now
};

/**
 * Wait for network connectivity with timeout
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise<boolean> - true if online, false if timeout
 */
export const waitForConnection = async (timeout = 5000): Promise<boolean> => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // If already online, return immediately
    if (navigator.onLine) {
      return true;
    }

    // Wait for online event or timeout
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        window.removeEventListener('online', handleOnline);
        resolve(false);
      }, timeout);

      const handleOnline = () => {
        clearTimeout(timeoutId);
        window.removeEventListener('online', handleOnline);
        resolve(true);
      };

      window.addEventListener('online', handleOnline);
    });
  }

  return true; // For mobile, assume connection is available
};

/**
 * Execute a Firestore operation with network retry
 * @param operation - The async Firestore operation to execute
 * @param maxRetries - Maximum number of retries (default: 2)
 * @param retryDelay - Delay between retries in ms (default: 1000)
 * @returns Promise with the operation result or throws after max retries
 */
export const withNetworkRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 2,
  retryDelay = 1000
): Promise<T> => {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check if online before attempting
      const online = await isOnline();
      if (!online && attempt < maxRetries) {
        // Wait for connection
        await waitForConnection(3000);
      }

      // Attempt the operation
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if it's a network-related error
      const isNetworkError =
        error?.code === 'unavailable' ||
        error?.code === 'failed-precondition' ||
        error?.message?.includes('offline') ||
        error?.message?.includes('network') ||
        error?.message?.includes('timeout');

      // If it's the last attempt or not a network error, throw
      if (attempt === maxRetries || !isNetworkError) {
        throw error;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }

  throw lastError || new Error('Operation failed after retries');
};
