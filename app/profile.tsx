import { User, Phone, Mail, Droplet, Calendar, Camera, Shield, Heart, Bell, LogOut, LucideIcon, ChevronLeft, ChevronRight, Edit2 as Edit, LockIcon as Lock } from 'lucide-react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { EmailAuthProvider, getAuth, reauthenticateWithCredential, signOut, updatePassword } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { FC, useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebase';
import { showAlert } from '../utils/alert';
import { uploadImageToCloudinary } from '../utils/cloudinary';
import { requestMediaLibraryPermissionsAsync, launchImageLibraryAsync, MediaTypeOptions } from '../utils/imagePickerWeb';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375; 

const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7' };

type UserProfile = { 
    name: string; 
    department: string; 
    bloodGroup: string; 
    email: string; 
    profilePicUrl?: string;
    phoneNumber?: string;
    year?: string;
    rollNumber?: string;
    isNssVolunteer?: string;
    nssStatus?: string;
    nssUnit?: string;
};

type Event = {
    id: string;
    title: string;
    location: string;
    eventDate: { toDate: () => Date };
    posterImageUrl?: string;
    description?: string;
    status?: string;
};

const iconMap: Record<string, LucideIcon> = {
  'person': User,
  'call': Phone,
  'mail': Mail,
  'water': Droplet,
  'calendar': Calendar,
};

const ProfileInfoRow = ({ icon, label, value }: { icon: string, label: string, value: string }) => {
  const IconComponent = iconMap[icon] || User;
  return (
    <View style={styles.infoRow}>
        <IconComponent size={scale(22)} color={palette.primaryRed} style={styles.infoIcon} />
        <View>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    </View>
  );
};

const ChangePasswordModal: FC<{ visible: boolean, onClose: () => void }> = ({ visible, onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) { setError('Please fill all fields.'); return; }
        if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return; }
        setIsLoading(true);
        setError('');
        const auth = getAuth();
        const user = auth.currentUser;
        if (user && user.email) {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            try {
                await reauthenticateWithCredential(user, credential);
                await updatePassword(user, newPassword);
                showAlert("Success", "Your password has been changed successfully.");
                onClose();
            } catch (error: any) {
                console.error(error);
                setError("Failed to change password. Please check your current password and try again.");
            } finally {
                setIsLoading(false);
            }
        }
    };
    return (<Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Change Password</Text>
                <TextInput style={styles.input} placeholder="Current Password" secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} />
                <TextInput style={styles.input} placeholder="New Password" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
                <TextInput style={styles.input} placeholder="Confirm New Password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <View style={styles.modalButtonRow}>
                    <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onClose}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={handleChangePassword} disabled={isLoading}>
                        {isLoading ? <ActivityIndicator color={palette.white} /> : <Text style={styles.submitButtonText}>Update</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>);
};

export default function ProfileScreen() {
    const router = useRouter();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [participatedEvents, setParticipatedEvents] = useState<Event[]>([]);
    const [donationCount, setDonationCount] = useState(0);
    const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'events'
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
                    phoneNumber: data.phone || 'N/A',
                    year: data.year || 'N/A',
                    rollNumber: data.rollNumber || 'N/A',
                    isNssVolunteer: data.isNssVolunteer || '',
                    nssStatus: data.nssStatus || '',
                    nssUnit: data.nssUnit || '',
                });
            }
        } catch (error) { console.error("Error fetching user profile:", error); } 
        finally { setIsLoading(false); }
    }, [user, router]);

    const fetchParticipatedEvents = useCallback(async () => {
        if (!user) return;
        try {
            // Get all events where user is in attendedStudents array
            const eventsQuery = query(collection(db, 'events'));
            const querySnapshot = await getDocs(eventsQuery);
            
            const userEvents: Event[] = [];
            querySnapshot.docs.forEach((doc) => {
                const eventData = doc.data();
                const attendedStudents = eventData.attendedStudents || [];
                
                if (attendedStudents.includes(user.uid)) {
                    userEvents.push({
                        id: doc.id,
                        title: eventData.title,
                        location: eventData.location,
                        eventDate: eventData.eventDate,
                        posterImageUrl: eventData.posterImageUrl,
                        description: eventData.description,
                        status: eventData.status,
                    });
                }
            });
            
            // Sort by date (most recent first)
            userEvents.sort((a, b) => b.eventDate.toDate().getTime() - a.eventDate.toDate().getTime());
            setParticipatedEvents(userEvents);
        } catch (error) {
            console.error('Error fetching participated events:', error);
        }
    }, [user]);

    const fetchDonationCount = useCallback(async () => {
        if (!user) return;
        try {
            // Query donations collection where donorId matches current user
            const donationsQuery = query(
                collection(db, 'donations'),
                where('donorId', '==', user.uid)
            );
            const querySnapshot = await getDocs(donationsQuery);
            setDonationCount(querySnapshot.size);
        } catch (error) {
            console.error('Error fetching donation count:', error);
        }
    }, [user]);

    useFocusEffect(useCallback(() => { 
        fetchUserProfile(); 
        fetchParticipatedEvents();
        fetchDonationCount();
    }, [fetchUserProfile, fetchParticipatedEvents, fetchDonationCount]));

    const handleProfilePicChange = async () => {
        if (!user) return;
        const { status } = await requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { 
            showAlert('Permission Denied', 'We need permission to access your photos.'); 
            return; 
        }
        let result = await launchImageLibraryAsync({ 
            mediaTypes: MediaTypeOptions.Images, 
            allowsEditing: true, 
            aspect: [1, 1], 
            quality: 0.5, 
        });
        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setIsUploading(true);
            try {
                // Upload image to Cloudinary
                const uploadResult = await uploadImageToCloudinary(uri, 'profile_pictures');
                
                if (!uploadResult.success) {
                    showAlert('Upload Error', uploadResult.error || 'Failed to upload image');
                    setIsUploading(false);
                    return;
                }

                const userDocRef = doc(db, 'users', user.uid);
                await updateDoc(userDocRef, { profilePicUrl: uploadResult.url });
                setUserProfile(prev => prev ? { ...prev, profilePicUrl: uploadResult.url } : null);
                showAlert("Success", "Profile picture updated!");
            } catch (error) {
                console.error("Error uploading image: ", error);
                showAlert("Error", "Failed to upload image.");
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleLogout = () => {
        if (Platform.OS === 'web') {
            // For web, use browser confirm dialog
            if (window.confirm('Are you sure you want to log out?')) {
                signOut(auth);
                router.replace('/login');
            }
        } else {
            // For native, use showAlert with buttons
            showAlert("Log Out", "Are you sure you want to log out?", [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Log Out", 
                    style: "destructive", 
                    onPress: () => {
                        signOut(auth);
                        router.replace('/login');
                    }
                }
            ]);
        }
    };



    if (isLoading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={palette.primaryRed} />
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <>
            <Stack.Screen 
                options={{ 
                    headerShown: false 
                }} 
            />
            <SafeAreaView style={styles.safeArea}>
                {/* Custom Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft size={24} color={palette.darkText} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                    {/* Profile Header Card */}
                    <View style={styles.profileCard}>
                        {/* Profile Picture Section */}
                        <View style={styles.profileImageSection}>
                            <TouchableOpacity style={styles.avatar} onPress={handleProfilePicChange} disabled={isUploading}>
                                {userProfile?.profilePicUrl ? (
                                    <Image source={{ uri: userProfile.profilePicUrl }} style={styles.profileImage} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <User size={scale(40)} color={palette.lightText} />
                                    </View>
                                )}
                                {isUploading && <ActivityIndicator style={styles.uploadIndicator} color={palette.primaryRed} />}
                                <View style={styles.cameraIcon}>
                                    <Camera size={14} color="white" />
                                </View>
                            </TouchableOpacity>
                        </View>
                        
                        {/* Profile Info */}
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{userProfile?.name}</Text>
                            <Text style={styles.profileEmail}>{userProfile?.email}</Text>
                            
                            {/* Badges Container */}
                            <View style={styles.badgesContainer}>
                                {/* Blood Group Badge */}
                                <View style={styles.bloodGroupBadge}>
                                    <Droplet size={16} color={palette.primaryRed} />
                                    <Text style={styles.bloodGroupText}>{userProfile?.bloodGroup}</Text>
                                </View>
                                
                                {/* NSS Volunteer Badge - Only for approved volunteers */}
                                {userProfile?.isNssVolunteer === 'Yes' && userProfile?.nssStatus === 'approved' && (
                                    <View style={styles.nssBadge}>
                                        <Shield size={14} color="#4A90E2" />
                                        <Text style={styles.nssText} numberOfLines={1} ellipsizeMode="tail">
                                            NSS Volunteer
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Quick Stats */}
                    <View style={styles.quickStatsCard}>
                        <Text style={styles.cardTitle}>Quick Stats</Text>
                        <View style={styles.statsGrid}>
                            <TouchableOpacity 
                                style={styles.statItem}
                                onPress={() => router.push('/my-events')}
                            >
                                <View style={styles.statIconContainer}>
                                    <Calendar size={20} color={palette.primaryRed} />
                                </View>
                                <Text style={styles.statValue}>{participatedEvents.length}</Text>
                                <Text style={styles.statLabel}>Events</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.statItem}
                                onPress={() => router.push('/History')}
                            >
                                <View style={styles.statIconContainer}>
                                    <Heart size={20} color="#FF6B6B" />
                                </View>
                                <Text style={styles.statValue}>{donationCount}</Text>
                                <Text style={styles.statLabel}>Donations</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Personal Information */}
                    <View style={styles.infoCard}>
                        <Text style={styles.cardTitle}>Personal Information</Text>
                        <ProfileInfoRow icon="school-outline" label="Department" value={userProfile?.department || 'N/A'} />
                        <ProfileInfoRow icon="call-outline" label="Phone Number" value={userProfile?.phoneNumber || 'N/A'} />
                        <ProfileInfoRow icon="school" label="Year" value={userProfile?.year || 'N/A'} />
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.actionsCard}>
                        <Text style={styles.cardTitle}>Quick Actions</Text>
                        
                        <TouchableOpacity style={styles.modernActionButton} onPress={() => router.push('/edit-profile')}>
                            <View style={styles.actionIconContainer}>
                                <Edit size={20} color={palette.primaryRed} />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={styles.actionTitle}>Edit Profile</Text>
                                <Text style={styles.actionSubtitle}>Update your personal information</Text>
                            </View>
                            <ChevronRight size={16} color={palette.lightText} />
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.modernActionButton} onPress={() => setIsPasswordModalVisible(true)}>
                            <View style={styles.actionIconContainer}>
                                <Lock size={20} color={palette.primaryRed} />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={styles.actionTitle}>Change Password</Text>
                                <Text style={styles.actionSubtitle}>Update your account security</Text>
                            </View>
                            <ChevronRight size={16} color={palette.lightText} />
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.modernActionButton} onPress={() => router.push('/notifications')}>
                            <View style={styles.actionIconContainer}>
                                <Bell size={20} color="#FF9500" />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={styles.actionTitle}>Notifications</Text>
                                <Text style={styles.actionSubtitle}>Manage your preferences</Text>
                            </View>
                            <ChevronRight size={16} color={palette.lightText} />
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.modernActionButton} onPress={() => router.push('/privacy-policy')}>
                            <View style={styles.actionIconContainer}>
                                <Shield size={20} color="#34C759" />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={styles.actionTitle}>Privacy & Security</Text>
                                <Text style={styles.actionSubtitle}>Review privacy settings</Text>
                            </View>
                            <ChevronRight size={16} color={palette.lightText} />
                        </TouchableOpacity>
                    </View>

                    {/* Logout Button */}
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <LogOut size={20} color={palette.primaryRed} />
                        <Text style={styles.logoutButtonText}>Log Out</Text>
                    </TouchableOpacity>
                </ScrollView>
            
            <ChangePasswordModal 
                visible={isPasswordModalVisible}
                onClose={() => setIsPasswordModalVisible(false)} 
            />
        </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: palette.white 
    },
    container: { 
        flex: 1, 
        backgroundColor: palette.pageBg 
    },
    
    // Header Styles
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(20),
        paddingVertical: scale(15),
        backgroundColor: palette.white,
        borderBottomWidth: 1,
        borderBottomColor: palette.borderLight,
    },
    backButton: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(20),
        backgroundColor: palette.pageBg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: scale(18),
        fontWeight: 'bold',
        color: palette.darkText,
    },
    headerSpacer: {
        width: scale(40),
        height: scale(40),
    },
    
    // Loading Styles
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: palette.pageBg,
    },
    loadingText: {
        fontSize: scale(16),
        color: palette.lightText,
        marginTop: scale(15),
    },
    
    // Profile Card Styles
    profileCard: {
        backgroundColor: palette.white,
        marginHorizontal: scale(20),
        marginTop: scale(20),
        borderRadius: scale(20),
        padding: scale(20),
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileImageSection: {
        marginRight: scale(20),
    },
    profileInfo: {
        flex: 1,
    },
    avatar: { 
        width: scale(80), 
        height: scale(80), 
        borderRadius: scale(40), 
        backgroundColor: palette.pageBg,
        justifyContent: 'center', 
        alignItems: 'center', 
        borderWidth: 3, 
        borderColor: palette.borderLight,
        position: 'relative',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: scale(40),
        backgroundColor: palette.pageBg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileImage: { 
        width: '100%', 
        height: '100%', 
        borderRadius: scale(40) 
    },
    cameraIcon: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: palette.primaryRed,
        width: scale(24),
        height: scale(24),
        borderRadius: scale(12),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    uploadIndicator: { 
        position: 'absolute' 
    },
    profileName: { 
        fontSize: scale(17), 
        fontWeight: 'bold', 
        color: palette.darkText,
        marginBottom: scale(4),
    },
    profileEmail: { 
        fontSize: scale(11), 
        color: palette.lightText, 
        marginBottom: scale(10),
    },
    badgesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'nowrap',
        gap: scale(8),
        overflow: 'hidden',
    },
    bloodGroupBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${palette.primaryRed}15`,
        paddingHorizontal: scale(12),
        paddingVertical: scale(6),
        borderRadius: scale(15),
        flexShrink: 0,
        minWidth: scale(60),
    },
    bloodGroupText: {
        fontSize: scale(12),
        fontWeight: '600',
        color: palette.primaryRed,
        marginLeft: scale(4),
    },
    nssBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4A90E215',
        paddingHorizontal: scale(10),
        paddingVertical: scale(6),
        borderRadius: scale(15),
        flexShrink: 1,
        maxWidth: scale(160),
    },
    nssText: {
        fontSize: scale(11),
        fontWeight: '600',
        color: '#4A90E2',
        marginLeft: scale(4),
    },
    
    // Quick Stats Card
    quickStatsCard: {
        backgroundColor: palette.white,
        marginHorizontal: scale(20),
        marginTop: scale(15),
        borderRadius: scale(20),
        padding: scale(20),
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
        paddingVertical: scale(10),
        borderRadius: scale(12),
    },
    statIconContainer: {
        width: scale(50),
        height: scale(50),
        borderRadius: scale(25),
        backgroundColor: palette.pageBg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: scale(8),
    },
    statValue: {
        fontSize: scale(18),
        fontWeight: 'bold',
        color: palette.darkText,
        marginBottom: scale(2),
    },
    statLabel: {
        fontSize: scale(12),
        color: palette.lightText,
        textAlign: 'center',
    },

    
    // Info and Actions Cards
    infoCard: {
        backgroundColor: 'white',
        marginHorizontal: scale(20),
        marginTop: scale(15),
        borderRadius: scale(20),
        padding: scale(20),
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    actionsCard: {
        backgroundColor: 'white',
        marginHorizontal: scale(20),
        marginTop: scale(15),
        borderRadius: scale(20),
        padding: scale(20),
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    cardTitle: {
        fontSize: scale(18),
        fontWeight: 'bold',
        color: palette.darkText,
        marginBottom: scale(15),
    },
    infoRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingVertical: scale(12),
        borderBottomWidth: 1,
        borderBottomColor: palette.borderLight,
    },
    infoIcon: { 
        marginRight: scale(15),
        width: scale(24),
    },
    infoLabel: { 
        fontSize: scale(12), 
        color: palette.lightText 
    },
    infoValue: { 
        fontSize: scale(16), 
        color: palette.darkText, 
        fontWeight: '500',
        marginTop: scale(2),
    },
    
    // Modern Action Buttons
    modernActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scale(15),
        borderBottomWidth: 1,
        borderBottomColor: palette.borderLight,
    },
    actionIconContainer: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(20),
        backgroundColor: `${palette.primaryRed}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: scale(15),
    },
    actionContent: {
        flex: 1,
    },
    actionTitle: {
        fontSize: scale(15),
        fontWeight: '600',
        color: palette.darkText,
    },
    actionSubtitle: {
        fontSize: scale(12),
        color: palette.lightText,
        marginTop: scale(2),
    },
    
    // Logout Button
    logoutButton: { 
        backgroundColor: '#FFF1F1', 
        marginHorizontal: scale(20), 
        marginTop: scale(15),
        marginBottom: scale(25),
        padding: scale(15), 
        borderRadius: scale(15), 
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: scale(10),
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    logoutButtonText: { 
        color: palette.primaryRed, 
        fontSize: scale(15), 
        fontWeight: '600' 
    },
    
    // Modal Styles
    modalBackdrop: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: 'rgba(0, 0, 0, 0.5)' 
    },
    modalContent: { 
        width: '90%', 
        backgroundColor: palette.white, 
        borderRadius: scale(20), 
        padding: scale(25) 
    },
    modalTitle: { 
        fontSize: scale(20), 
        fontWeight: 'bold', 
        textAlign: 'center', 
        marginBottom: scale(25), 
        color: palette.darkText 
    },
    input: { 
        backgroundColor: palette.pageBg, 
        padding: scale(15), 
        borderRadius: scale(12), 
        marginBottom: scale(15), 
        borderWidth: 1, 
        borderColor: palette.borderLight, 
        fontSize: scale(16) 
    },
    errorText: { 
        color: palette.primaryRed, 
        textAlign: 'center', 
        marginBottom: scale(15),
        fontSize: scale(14),
    },
    modalButtonRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginTop: scale(15), 
        gap: scale(15) 
    },
    modalButton: { 
        flex: 1, 
        padding: scale(15), 
        borderRadius: scale(12), 
        alignItems: 'center' 
    },
    cancelButton: { 
        backgroundColor: palette.borderLight 
    },
    cancelButtonText: { 
        color: palette.darkText, 
        fontWeight: '600', 
        fontSize: scale(16) 
    },
    submitButton: { 
        backgroundColor: palette.primaryRed 
    },
    submitButtonText: { 
        color: palette.white, 
        fontWeight: '600', 
        fontSize: scale(16) 
    },
});