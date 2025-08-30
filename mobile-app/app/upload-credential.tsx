import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Image, ScrollView, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, } from '../firebase';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
;

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#FEF8F8' };

export default function UploadCredentialScreen() {
    const router = useRouter();
    const { offerId } = useLocalSearchParams<{ offerId: string }>(); // Get the ID from the route params

    const [units, setUnits] = useState('');
    const [location, setLocation] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        if (!units || !location || !imageUri) {
            Alert.alert('Missing Information', 'Please fill all fields and select an image.');
            return;
        }
        if (!offerId) {
             Alert.alert('Error', 'Donation offer ID is missing.');
            return;
        }

        setIsUploading(true);
        try {
            // 1. Upload Image to Firebase Storage
            const response = await fetch(imageUri);
            const blob = await response.blob();
            const storageRef = ref(storage, `certificates/${offerId}-${Date.now()}.jpg`);
            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);

            // 2. Update the Firestore document
            const offerDocRef = doc(db, 'donationOffers', offerId);
            await updateDoc(offerDocRef, {
                status: 'credentials_submitted',
                confirmedUnits: Number(units),
                confirmedLocation: location,
                confirmedDate: date,
                certificateUrl: downloadURL,
            });

            Alert.alert('Success!', 'Your credentials have been submitted for verification.');
            router.back();

        } catch (error) {
            console.error("Error submitting credentials:", error);
            Alert.alert('Error', 'There was a problem submitting your credentials.');
        } 
        finally {
            setIsUploading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.label}>Units Donated</Text>
                <TextInput style={styles.input} value={units} onChangeText={setUnits} keyboardType="number-pad" placeholder="e.g., 2" />

                <Text style={styles.label}>Date of Donation</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                    <View pointerEvents="none">
                        <TextInput style={styles.input} value={date.toLocaleDateString()} editable={false} />
                    </View>
                </TouchableOpacity>
                {showDatePicker && <DateTimePicker value={date} mode="date" display="default" onChange={(e, selectedDate) => { setShowDatePicker(false); setDate(selectedDate || date); }} />}

                <Text style={styles.label}>Hospital / Camp Location</Text>
                <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Where did you donate?" />

                <Text style={styles.label}>Upload Certificate</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                    ) : (
                        <>
                            <Ionicons name="cloud-upload-outline" size={32} color={palette.lightText} />
                            <Text style={styles.imagePickerText}>Select an image</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isUploading}>
                    {isUploading ? <ActivityIndicator color={palette.white} /> : <Text style={styles.submitButtonText}>Submit for Verification</Text>}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: palette.white },
    
    container: { padding: 20, backgroundColor: palette.pageBg },
    label: { fontSize: 14, color: palette.lightText, marginBottom: 8, fontWeight: '500' },
    input: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.borderLight, borderRadius: 8, padding: 12, fontSize: 16, color: palette.darkText, marginBottom: 20 },
    imagePicker: { height: 150, borderWidth: 2, borderColor: palette.borderLight, borderStyle: 'dashed', borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDFDFD', marginBottom: 30 },
    imagePickerText: { color: palette.lightText, marginTop: 10 },
    imagePreview: { width: '100%', height: '100%', borderRadius: 8 },
    submitButton: { backgroundColor: palette.primaryRed, padding: 15, borderRadius: 10, alignItems: 'center' },
    submitButtonText: { color: palette.white, fontSize: 18, fontWeight: 'bold' },
});