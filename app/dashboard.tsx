import React, { useEffect, useState } from 'react';
import {useNavigationOptions} from 'expo-router'
import {SafeAreaView,View,Text,ScrollView,StyleSheet,TouchableOpacity,ActivityIndicator,Image,TextInput,ImageBackground,Platform,StatusBar} from 'react-native';
// New imports for progress bar and date calculation
import * as Progress from 'react-native-progress';
import { differenceInDays } from 'date-fns';

import Icon from 'react-native-vector-icons/FontAwesome5';
import RegularIcon from 'react-native-vector-icons/FontAwesome';
import { getAuth } from 'firebase/auth';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { firebaseApp, db } from '../firebase';

// --- Type Definitions ---
type UserProfile = { uid: string; name?: string; department?: string; totalDonates?: number; lastDonated?: any; bloodGroup?: string; [key: string]: any; };
type Donation = { id: string; donorName?: string; department?: string; bloodGroup?: string; [key: string]: any; };

// --- Style Palette ---
const palette = {
  primaryRed: '#FE465E',
  statsRed: '#D9324B',
  darkGreen: '#3A6054',
  pageBg: '#FFFBFB',
  cardBgLavender: '#F7F2FA',
  darkText: '#333333',
  lightText: '#8A8A8A',
  white: '#ffffff',
  borderLight: '#F0F0F0',
  trophyYellow: '#FFC107',
  trophyBg: '#FFF2CC',
  eligibleGreen: '#28a745',
};

const HEADER_HEIGHT = 70;
const DONATION_ELIGIBILITY_DAYS = 60;

export default function DashboardScreen() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [topStudentDonors, setTopStudentDonors] = useState<UserProfile[]>([]);
  const [recentDonors, setRecentDonors] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'department' | 'students'>('department');
  const [daysUntilEligible, setDaysUntilEligible] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isEligible, setIsEligible] = useState(false);

  // --- Data Fetching Effect ---
  useEffect(() => {
    const auth = getAuth(firebaseApp);
    const user = auth.currentUser;

    const fetchUserData = async () => {
      if (!user) return;
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) setUserProfile({ uid: user.uid, ...docSnap.data() });
    };

    const fetchTopDonors = async () => {
      const q = query(collection(db, 'users'), orderBy('totalDonates', 'desc'), limit(5));
      const snap = await getDocs(q);
      setTopStudentDonors(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    };

    const fetchRecent = async () => {
      const q = query(collection(db, 'donations'), orderBy('date', 'desc'), limit(3));
      const snap = await getDocs(q);
      setRecentDonors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    Promise.all([fetchUserData(), fetchTopDonors(), fetchRecent()])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // --- NEW EFFECT for Calculating Eligibility ---
  useEffect(() => {
    if (userProfile && userProfile.lastDonated) {
      const lastDonationDate = userProfile.lastDonated.toDate();
      const today = new Date();
      const daysPassed = differenceInDays(today, lastDonationDate);
      
      if (daysPassed >= DONATION_ELIGIBILITY_DAYS) {
        setIsEligible(true);
        setDaysUntilEligible(0);
        setProgress(1);
      } else {
        setIsEligible(false);
        const remainingDays = DONATION_ELIGIBILITY_DAYS - daysPassed;
        setDaysUntilEligible(remainingDays);
        setProgress(daysPassed / DONATION_ELIGIBILITY_DAYS);
      }
    } else {
      setIsEligible(true);
      setProgress(1);
      setDaysUntilEligible(0);
    }
  }, [userProfile]);


  // --- Loading State UI ---
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.statsRed} />
        <Text style={{ color: palette.darkText }}>Loading Dashboard...</Text>
      </View>
    );
  }

  // --- ListItem Component ---
  const ListItem = ({
    name, detail, action, iconName, iconBg, iconColor, isTrophy = false,
  }: {
    name: string; detail?: string; action: React.ReactNode; iconName: string; iconBg: string; iconColor?: string; isTrophy?: boolean;
  }) => (
    <View style={styles.listItem}>
      <View style={[styles.itemIcon, { backgroundColor: iconBg }]}>
        <Icon name={iconName} size={18} color={iconColor || palette.darkText} solid={isTrophy} />
      </View>
      <View style={styles.itemDetails}>
        <Text style={styles.itemTitle}>{name}</Text>
        {detail && <Text style={styles.itemSubtitle}>{detail}</Text>}
      </View>
      <Text style={[styles.itemAction, { color: palette.primaryRed }]}>{action}</Text>
    </View>
  );

  // --- Main Render ---
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Sticky Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity><Icon name="bars" size={22} color={palette.darkText} /></TouchableOpacity>
        <View style={styles.logo}>
          <Image source={{ uri: 'https://i.ibb.co/68v8z0p/heart-logo.png' }} style={styles.logoImg} />
          <Text style={styles.logoText}>PU Heart Connect</Text>
        </View>
        <TouchableOpacity><RegularIcon name="bell" size={22} color={palette.darkText} /></TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.container, { paddingTop: HEADER_HEIGHT }]}
      >

        {userProfile && (
  <View style={styles.welcomeCard}>
    {/* --- Left Side Content --- */}
    <View style={styles.leftContent}>
      <Text style={styles.welcomeTitle}>Hi {userProfile.name || 'User'}!</Text>
      <Text style={styles.welcomeDetail}>
        Department: {userProfile.department || 'N/A'}
      </Text>
      <Text style={styles.welcomeDetail}>
        Total Donates: {userProfile.totalDonates || 0} Unites
      </Text>
      <Text style={styles.welcomeDetail}>
        Last Donate: {userProfile.lastDonated ? new Date(userProfile.lastDonated.seconds * 1000).toLocaleDateString() : 'N/A'}
      </Text>
      {/* --- NEW: Conditional Eligibility Text --- */}
{isEligible ? (
  <Text style={styles.eligibilityTextEligible}>
    You can donate now
  </Text>
) : (
  <Text style={styles.eligibilityTextWaiting}>
    Wait for {daysUntilEligible} days
  </Text>
)}
    </View>

    {/* --- Right Side Content --- */}
    <View style={styles.rightContent}>
       <View style={styles.classicTag}>
          <Text style={styles.classicTagText}>Classic</Text>
       </View>
       <View style={styles.bloodGroupBox}>
          <Text style={styles.bloodGroupLabel}>Blood</Text>
          <Text style={styles.bloodGroupValue}>{userProfile.bloodGroup || 'N/A'}</Text>
       </View>
    </View>

    {/* --- Overlapping Progress Circle --- */}
    <View style={styles.progressCircleContainer}>
  {/* The progress ring now acts as a background */}
  <Progress.Circle
    size={110}
    progress={progress}
    color={palette.statsRed}
    thickness={8}
    borderWidth={0}
    unfilledColor="rgba(255, 255, 255, 0.4)"
  />
  {/* This container holds the face elements and sits on top of the ring */}
  <View style={styles.faceContainer}>
    {/* Eyes */}
    <View style={styles.eyesContainer}>
      <View style={styles.eye} />
      <View style={styles.eye} />
    </View>
    
    {/* Dynamic Text */}
    <Text style={styles.faceText}>
      {isEligible ? 'You Are Eligible' : 'Not Eligible'}
    </Text>
    
    {/* Dynamic Mouth (smile or frown) */}
    <View
      style={[
        styles.mouth,
        // Conditionally flip the mouth to create a frown
        { transform: [{ rotate: isEligible ? '0deg' : '180deg' }] }
      ]}
    />
  </View>
    </View>
  </View>
)}

        {/* CTA Banner, Stats, and Lists... */}
        <ImageBackground source={{uri: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?q=80&w=1200'}} style={styles.ctaBanner} imageStyle={{ borderRadius: 12 }}>
          <View style={styles.overlay}>
             <Text style={styles.ctaTitle}>Save Lives, Donate Blood</Text>
             <Text style={styles.ctaSubtitle}>Join Our Genius Mission</Text>
          </View>
        </ImageBackground>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.statsHeader}>PU Hits</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>1005+</Text>
              <Text style={styles.statLabel}>Students{'\n'}Registered</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>109+</Text>
              <Text style={styles.statLabel}>Units of Blood{'\n'}Donated</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>99+</Text>
              <Text style={styles.statLabel}>Campaigns{'\n'}Organized</Text>
            </View>
          </View>
        </View>

        {/* Recent Donors */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Recent Donors</Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>View Full List</Text>
            </TouchableOpacity>
          </View>
          {recentDonors.map((donor) => (
            <ListItem
              key={donor.id}
              name={donor.donorName || 'Anonymous'}
              detail={donor.department || 'Unknown Department'}
              action={donor.bloodGroup}
              iconName="user"
              iconBg="#e9ecef"
            />
          ))}
        </View>

        {/* Top Donors */}
        <View style={styles.listSection}>
          <Text style={styles.listTitle}>Top Donors</Text>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'students' && styles.activeTab]}
              onPress={() => setActiveTab('students')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'students' && styles.activeTabText,
                ]}
              >
                Students
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'department' && styles.activeTab]}
              onPress={() => setActiveTab('department')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'department' && styles.activeTabText,
                ]}
              >
                Department
              </Text>
            </TouchableOpacity>
          </View>
          {activeTab === 'students'
            ? topStudentDonors.map((donor) => (
                <ListItem
                  key={donor.uid}
                  name={donor.name || 'Anonymous Donor'}
                  detail={donor.department}
                  action={`${donor.totalDonates} Units`}
                  iconName="trophy"
                  iconBg={palette.trophyBg}
                  iconColor={palette.trophyYellow}
                  isTrophy
                />
              ))
            : (
                <>
                  <ListItem
                    key="dept-management"
                    name="Department of Management"
                    action="5 Units"
                    iconName="trophy"
                    iconBg={palette.trophyBg}
                    iconColor={palette.trophyYellow}
                    isTrophy
                  />
                  <ListItem
                    key="dept-engineering"
                    name="Department of Engineering"
                    action="4 Units"
                    iconName="trophy"
                    iconBg={palette.trophyBg}
                    iconColor={palette.trophyYellow}
                    isTrophy
                  />
                </>
              )}
        </View>

        {/* bottom spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Footer */}
      <View style={styles.footerFloating}>
        <TouchableOpacity style={[styles.footerBtn, styles.btnDonate]}>
          <Text style={[styles.footerBtnText, { color: palette.white }]}>
            Donate
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.footerBtn, styles.btnRequest]}>
          <Text style={[styles.footerBtnText, { color: palette.statsRed }]}>
            Request
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
   // --- NEW STYLES for Tracker Card ---
  trackerCard: {
    backgroundColor: palette.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: 'rgba(0,0,0,0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.darkText,
    marginBottom: 4,
  },
  trackerSubtitle: {
    fontSize: 14,
    color: palette.lightText,
  },
  progressText: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.darkText,
  },
  safeArea: { flex: 1, backgroundColor: palette.pageBg, },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
welcomeCard: {
backgroundColor: '#F7F2FA', // Light lavender background from your image
borderRadius: 16,
paddingVertical: 16,
paddingLeft: 20,
// Increase the right padding
paddingRight: 120,
marginBottom: 20,
marginTop:24,
flexDirection: 'row',
elevation: 4,
shadowColor: 'rgba(0,0,0,0.1)',
overflow: 'hidden', // Add this to contain potential overflowing content

  },
  leftContent: {
    flex: 0, // Takes up the available space on the left
    justifyContent: 'center',
  },
  rightContent: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingLeft: 12,
    paddingTop: 13,


  },
  welcomeTitle: {
    fontSize: 23,
    fontWeight: 'bold',
    color: palette.darkText,
    marginBottom: 8,
  },
  welcomeDetail: {
    fontSize: 13,
    color: palette.lightText,
    lineHeight: 20,
  },
  eligibilityTextEligible: {
    color: palette.statsRed, // Red color
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: 0,
    alignSelf: 'flex-start',
    overflow: 'hidden', // Ensures background respects borderRadius on Android
  },
  eligibilityTextWaiting: {
    color: palette.lightText,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 16,
    paddingVertical: 8,
  },
  classicTag: {
    backgroundColor: palette.darkGreen,
    borderRadius: 16,
    paddingVertical: 1,
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  classicTagText: {
    color: palette.white,
    fontWeight: '500',
    fontSize: 11,
  },
  bloodGroupBox: {
    backgroundColor: palette.statsRed,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 25,
  },
  bloodGroupLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 6,
    fontWeight: '500',
  },
  bloodGroupValue: {
    color: palette.white,
    fontSize: 22,
    fontWeight: 'bold',
  },
  progressCircleContainer: {
    // This is the key to the overlap effect!
    position: 'absolute',
    right: 15,
    top: '60%',
    transform: [{ translateY: -55 }], // Centers the circle vertically
  },
  progressCircleText: {
    color: palette.statsRed,
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  // --- NEW STYLES for the Face ---
  faceContainer: {
    position: 'absolute', // Sits on top of the progress ring
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyesContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 27, // Position eyes from the top
  },
  eye: {
    width: 8,
    height: 8,
    borderRadius: 6,
    backgroundColor: palette.statsRed,
    marginHorizontal: 10,
  },
  faceText: {
    color: palette.statsRed,
    fontWeight: 'bold',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 11,
    // Positioned absolutely to be in the middle
    position: 'absolute',
    top: 45,
  },
  mouth: {
    width: 47,
    height: 25,
    // This creates the half-circle arc shape
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    borderTopWidth: 0, // No top border
    borderWidth: 4,
    borderColor: palette.statsRed,
    backgroundColor: 'transparent',
    // Positioned absolutely at the bottom
    position: 'absolute',
    bottom: 18,
  },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,

    backgroundColor: '#EDF0F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
    elevation: 4,
  },
  logo: { flexDirection: 'row', alignItems: 'center' },
  logoImg: { width: 26, height: 26, marginRight: 8 },
  logoText: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.statsRed,
    textTransform: 'uppercase',
  },

  scrollView: { flex: 1 },
  container: { paddingHorizontal: 16, paddingBottom: 0 },

  searchBar: { position: 'relative', marginBottom: 20, marginTop:20 },
  searchInput: {
    backgroundColor: palette.white,
    paddingVertical: 12,
    paddingLeft: 45,
    paddingRight: 15,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: palette.borderLight,
    elevation: 3,
  },
  searchIcon: { position: 'absolute', top: 15, left: 18, zIndex: 1 },

  userCard: {
    backgroundColor: palette.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE8EB',
    elevation: 4,
  },
  userCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: '600', color: palette.darkText },
  userDetails: { fontSize: 12, color: palette.lightText, lineHeight: 20 },
  userAvatarContainer: { alignItems: 'center' },
  classicLabel: { fontSize: 11, fontWeight: '500', color: palette.lightText },
  bloodTypeLarge: { fontSize: 28, fontWeight: '700', color: palette.statsRed },
  eligibleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: '#E4DDEB',
    borderRadius: 12,
    padding: 4,
    marginTop: 10,
    elevation: 2,
  },
  eligibleTagText: { fontSize: 11, fontWeight: '500', color: palette.darkText },

  ctaBanner: { marginBottom: 25, borderRadius: 12, elevation: 5 },
  overlay: {
    backgroundColor: 'rgba(217, 50, 75, 0.85)',
    borderRadius: 12,
    padding: 20,
  },
  ctaTitle: { color: palette.white, fontSize: 20, fontWeight: '700' },
  ctaSubtitle: { color: palette.white, fontSize: 14, fontWeight: '400' },

  statsSection: { backgroundColor: palette.statsRed, padding: 20, borderRadius: 12, marginBottom: 25 },
  statsHeader: { color: palette.white, fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 15 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '700', color: palette.white },
  statLabel: { fontSize: 11, color: palette.white, textAlign: 'center' },

  listSection: { backgroundColor: palette.cardBgLavender, padding: 20, borderRadius: 12, marginBottom: 25 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  listTitle: { fontSize: 18, fontWeight: '600', color: palette.darkText },
  viewAll: { fontSize: 13, color: palette.primaryRed },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 1,
  },
  itemIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemDetails: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: palette.darkText },
  itemSubtitle: { fontSize: 12, color: palette.lightText },
  itemAction: { fontWeight: '600', fontSize: 16 },

  tabs: { flexDirection: 'row', marginBottom: 15,gap:8 },
  tab: { paddingVertical: 6, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: '#E4DDEB' },
  activeTab: { backgroundColor: palette.statsRed, borderColor: palette.statsRed },
  tabText: { color: palette.darkText, fontSize: 13 },
  activeTabText: { color: palette.white },

  footerFloating: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 15,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerBtn: { flex:1, padding: 10, borderRadius: 10, alignItems: 'center',marginHorizontal:8 },
  footerBtnText: { fontSize: 16, fontWeight: '600' },
  btnDonate: { backgroundColor: palette.statsRed },
  btnRequest: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.statsRed },
});
