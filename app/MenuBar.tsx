// app/MenuBar.tsx

import React from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMenu } from './context/MenuContext';
import { useRouter, Href } from 'expo-router'; // 1. Import Href

// 2. Define a type for our menu items for better safety
type MenuItem = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  name: string;
  href?: Href; // Use Href instead of string
};

const menuItems: MenuItem[] = [ // Apply the type
  { icon: 'grid-outline', name: 'Dashboard', href: '/dashboard' },
  { icon: 'heart-outline', name: 'My Donations' },
  { icon: 'search-outline', name: 'Find Donors' },
  { icon: 'calendar-outline', name: 'Events' },
  { icon: 'notifications-outline', name: 'Notifications', href: '/notifications' },
];

const secondaryMenuItems: MenuItem[] = [ // Apply the type
    { icon: 'chatbox-ellipses-outline', name: 'Share Feedback', href: '/feedback'},
    { icon: 'settings-outline', name: 'Settings' },
    { icon: 'help-circle-outline', name: 'Help Center' },
    { icon: 'log-out-outline', name: 'Logout' },
];


const MenuBar = () => {
  const { toggleMenu } = useMenu();
  const router = useRouter();

  // 3. Use the MenuItem type in the handler function
  const handlePress = (item: MenuItem) => {
    if (item.href) {
      router.push(item.href); // This will now work without an error
    }
    toggleMenu();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileCircle}>
          <Ionicons name="person" size={24} color="#971A1A" />
        </View>
      </View>

      {/* Menu Items */}
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
  container: {
    flex: 1,
    backgroundColor: '#971A1A',
  },
  profileSection: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    alignItems: 'flex-start',
  },
  profileCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 45,
    marginLeft: 10,
  },
  menuItemsContainer: {
    paddingLeft: 40,
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  menuItemText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 20,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 20,
    marginRight: 20,
  },
});

export default MenuBar;