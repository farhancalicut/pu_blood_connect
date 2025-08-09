// app/menu-bar.tsx
import {React,useEffect,useRef} from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity,Animated, Dimensions } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5, Entypo } from '@expo/vector-icons';

const {width} = Dimensions.get('window');

export default function MenuBar({visible,onClose}) {
    const slideAnim = useRef(new Animated.Value(-width)).current; // start off-screen left

    useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Animated.View
      style={[
        styles.menuContainer,
        { transform: [{ translateX: slideAnim }] }
      ]}
    >
    <View style={styles.container}>
      {/* Top bar with two icons */}
      <View style={styles.topBar}>
        <Ionicons name="person-circle-outline" size={40} color="#fff" />

        <TouchableOpacity onPress={onClose}>
        <Ionicons name="close-circle-outline" size={40} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Menu items */}
      <ScrollView>
        <MenuItem icon={<Ionicons name="home-outline" size={22} color="#fff" />} text="Home" />
        <MenuItem icon={<Ionicons name="key-outline" size={22} color="#fff" />} text="Find a Donor" />
        <MenuItem icon={<Ionicons name="notifications-outline" size={22} color="#fff" />} text="Notifications" />
        <MenuItem icon={<Ionicons name="time-outline" size={22} color="#fff" />} text="History" />
        <MenuItem icon={<MaterialIcons name="volunteer-activism" size={22} color="#fff" />} text="Volunteer Registration" />
        <MenuItem icon={<Ionicons name="calendar-outline" size={22} color="#fff" />} text="Upcoming Camp" />
        <MenuItem icon={<FontAwesome5 name="hospital" size={22} color="#fff" />} text="Near Blood Banks" />
        <MenuItem icon={<Ionicons name="person-add-outline" size={22} color="#fff" />} text="Refer Friends" />
        <MenuItem icon={<Ionicons name="images-outline" size={22} color="#fff" />} text="Gallery" />
        <MenuItem icon={<Ionicons name="information-circle-outline" size={22} color="#fff" />} text="About Us" />
        <MenuItem icon={<Ionicons name="log-out-outline" size={22} color="#fff" />} text="Logout" />
      </ScrollView>
    </View>
    </Animated.View>
  );
}

// Reusable menu item component
function MenuItem({ icon, text }: { icon: JSX.Element; text: string }) {
  return (
    <TouchableOpacity style={styles.menuItem}>
      {icon}
      <Text style={styles.menuText}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#A31621', // red background
    paddingTop: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  menuText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 15,
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width * 0.8, // menu covers 70% of screen width
    height: '100%',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  closeBtn: {
    position: 'absolute',
    right: 10,
    top: 10,
  }
});
