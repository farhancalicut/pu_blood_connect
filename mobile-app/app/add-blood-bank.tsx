import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#FEF8F8' };

export default function AddBloodBankScreen() {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);
    const [checkingAdmin, setCheckingAdmin] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        name: '', address: '', phone: '', latitude: '', longitude: ''
    });

    useEffect(() => {
        const checkAdminStatus = async () => {
            try {
                const user = getAuth().currentUser;
                if (!user) {
                    router.replace('/login');
                    return;
                }
                const userDocRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists() && docSnap.data().role === 'admin') {
                    setIsAdmin(true);
                } else {
                    Alert.alert("Access Denied", "You do not have permission to view this page.");
                    router.replace('/dashboard');
                }
            } catch (error) {
                Alert.alert("Error", "Failed to verify admin status.");
                router.replace('/dashboard');
            } finally {
                setCheckingAdmin(false);
            }
        };
        checkAdminStatus();
    }, []);

    const handleChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const validatePhone = (phone: string) => /^\d{10,15}$/.test(phone);
    const validateCoordinate = (val: string) => /^-?\d+(\.\d+)?$/.test(val);

    const handleSubmit = async () => {
        const { name, address, phone, latitude, longitude } = form;
        if (!name || !address || !phone || !latitude || !longitude) {
            Alert.alert('Missing Information', 'Please fill out all fields.');
            return;
        }
        if (!validatePhone(phone)) {
            Alert.alert('Invalid Phone', 'Enter a valid phone number.');
            return;
        }
        if (!validateCoordinate(latitude) || !validateCoordinate(longitude)) {
            Alert.alert('Invalid Coordinates', 'Enter valid latitude and longitude.');
            return;
        }
        setSubmitting(true);
        try {
            await addDoc(collection(db, 'bloodBanks'), {
                name,
                address,
                phone,
                coordinates: {
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude)
                },
                createdAt: serverTimestamp(),
            });
            Alert.alert('Success', 'New blood bank has been added.');
            router.back();
        } catch (error) {
            Alert.alert('Error', 'Could not add the blood bank.');
        } finally {
            setSubmitting(false);
        }
    };

    if (checkingAdmin) {
        return <ActivityIndicator style={{ flex: 1, justifyContent: 'center' }} size="large" color={palette.primaryRed} />;
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.label}>Bank Name</Text>
                <TextInput
                    style={styles.input}
                    value={form.name}
                    onChangeText={(val) => handleChange('name', val)}
                    placeholder="e.g., JIPMER Blood Bank"
                    accessibilityLabel="Bank Name"
                />
                <Text style={styles.label}>Address</Text>
                <TextInput
                    style={styles.input}
                    value={form.address}
                    onChangeText={(val) => handleChange('address', val)}
                    placeholder="Full address"
                    multiline
                    accessibilityLabel="Address"
                />
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                    style={styles.input}
                    value={form.phone}
                    onChangeText={(val) => handleChange('phone', val)}
                    keyboardType="phone-pad"
                    placeholder="Phone Number"
                    accessibilityLabel="Phone Number"
                />
                <View style={styles.row}>
                    <View style={styles.halfWidth}>
                        <Text style={styles.label}>Latitude</Text>
                        <TextInput
                            style={styles.input}
                            value={form.latitude}
                            onChangeText={(val) => handleChange('latitude', val)}
                            keyboardType="numeric"
                            placeholder="e.g., 11.9562"
                            accessibilityLabel="Latitude"
                        />
                    </View>
                    <View style={styles.halfWidth}>
                        <Text style={styles.label}>Longitude</Text>
                        <TextInput
                            style={styles.input}
                            value={form.longitude}
                            onChangeText={(val) => handleChange('longitude', val)}
                            keyboardType="numeric"
                            placeholder="e.g., 79.7951"
                            accessibilityLabel="Longitude"
                        />
                    </View>
                </View>
                <TouchableOpacity
                    style={[styles.submitButton, submitting && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                    accessibilityLabel="Add Blood Bank"
                >
                    {submitting ? (
                        <ActivityIndicator color={palette.white} />
                    ) : (
                        <Text style={styles.submitButtonText}>Add Blood Bank</Text>
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
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    halfWidth: { width: '48%' },
    submitButton: { backgroundColor: palette.primaryRed, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    submitButtonText: { color: palette.white, fontSize: 18, fontWeight: 'bold' },
});