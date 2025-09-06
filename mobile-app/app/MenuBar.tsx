import { Ionicons } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth'; 
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, SafeAreaView, Share, StyleSheet, Text, View, Dimensions } from 'react-native';
import { db } from '../firebase';
import { useMenu } from './context/MenuContext';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375;
const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

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
  const [userName, setUserName] = useState<string | null>(null);
  const [profilePicUrl, setProfilePicUrl] = useState('');

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        getDoc(userDocRef).then(docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            let fullName = '';
            if (data.name && data.name.trim()) {
              fullName = data.name.trim();
            } else if (data.firstName || data.lastName) {
              fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
            }
            if (!fullName) {
              fullName = user.email || 'User';
            }
            setUserName(fullName);
            setProfilePicUrl(data.profilePicUrl || '');
          } else {
            setUserName(user.email || 'User');
          }
        }).catch(() => setUserName(user.email || 'User'));
      } else {
        setUserName('User');
        setProfilePicUrl('');
      }
    });

    // Clean up the listener when the component is unmounted
    return () => unsubscribe();
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
    // Navigate FIRST
    if (item.href) {
      router.push(item.href);
    } 
    else if (item.name === 'Refer a Friend') {
      handleReferralShare();
    }
    
    // THEN, close the menu after a tiny delay
    setTimeout(() => {
      toggleMenu();
    }, 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* --- PROFILE SECTION --- */}
      <View style={styles.profileSection}>
        <Pressable
          style={styles.profileCircle}
          onPress={() => handlePress({ name: 'Profile', href: '/profile', icon: 'person-outline' })}
        >
          {profilePicUrl ? (
            <Image source={{ uri: profilePicUrl }} style={styles.profileImage} />
          ) : (
            <Ionicons name="person" size={scale(24)} color="#971A1A" />
          )}
        </Pressable>
        <View style={styles.profileTextContainer}>
          <Pressable onPress={() => handlePress({ name: 'Profile', href: '/profile', icon: 'person-outline' })}>
            <Text style={styles.profileName}>
              {userName === null ? "Loading..." : userName}
            </Text>
          </Pressable>
          <Pressable onPress={() => handlePress({ name: 'Profile', href: '/profile', icon: 'person-outline' })}>
            <Text style={styles.profileLink}>View Profile</Text>
          </Pressable>
        </View>
      </View>

      {/* --- Menu Items --- */}
      <View style={styles.menuItemsContainer}>
        {menuItems.map((item, index) => (
          <Pressable
            key={index}
            style={styles.menuItem}
            onPress={() => handlePress(item)}
            hitSlop={item.name === 'Dashboard' ? 0 : undefined}
          >
            <Ionicons name={item.icon} size={scale(22)} color="white" />
            <Text style={styles.menuItemText}>{item.name}</Text>
          </Pressable>
        ))}
        <View style={styles.divider} />
        {secondaryMenuItems.map((item, index) => (
          <Pressable key={index} style={styles.menuItem} onPress={() => handlePress(item)}>
            <Ionicons name={item.icon} size={scale(22)} color="white" />
            <Text style={styles.menuItemText}>{item.name}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
};

// --- RESPONSIVE STYLESHEET ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#971A1A' },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingTop: scale(95),
    paddingBottom: scale(25),
  },
  profileCircle: {
    width: scale(45),
    height: scale(45),
    borderRadius: scale(25),
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
    marginLeft: scale(15),
    marginTop: scale(5),
  },
  profileName: {
    color: 'white',
    fontSize: scale(13),
    fontWeight: 'bold',
  },
  profileLink: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: scale(13),
  },
  menuItemsContainer: {
    paddingLeft: scale(40),
    flex: 1,
    marginTop: scale(10),
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: scale(13) 
  },
  menuItemText: { 
    color: 'white', 
    fontSize: scale(14), 
    marginLeft: scale(15), 
    fontWeight: '500' 
  },
  divider: { 
    height: 1, 
    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
    marginVertical: scale(15), 
    marginRight: scale(20) 
  },
});