import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, SafeAreaView, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, /*storage*/ } from '../firebase';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { showAlert } from '../utils/alert';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375; 

const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#FEF8F8' };

export default function AddEventScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ eventId?: string }>(); 
    const isEditMode = !!params.eventId;

    const [checkingAdmin, setCheckingAdmin] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ title: '', location: '', description: '', eventDate: new Date() });
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const checkAdminAndLoad = async () => {
            try {
                const user = getAuth().currentUser;
                if (!user) { router.replace('/login'); return; }
                const userDocRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userDocRef);
                if (!docSnap.exists() || docSnap.data().role !== 'admin') {
                    showAlert("Access Denied", "You do not have permission to view this page.");
                    router.replace('/dashboard');
                    return;
                }
                if (isEditMode && params.eventId) {
                    const eventRef = doc(db, 'events', params.eventId);
                    const eventSnap = await getDoc(eventRef);
                    if (eventSnap.exists()) {
                        const data = eventSnap.data();
                        if (isMounted) {
                            setForm({
                                title: data.title,
                                location: data.location,
                                description: data.description,
                                eventDate: data.eventDate?.toDate ? data.eventDate.toDate() : new Date(),
                            });
                            setImageUri(data.posterImageUrl || null);
                        }
                    }
                }
            } catch (e) {
                showAlert("Error", "Failed to verify admin or load event.");
                router.replace('/dashboard');
            } finally {
                if (isMounted) setCheckingAdmin(false);
            }
        };
        checkAdminAndLoad();
        return () => { isMounted = false; };
    }, []);

    const handleChange = (field: string, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleWebDateChange = (dateString: string) => {
        if (dateString) {
            const newDate = new Date(dateString);
            handleChange('eventDate', newDate);
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
            aspect: [16, 9],
            quality: 1,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        const { title, location, eventDate, description } = form;
        if (!title || !location || !eventDate || !description || !imageUri) {
            showAlert('Missing Information', 'Please fill all fields and select a poster image.');
            return;
        }
        setSubmitting(true);
        try {
            let posterImageUrl = imageUri;
            if (imageUri && imageUri.startsWith('file://')) {
                const response = await fetch(imageUri);
                const blob = await response.blob();
                // const storageRef = ref(storage, `event_posters/${Date.now()}.jpg`);
                // await uploadBytes(storageRef, blob);
                // posterImageUrl = await getDownloadURL(storageRef);
            }
            if (isEditMode && params.eventId) {
                const eventDocRef = doc(db, 'events', params.eventId);
                await updateDoc(eventDocRef, { ...form, posterImageUrl });
                showAlert('Success', 'Event has been updated.');
            } else {
                await addDoc(collection(db, 'events'), { ...form, posterImageUrl, createdAt: serverTimestamp() });
                showAlert('Success', 'New event has been added.');
            }
            router.back();
        } catch (error) {
            showAlert('Error', 'Could not add/update the event.');
        } finally {
            setSubmitting(false);
        }
    };

    if (checkingAdmin) {
        return <ActivityIndicator style={{ flex: 1 }} size="large" color={palette.primaryRed} />;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.label}>Event Title</Text>
                <TextInput style={styles.input} value={form.title} onChangeText={(val) => handleChange('title', val)} placeholder="e.g., Annual Blood Drive" />
                <Text style={styles.label}>Location</Text>
                <TextInput style={styles.input} value={form.location} onChangeText={(val) => handleChange('location', val)} placeholder="e.g., PU Campus" />
                <Text style={styles.label}>Date of Event</Text>
                {Platform.OS === 'web' ? (
                    <input
                        type="date"
                        value={formatDateForInput(form.eventDate)}
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
                                <TextInput style={styles.input} value={form.eventDate.toLocaleDateString()} editable={false} />
                            </View>
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={form.eventDate}
                                mode="date"
                                display="default"
                                onChange={(e, selectedDate) => {
                                    setShowDatePicker(false);
                                    if (selectedDate) handleChange('eventDate', selectedDate);
                                }}
                            />
                        )}
                    </>
                )}
                <Text style={styles.label}>Description</Text>
                <TextInput style={[styles.input, { height: scale(100), textAlignVertical: 'top' }]} value={form.description} onChangeText={(val) => handleChange('description', val)} multiline placeholder="More details about the event..." />
                <Text style={styles.label}>Upload Poster</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                    ) : (
                        <Text style={styles.imagePickerText}>Select an image</Text>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.submitButton, submitting && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color={palette.white} />
                    ) : (
                        <Text style={styles.submitButtonText}>{isEditMode ? 'Update Event' : 'Add Event'}</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: palette.white },
    container: { padding: scale(20), backgroundColor: palette.pageBg },
    label: { 
        fontSize: scale(14), 
        color: palette.lightText, 
        marginBottom: scale(8), 
        fontWeight: '500' 
    },
    input: { 
        backgroundColor: palette.white, 
        borderWidth: 1, 
        borderColor: palette.borderLight, 
        borderRadius: scale(8), 
        padding: scale(12), 
        fontSize: scale(16), 
        color: palette.darkText, 
        marginBottom: scale(20) 
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
        fontSize: scale(16)
    },
    imagePreview: { 
        width: '100%', 
        height: '100%', 
        borderRadius: scale(8), 
        resizeMode: 'cover' 
    },
    submitButton: { 
        backgroundColor: palette.primaryRed, 
        padding: scale(15), 
        borderRadius: scale(10), 
        alignItems: 'center', 
        marginTop: scale(10) 
    },
    submitButtonText: { 
        color: palette.white, 
        fontSize: scale(18), 
        fontWeight: 'bold' 
    },
});