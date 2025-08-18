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
    const [isLoading, setIsLoading] = useState(true);

    const [form, setForm] = useState({
        name: '', address: '', phone: '', latitude: '', longitude: ''
    });

    // This effect checks if the user is an admin. If not, it denies access.
    useEffect(() => {
        const checkAdminStatus = async () => {
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
            setIsLoading(false);
        };
        checkAdminStatus();
    }, []);

    const handleChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        const { name, address, phone, latitude, longitude } = form;
        if (!name || !address || !phone || !latitude || !longitude) {
            Alert.alert('Missing Information', 'Please fill out all fields.');
            return;
        }
        setIsLoading(true);
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
            console.error("Error adding blood bank: ", error);
            Alert.alert('Error', 'Could not add the blood bank.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <ActivityIndicator style={{ flex: 1, justifyContent: 'center' }} size="large" color={palette.primaryRed} />;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.label}>Bank Name</Text>
                <TextInput style={styles.input} value={form.name} onChangeText={(val) => handleChange('name', val)} placeholder="e.g., JIPMER Blood Bank" />
                <Text style={styles.label}>Address</Text>
                <TextInput style={styles.input} value={form.address} onChangeText={(val) => handleChange('address', val)} placeholder="Full address" multiline />
                <Text style={styles.label}>Phone Number</Text>
                <TextInput style={styles.input} value={form.phone} onChangeText={(val) => handleChange('phone', val)} keyboardType="phone-pad" />
                <View style={styles.row}>
                    <View style={styles.halfWidth}>
                        <Text style={styles.label}>Latitude</Text>
                        <TextInput style={styles.input} value={form.latitude} onChangeText={(val) => handleChange('latitude', val)} keyboardType="numeric" placeholder="e.g., 11.9562" />
                    </View>
                    <View style={styles.halfWidth}>
                        <Text style={styles.label}>Longitude</Text>
                        <TextInput style={styles.input} value={form.longitude} onChangeText={(val) => handleChange('longitude', val)} keyboardType="numeric" placeholder="e.g., 79.7951" />
                    </View>
                </View>
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                    <Text style={styles.submitButtonText}>Add Blood Bank</Text>
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