import { Upload } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebase';
import { showAlert } from '../utils/alert';
import { uploadImageToCloudinary } from '../utils/cloudinary';
import { requestMediaLibraryPermissionsAsync, launchImageLibraryAsync, MediaTypeOptions } from '../utils/imagePickerWeb';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375;

const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#FEF8F8' };

export default function UploadCredentialScreen() {
    const router = useRouter();
    const { offerId } = useLocalSearchParams<{ offerId: string }>();

    const [units, setUnits] = useState('');
    const [location, setLocation] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleWebDateChange = (dateString: string) => {
        if (dateString) {
            const newDate = new Date(dateString);
            setDate(newDate);
        }
    };

    const formatDateForInput = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const pickImage = async () => {
        const { status } = await requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showAlert('Permission Denied', 'We need camera roll permissions to upload images.');
            return;
        }
        let result = await launchImageLibraryAsync({
            mediaTypes: MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7, // Reduced quality to help keep file size under 500KB
        });
        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        if (!units || !location || !imageUri) {
            showAlert('Missing Information', 'Please fill all fields and select an image.');
            return;
        }
        if (!offerId) {
            showAlert('Error', 'Donation offer ID is missing.');
            return;
        }
        setIsUploading(true);
        try {
            // Upload image to Cloudinary
            const uploadResult = await uploadImageToCloudinary(imageUri, 'donation_certificates');
            
            if (!uploadResult.success) {
                showAlert('Upload Error', uploadResult.error || 'Failed to upload image');
                setIsUploading(false);
                return;
            }

            const offerDocRef = doc(db, 'donationOffers', offerId);
            await updateDoc(offerDocRef, {
                status: 'credentials_submitted',
                confirmedUnits: Number(units),
                confirmedLocation: location,
                confirmedDate: date,
                certificateUrl: uploadResult.url,
            });
            showAlert('Success!', 'Your credentials have been submitted for verification.');
            router.back();
        } catch (error) {
            console.error("Error submitting credentials:", error);
            showAlert('Error', 'There was a problem submitting your credentials.');
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
                {Platform.OS === 'web' ? (
                    <input
                        type="date"
                        value={formatDateForInput(date)}
                        onChange={(e) => handleWebDateChange(e.target.value)}
                        style={{
                            backgroundColor: palette.white,
                            border: `1px solid ${palette.borderLight}`,
                            borderRadius: scale(8),
                            padding: scale(12),
                            fontSize: scale(14),
                            fontFamily: 'inherit',
                            width: '100%',
                            minWidth: 0,
                            display: 'block',
                            boxSizing: 'border-box' as any
                        }}
                    />
                ) : (
                    <>
                        <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                            <View pointerEvents="none">
                                <TextInput style={styles.input} value={date.toLocaleDateString()} editable={false} />
                            </View>
                        </TouchableOpacity>
                        {showDatePicker && <DateTimePicker value={date} mode="date" display="default" onChange={(e, selectedDate) => { setShowDatePicker(false); setDate(selectedDate || date); }} />}
                    </>
                )}

                <Text style={styles.label}>Hospital / Camp Location</Text>
                <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Where did you donate?" />

                <Text style={styles.label}>Upload Certificate Image</Text>
                <Text style={styles.sizeHint}>Please select an image under 500KB</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                    ) : (
                        <>
                            <Upload size={scale(32)} color={palette.lightText} />
                            <Text style={styles.imagePickerText}>Tap to select certificate image</Text>
                            <Text style={styles.imageSizeText}>(Max size: 500KB)</Text>
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
    container: { 
        padding: scale(20), 
        backgroundColor: palette.pageBg 
    },
    label: { 
        fontSize: scale(14), 
        color: palette.lightText, 
        marginBottom: scale(8), 
        fontWeight: '500' 
    },
    sizeHint: {
        fontSize: scale(12),
        color: palette.primaryRed,
        marginBottom: scale(8),
        fontStyle: 'italic',
    },
    input: { 
        backgroundColor: palette.white, 
        borderWidth: 1, 
        borderColor: palette.borderLight, 
        borderRadius: scale(8), 
        padding: scale(12), 
        fontSize: scale(16), 
        color: palette.darkText, 
        marginBottom: scale(20),
        height: scale(50),
    },
    imagePicker: { 
        height: scale(150), 
        borderWidth: 2, 
        borderColor: palette.borderLight, 
        borderStyle: 'dashed', 
        borderRadius: scale(10), 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#FDFDFD', 
        marginBottom: scale(30) 
    },
    imagePickerText: { 
        color: palette.lightText, 
        marginTop: scale(10),
        fontSize: scale(14),
    },
    imageSizeText: {
        color: palette.primaryRed,
        marginTop: scale(4),
        fontSize: scale(12),
    },
    imagePreview: { 
        width: '100%', 
        height: '100%', 
        borderRadius: scale(8) 
    },
    submitButton: { 
        backgroundColor: palette.primaryRed, 
        padding: scale(15), 
        borderRadius: scale(10), 
        alignItems: 'center' 
    },
    submitButtonText: { 
        color: palette.white, 
        fontSize: scale(18), 
        fontWeight: 'bold' 
    },
});