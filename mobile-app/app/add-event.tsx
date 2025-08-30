import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Image, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

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

    // Admin check and load event data if editing
    useEffect(() => {
        let isMounted = true;
        const checkAdminAndLoad = async () => {
            try {
                const user = getAuth().currentUser;
                if (!user) { router.replace('/login'); return; }
                const userDocRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userDocRef);
                if (!docSnap.exists() || docSnap.data().role !== 'admin') {
                    Alert.alert("Access Denied", "You do not have permission to view this page.");
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
                Alert.alert("Error", "Failed to verify admin or load event.");
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

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions.');
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
            Alert.alert('Missing Information', 'Please fill all fields and select a poster image.');
            return;
        }
        setSubmitting(true);
        try {
            let posterImageUrl = imageUri;
            if (imageUri && imageUri.startsWith('file://')) {
                const response = await fetch(imageUri);
                const blob = await response.blob();
                const storageRef = ref(storage, `event_posters/${Date.now()}.jpg`);
                await uploadBytes(storageRef, blob);
                posterImageUrl = await getDownloadURL(storageRef);
            }
            if (isEditMode && params.eventId) {
                const eventDocRef = doc(db, 'events', params.eventId);
                await updateDoc(eventDocRef, { ...form, posterImageUrl });
                Alert.alert('Success', 'Event has been updated.');
            } else {
                await addDoc(collection(db, 'events'), { ...form, posterImageUrl, createdAt: serverTimestamp() });
                Alert.alert('Success', 'New event has been added.');
            }
            router.back();
        } catch (error) {
            Alert.alert('Error', 'Could not add/update the event.');
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
                <TextInput
                    style={styles.input}
                    value={form.title}
                    onChangeText={(val) => handleChange('title', val)}
                    placeholder="e.g., Annual Blood Drive"
                    accessibilityLabel="Event Title"
                />
                <Text style={styles.label}>Location</Text>
                <TextInput
                    style={styles.input}
                    value={form.location}
                    onChangeText={(val) => handleChange('location', val)}
                    placeholder="e.g., PU Campus"
                    accessibilityLabel="Location"
                />
                <Text style={styles.label}>Date of Event</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                    <View pointerEvents="none">
                        <TextInput
                            style={styles.input}
                            value={form.eventDate.toLocaleDateString()}
                            editable={false}
                            accessibilityLabel="Date of Event"
                        />
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
                <Text style={styles.label}>Description</Text>
                <TextInput
                    style={[styles.input, { height: 100 }]}
                    value={form.description}
                    onChangeText={(val) => handleChange('description', val)}
                    multiline
                    placeholder="More details about the event..."
                    accessibilityLabel="Description"
                />
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
                    accessibilityLabel={isEditMode ? 'Update Event' : 'Add Event'}
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
    container: { padding: 20, backgroundColor: palette.pageBg },
    label: { fontSize: 14, color: palette.lightText, marginBottom: 8, fontWeight: '500' },
    input: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.borderLight, borderRadius: 8, padding: 12, fontSize: 16, color: palette.darkText, marginBottom: 20 },
    imagePicker: { height: 150, borderWidth: 2, borderColor: palette.borderLight, borderStyle: 'dashed', borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDFDFD', marginBottom: 30 },
    imagePickerText: { color: palette.lightText },
    imagePreview: { width: '100%', height: '100%', borderRadius: 8, resizeMode: 'cover' },
    submitButton: { backgroundColor: palette.primaryRed, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    submitButtonText: { color: palette.white, fontSize: 18, fontWeight: 'bold' },
});