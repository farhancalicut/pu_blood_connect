import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView, Image, Alert, Share  } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMenu } from './context/MenuContext';
import { useRouter, Href } from 'expo-router';
import { getAuth,  } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

type MenuItem = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  name: string;
  href?: Href;
};

const menuItems: MenuItem[] = [
  { icon: 'grid-outline', name: 'Dashboard', href: '/dashboard' },
  { icon: 'document-text-outline', name: 'My Requests', href: '/my-requests' },
  { icon: 'time-outline', name: 'My History', href: '/History' },
  { icon: 'location-outline', name: 'Nearby Blood Banks', href: '/blood-banks' },
  { icon: 'calendar-outline', name: 'Events & Camps', href: '/events' },
  { icon: 'notifications-outline', name: 'Notifications', href: '/notifications' },
  
];

const secondaryMenuItems: MenuItem[] = [
    { icon: 'images-outline', name: 'Gallery', href: '/gallery' },
    { icon: 'chatbox-ellipses-outline', name: 'Share Feedback', href: '/feedback'},
    { icon: 'people-outline', name: 'Refer a Friend' },
    { icon: 'help-circle-outline', name: 'FAQ', href: '/faq' },
    { icon: 'shield-checkmark-outline', name: 'Admin Panel', href: '/admin' },
];


export default function MenuBar() {
  const { toggleMenu } = useMenu();
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState('');

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        getDoc(userDocRef).then(docSnap => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const fullName = data.name || `${data.firstName} ${data.lastName}`.trim();
                setUserName(fullName || 'User');
                setProfilePicUrl(data.profilePicUrl || '');
            }
        });
    }
  }, []);

  const handleReferralShare = async () => {
    try {
        await Share.share({
            message: "Join me on PU Blood Connect and be a part of a life-saving community! Download the app here: [Your App Link Here]",
        });
    } catch (error) {
        Alert.alert("Error", "Could not open share menu.");
    }
  };

  const handlePress = (item: MenuItem) => {
    toggleMenu();
    
    if (item.name === 'Refer a Friend') {
        handleReferralShare();
    }
    else if (item.href) {
      router.push(item.href);
    }
    
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* --- PROFILE SECTION --- */}
      <Pressable 
        style={styles.profileSection} 
        onPress={() => handlePress({ name: 'Profile', href: '/profile', icon: 'person-outline' })}
      >
        <View style={styles.profileCircle}>
            {profilePicUrl ? (
                <Image source={{ uri: profilePicUrl }} style={styles.profileImage} />
            ) : (
                <Ionicons name="person" size={24} color="#971A1A" />
            )}
        </View>
        <View style={styles.profileTextContainer}>
            <Text style={styles.profileName}>{userName}</Text>
            <Text style={styles.profileLink}>View Profile</Text>
        </View>
      </Pressable>

      {/* --- Menu Items --- */}
      <View style={styles.menuItemsContainer}>
        {menuItems.map((item, index) => (
          <Pressable key={index} style={styles.menuItem} onPress={() => handlePress(item)}>
            <Ionicons name={item.icon} size={22} color="white" />
            <Text style={styles.menuItemText}>{item.name}</Text>
          </Pressable>
        ))}
        <View style={styles.divider} />
        {secondaryMenuItems.map((item, index) => (
          <Pressable key={index} style={styles.menuItem} onPress={() => handlePress(item)}>
            <Ionicons name={item.icon} size={22} color="white" />
            <Text style={styles.menuItemText}>{item.name}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#971A1A' },
  profileSection: {
    flexDirection: 'row', // Align items side-by-side
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 95,
    paddingBottom: 25,

  },
  profileCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', 
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileTextContainer: {
      marginLeft: 15,
  },
  profileName: {
      color: 'white',
      fontSize: 18,
      fontWeight: 'bold',
  },
  profileLink: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: 14,
  },
  menuItemsContainer: {
    paddingLeft: 40,
    flex: 1,
    marginTop: 10,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  menuItemText: { color: 'white', fontSize: 16, marginLeft: 20, fontWeight: '500' },
  divider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)', marginVertical: 15, marginRight: 20 },
});