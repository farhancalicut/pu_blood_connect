import React, { useState, useCallback, FC } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity, Alert,Modal,TextInput, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, signOut, EmailAuthProvider,reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, getDoc, updateDoc  } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7' };

type UserProfile = {
    name: string;
    department: string;
    bloodGroup: string;
    email: string;
    profilePicUrl?: string; // Add profile picture URL
};

const ProfileInfoRow = ({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name'], label: string, value: string }) => (
    <View style={styles.infoRow}>
        <Ionicons name={icon} size={22} color={palette.primaryRed} style={styles.infoIcon} />
        <View>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    </View>
);
const ChangePasswordModal: FC<{ visible: boolean, onClose: () => void }> = ({ visible, onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('Please fill all fields.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }

        setIsLoading(true);
        setError('');
        const auth = getAuth();
        const user = auth.currentUser;

        if (user && user.email) {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);

            try {
                await reauthenticateWithCredential(user, credential);
                
                await updatePassword(user, newPassword);
                
                Alert.alert("Success", "Your password has been changed successfully.");
                onClose();

            } catch (error: any) {
                console.error(error);
                setError("Failed to change password. Please check your current password and try again.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Change Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Current Password"
                        secureTextEntry
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="New Password"
                        secureTextEntry
                        value={newPassword}
                        onChangeText={setNewPassword}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Confirm New Password"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    <View style={styles.modalButtonRow}>
                        <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={handleChangePassword} disabled={isLoading}>
                            {isLoading ? <ActivityIndicator color={palette.white} /> : <Text style={styles.submitButtonText}>Update</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default function ProfileScreen() {
    const router = useRouter();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const auth = getAuth();
    const user = auth.currentUser;
    const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const fetchUserProfile = useCallback(async () => {
        if (!user) { router.replace('/login'); return; }
        setIsLoading(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserProfile({
                    name: data.name || `${data.firstName} ${data.lastName}`.trim() || 'N/A',
                    department: data.department || 'N/A',
                    bloodGroup: data.bloodGroup || 'N/A',
                    email: user.email || 'N/A',
                    profilePicUrl: data.profilePicUrl || '',
                });
            }
        } catch (error) { console.error("Error fetching user profile:", error); } 
        finally { setIsLoading(false); }
    }, [user]);

    useFocusEffect(
      useCallback(() => {
        fetchUserProfile();
      }, [fetchUserProfile])
    );

    const handleProfilePicChange = async () => {
        if (!user) return;
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need permission to access your photos.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setIsUploading(true);
            try {
                const response = await fetch(uri);
                const blob = await response.blob();
                const storageRef = ref(storage, `profile_pictures/${user.uid}`);
                await uploadBytes(storageRef, blob);
                const downloadURL = await getDownloadURL(storageRef);

                const userDocRef = doc(db, 'users', user.uid);
                await updateDoc(userDocRef, { profilePicUrl: downloadURL });

                setUserProfile(prev => prev ? { ...prev, profilePicUrl: downloadURL } : null);
                Alert.alert("Success", "Profile picture updated!");

            } catch (error) {
                console.error("Error uploading image: ", error);
                Alert.alert("Error", "Failed to upload image.");
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleLogout = () => {
        Alert.alert("Log Out", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Log Out", 
                style: "destructive", 
                onPress: () => {
                    signOut(auth).then(() => {
                        router.replace('/login');
                    });
                }
            }
        ]);
    };

    if (isLoading) {
        return <ActivityIndicator style={{ flex: 1, justifyContent: 'center' }} size="large" color={palette.primaryRed} />;
    }

    return (
        <SafeAreaView style={styles.safeArea}>

            <View style={styles.container}>
                <View style={styles.profileHeader}>
                     <TouchableOpacity style={styles.avatar} onPress={handleProfilePicChange} disabled={isUploading}>
                        {userProfile?.profilePicUrl ? (
                            <Image source={{ uri: userProfile.profilePicUrl }} style={styles.profileImage} />
                        ) : (
                            <Ionicons name="person" size={50} color={palette.primaryRed} />
                        )}
                        {isUploading && <ActivityIndicator style={styles.uploadIndicator} color={palette.white} />}
                    </TouchableOpacity>
                    <Text style={styles.profileName}>{userProfile?.name}</Text>
                    <Text style={styles.profileEmail}>{userProfile?.email}</Text>
                </View>

                <View style={styles.infoSection}>
                    <ProfileInfoRow icon="school-outline" label="Department" value={userProfile?.department || ''} />
                    <ProfileInfoRow icon="water-outline" label="Blood Group" value={userProfile?.bloodGroup || ''} />
                </View>

                <View style={styles.actionsSection}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/register')}>
                        <Text style={styles.actionButtonText}>Edit Profile</Text>
                        <Ionicons name="chevron-forward" size={22} color={palette.lightText} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setIsPasswordModalVisible(true)}>
                        <Text style={styles.actionButtonText}>Change Password</Text>
                        <Ionicons name="chevron-forward" size={22} color={palette.lightText} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>

                <ChangePasswordModal 
                visible={isPasswordModalVisible}
                onClose={() => setIsPasswordModalVisible(false)}  />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: palette.white },
    container: { flex: 1, backgroundColor: palette.pageBg },
    profileHeader: { backgroundColor: palette.white, paddingVertical: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: palette.borderLight },
    profileName: { fontSize: 22, fontWeight: 'bold', color: palette.darkText },
    profileEmail: { fontSize: 16, color: palette.lightText, marginTop: 4 },
    infoSection: { marginTop: 20 },
    infoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.white, padding: 15, borderBottomWidth: 1, borderBottomColor: palette.borderLight },
    infoIcon: { marginRight: 15 },
    infoLabel: { fontSize: 12, color: palette.lightText },
    infoValue: { fontSize: 16, color: palette.darkText, fontWeight: '500' },
    actionsSection: { marginTop: 20 },
    actionButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: palette.white, padding: 15, borderBottomWidth: 1, borderBottomColor: palette.borderLight },
    actionButtonText: { fontSize: 16, color: palette.darkText },
    logoutButton: { backgroundColor: '#FFF1F1', margin: 20, padding: 15, borderRadius: 10, alignItems: 'center' },
    logoutButtonText: { color: palette.primaryRed, fontSize: 16, fontWeight: 'bold' },
    modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    modalContent: { width: '90%', backgroundColor: palette.white, borderRadius: 10, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: palette.darkText },
    input: { backgroundColor: palette.pageBg, padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: palette.borderLight, fontSize: 16 },
    errorText: { color: palette.primaryRed, textAlign: 'center', marginBottom: 10 },
    modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 10 },
    modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
    cancelButton: { backgroundColor: palette.borderLight },
    cancelButtonText: { color: palette.darkText, fontWeight: 'bold' },
    submitButton: { backgroundColor: palette.primaryRed },
    submitButtonText: { color: palette.white, fontWeight: 'bold' },
    avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 2, borderColor: palette.white, elevation: 4 },
    profileImage: { width: '100%', height: '100%', borderRadius: 45 },
    uploadIndicator: { position: 'absolute' },
});