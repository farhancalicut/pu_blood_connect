import { 
  Shield, 
  CheckCircle, 
  Users, 
  Calendar, 
  MapPin, 
  Bell, 
  Grid3X3, 
  FileText, 
  Clock, 
  QrCode, 
  Image as ImageIcon, 
  MessageSquare, 
  HelpCircle,
  User
} from 'lucide-react-native';
import { Href, useRouter } from 'expo-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth'; 
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, SafeAreaView, Share, StyleSheet, Text, View, Dimensions } from 'react-native';
import { db } from '../firebase';
import { showAlert } from '../utils/alert';
import { useMenu } from './context/MenuContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;
const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (screenHeight / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

// Icon mapping from Ionicons names to Lucide components
const iconMap: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  'shield-outline': Shield,
  'checkmark-circle-outline': CheckCircle,
  'people-outline': Users,
  'calendar-outline': Calendar,
  'location-outline': MapPin,
  'notifications-outline': Bell,
  'grid-outline': Grid3X3,
  'document-text-outline': FileText,
  'time-outline': Clock,
  'qr-code-outline': QrCode,
  'images-outline': ImageIcon,
  'chatbox-ellipses-outline': MessageSquare,
  'help-circle-outline': HelpCircle,
  'person-outline': User,
  'person': User,
};

type MenuItem = {
  icon: string;
  name: string;
  href?: Href;
};

// Define different menu items for admin and regular users
const getMainMenuItems = (isAdmin: boolean): MenuItem[] => {
  if (isAdmin) {
    return [
      { icon: 'shield-outline', name: 'Admin Dashboard', href: '/admin-dashboard' },
      { icon: 'checkmark-circle-outline', name: 'Pending Approvals', href: '/admin' },
      { icon: 'people-outline', name: 'Manage Users', href: '/admin-users' },
      { icon: 'calendar-outline', name: 'Manage Events', href: '/admin-events' },
      { icon: 'location-outline', name: 'Blood Banks', href: '/admin-blood-banks' },
      { icon: 'notifications-outline', name: 'Notifications', href: '/notifications' },
    ];
  } else {
    return [
      { icon: 'grid-outline', name: 'Dashboard', href: '/dashboard' },
      { icon: 'document-text-outline', name: 'My Requests', href: '/my-requests' },
      { icon: 'time-outline', name: 'My History', href: '/History' },
      { icon: 'location-outline', name: 'Nearby Blood Banks', href: '/blood-banks' },
      { icon: 'calendar-outline', name: 'Events & Camps', href: '/events' },
      { icon: 'qr-code-outline', name: 'QR Scanner', href: '/qr-scanner' },
      { icon: 'notifications-outline', name: 'Notifications', href: '/notifications' },
    ];
  }
};

const secondaryMenuItems: MenuItem[] = [
    { icon: 'images-outline', name: 'Gallery', href: '/gallery' },
    { icon: 'chatbox-ellipses-outline', name: 'Share Feedback', href: '/feedback'},
    { icon: 'people-outline', name: 'Refer a Friend' },
    { icon: 'help-circle-outline', name: 'FAQ', href: '/faq' },
];




export default function MenuBar() {
  const { toggleMenu } = useMenu();
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

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
            setIsAdmin(data.role === 'admin');
          } else {
            setUserName(user.email || 'User');
            setIsAdmin(false);
          }
        }).catch(() => {
          setUserName(user.email || 'User');
          setIsAdmin(false);
        });
      } else {
        setUserName('User');
        setProfilePicUrl('');
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleReferralShare = async () => {
    try {
        await Share.share({
            message: "Join me on PU NSS CONNECT and be a part of a life-saving community! Download the app here: [Your App Link Here]",
        });
    } catch (error) {
        showAlert("Error", "Could not open share menu.");
    }
  };

  const handlePress = (item: MenuItem) => {
    if (item.href) {
      router.push(item.href);
    } 
    else if (item.name === 'Refer a Friend') {
      handleReferralShare();
    }
    setTimeout(() => {
      toggleMenu();
    }, 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profileSection}>
        <Pressable
          style={styles.profileCircle}
          onPress={() => handlePress({ name: 'Profile', href: '/profile', icon: 'person-outline' })}
        >
          {profilePicUrl ? (
            <Image source={{ uri: profilePicUrl }} style={styles.profileImage} />
          ) : (
            <User size={scale(24)} color="#971A1A" />
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

      <View style={styles.menuItemsContainer}>
        {getMainMenuItems(isAdmin).map((item, index) => {
          const IconComponent = iconMap[item.icon] || User;
          return (
            <Pressable
              key={index}
              style={styles.menuItem}
              onPress={() => handlePress(item)}
              hitSlop={item.name === 'Dashboard' ? 0 : undefined}
            >
              <IconComponent size={scale(22)} color="white" />
              <Text style={styles.menuItemText}>{item.name}</Text>
            </Pressable>
          );
        })}
        <View style={styles.divider} />
        {secondaryMenuItems.map((item, index) => {
          const IconComponent = iconMap[item.icon] || User;
          return (
            <Pressable key={index} style={styles.menuItem} onPress={() => handlePress(item)}>
              <IconComponent size={scale(22)} color="white" />
              <Text style={styles.menuItemText}>{item.name}</Text>
            </Pressable>
          );
        })}

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#971A1A' },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(100), // Reduced for smaller screens
    paddingBottom: verticalScale(20), // Reduced for smaller screens
  },
  profileCircle: {
    width: moderateScale(40), // Slightly smaller on small screens
    height: moderateScale(40),
    borderRadius: moderateScale(20),
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
    marginLeft: scale(12), // Reduced margin
    marginTop: scale(3),
    flex: 1, // Allow text to take available space
  },
  profileName: {
    color: 'white',
    fontSize: moderateScale(13),
    fontWeight: 'bold',
  },
  profileLink: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: moderateScale(12),
  },
  menuItemsContainer: {
    paddingLeft: scale(30), // Reduced left padding
    paddingRight: scale(10), // Add right padding
    flex: 1,
    marginTop: verticalScale(8), // Reduced margin
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: verticalScale(13), // Reduced vertical padding
    paddingRight: scale(10), // Add right padding to prevent text cutoff
  },
  menuItemText: { 
    color: 'white', 
    fontSize: moderateScale(14), // Slightly smaller font
    marginLeft: scale(13), // Reduced margin
    fontWeight: '500',
    flex: 1, // Allow text to wrap if needed
    flexWrap: 'wrap',
  },
  divider: { 
    height: 1, 
    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
    marginVertical: verticalScale(12), // Reduced margin
    marginRight: scale(15) // Reduced margin
  },
});
