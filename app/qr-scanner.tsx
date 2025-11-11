import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../firebase';

import { CameraView, useCameraPermissions } from 'expo-camera';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface QRData {
  eventId: string;
  eventTitle: string;
  timestamp: string;
  adminId: string;
}

const QRScannerScreen: React.FC = () => {
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [attendedEventTitle, setAttendedEventTitle] = useState('');
  const [permission, requestPermission] = useCameraPermissions();

  const requestCameraPermission = async () => {
    try {
      await requestPermission();
    } catch (error) {
      console.error('Error requesting camera permission:', error);
    }
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    setLoading(true);

    try {
      // Parse QR code data
      const qrData: QRData = JSON.parse(data);
      
      // Validate QR code structure
      if (!qrData.eventId || !qrData.eventTitle || !qrData.adminId) {
        throw new Error('Invalid QR code format');
      }

      // Validate timestamp (QR should be used within a reasonable time frame)
      const qrTimestamp = new Date(qrData.timestamp);
      const now = new Date();
      const timeDifference = now.getTime() - qrTimestamp.getTime();
      const hoursDifference = timeDifference / (1000 * 60 * 60);

      // QR code should be used within 24 hours
      if (hoursDifference > 24) {
        throw new Error('QR code has expired. Please request a new one from the admin.');
      }

      // Mark attendance
      await markAttendance(qrData.eventId, qrData.eventTitle);

    } catch (error) {
      console.error('Error processing QR code:', error);
      Alert.alert(
        'Invalid QR Code',
        error instanceof Error ? error.message : 'The QR code could not be processed. Please try again or contact the event organizer.',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (eventId: string, eventTitle: string) => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      Alert.alert('Error', 'Please log in to mark attendance.');
      return;
    }

    try {
      // Check if event exists and user has joined
      const eventRef = doc(db, 'events', eventId);
      const eventDoc = await getDoc(eventRef);

      if (!eventDoc.exists()) {
        throw new Error('Event not found. Please check with the organizer.');
      }

      const eventData = eventDoc.data();
      const joinedStudents = eventData.joinedStudents || [];
      const attendedStudents = eventData.attendedStudents || [];

      // Check if user joined the event
      if (!joinedStudents.includes(user.uid)) {
        Alert.alert(
          'Not Registered',
          'You need to join this event first before marking attendance.',
          [
            { text: 'Cancel', onPress: () => setScanned(false) },
            { 
              text: 'Join Event', 
              onPress: () => {
                setScanned(false);
                router.push('/events');
              }
            }
          ]
        );
        return;
      }

      // Check if already marked attendance
      if (attendedStudents.includes(user.uid)) {
        Alert.alert(
          'Already Attended',
          'Your attendance has already been marked for this event.',
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
        return;
      }

      // Mark attendance
      await updateDoc(eventRef, {
        attendedStudents: arrayUnion(user.uid)
      });

      setAttendedEventTitle(eventTitle);
      setShowSuccessModal(true);

    } catch (error) {
      console.error('Error marking attendance:', error);
      Alert.alert(
        'Error',
        'Failed to mark attendance. Please try again or contact the organizer.',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setScanning(true);
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setScanned(false);
    router.back();
  };

  // Handle camera permission
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
      return (
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Camera Permission</Text>
            <View style={styles.placeholder} />
          </View>
          
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40}}>
            <Ionicons name="camera-outline" size={80} color="#8E8E93" />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              Please enable camera access to scan QR codes for event attendance.
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000000ff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Attendance QR</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.scannerContainer}>
        {scanning && !scanned ? (
          <View style={styles.cameraContainer}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
            />
            
            {/* Scanner Overlay */}
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame}>
                <View style={styles.cornerTopLeft} />
                <View style={styles.cornerTopRight} />
                <View style={styles.cornerBottomLeft} />
                <View style={styles.cornerBottomRight} />
              </View>
              <Text style={styles.scannerOverlayText}>
                Point camera at QR code to scan
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.instructionsContainer}>
            <Ionicons name="scan-outline" size={80} color="#bf0000ff" />
            <Text style={styles.instructionsTitle}>Ready to Scan</Text>
            <Text style={styles.instructionsText}>
              Position the QR code within the camera frame to mark your attendance.
            </Text>
            <Text style={styles.instructionsSubtext}>
              Make sure you have joined the event before scanning.
            </Text>
          </View>
        )}
      </View>

      {!scanning && (
        <TouchableOpacity style={styles.startScanButton} onPress={() => setScanning(true)}>
          <Ionicons name="camera" size={20} color="white" />
          <Text style={styles.startScanButtonText}>Start Scanning</Text>
        </TouchableOpacity>
      )}

      {scanned && (
        <View style={styles.scannedContainer}>
          {loading ? (
            <>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.processingText}>Processing QR code...</Text>
            </>
          ) : (
            <TouchableOpacity style={styles.scanAgainButton} onPress={resetScanner}>
              <Ionicons name="refresh" size={20} color="#007AFF" />
              <Text style={styles.scanAgainButtonText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color="#34C759" />
            </View>
            <Text style={styles.successTitle}>Attendance Marked!</Text>
            <Text style={styles.successMessage}>
              Your attendance has been successfully recorded for:
            </Text>
            <Text style={styles.eventTitle}>{attendedEventTitle}</Text>
            <TouchableOpacity style={styles.successButton} onPress={handleSuccessModalClose}>
              <Text style={styles.successButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  placeholder: {
    width: 34,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 20,
    textAlign: 'center',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 20,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginVertical: 20,
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scannerContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  scannerOverlayText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 30,
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  instructionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 20,
  },
  instructionsText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginVertical: 15,
    lineHeight: 24,
  },
  instructionsSubtext: {
    fontSize: 14,
    color: '#FF9500',
    textAlign: 'center',
    fontWeight: '500',
  },
  startScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8a0202ff',
    marginHorizontal: 20,
    marginBottom: 40,
    paddingVertical: 15,
    borderRadius: 25,
  },
  startScanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  scannedContainer: {
    padding: 20,
    alignItems: 'center',
  },
  processingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 15,
  },
  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  scanAgainButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginHorizontal: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 15,
  },
  successMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 10,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 25,
  },
  successButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
  },
  successButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Scanner Frame Corner Styles
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#007AFF',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#007AFF',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#007AFF',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#007AFF',
  },
});

export default QRScannerScreen;