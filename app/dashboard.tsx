// app/dashboard.tsx

import {
  ActivityIndicator,
  Image,
  FlatList,
  Dimensions,
  ImageBackground,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useEffect, useState, useRef, useCallback } from 'react'; // 1. Import useCallback
import * as Progress from 'react-native-progress';
import { differenceInDays } from 'date-fns';
import { getAuth } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';
import RegularIcon from 'react-native-vector-icons/FontAwesome';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useFocusEffect, useRouter  } from 'expo-router'; // 2. Import useFocusEffect
import { db, firebaseApp } from '../firebase';
import { useMenu } from './context/MenuContext';

// --- Type Definitions ---
type UserProfile = { uid: string; lastname?: string; firstName?: string; department?: string; totalDonates?: number; lastDonated?: any; bloodGroup?: string; [key: string]: any; };
type Donation = { id: string; donorName?: string; department?: string; bloodGroup?: string; [key:string]: any; };
type DepartmentStat = { name: string; donorCount: number; totalUnits: number; };
type Testimonial = { id: string; donorName: string; department: string; text: string; rating?: number; createdAt?: any; };

const palette = { primaryRed: '#FE465E', statsRed: '#D9324B', darkGreen: '#3A6054', pageBg: '#FFFBFB', cardBgLavender: '#F7F2FA', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#F0F0F0', trophyYellow: '#FFC107', trophyBg: '#FFF2CC', eligibleGreen: '#28a745', };
const HEADER_HEIGHT = 70;
const DONATION_ELIGIBILITY_DAYS = 60;
const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.8; // Each card will take 80% of the screen width
const CARD_MARGIN = (screenWidth - CARD_WIDTH) / 7; // Margin on the sides to center the card

const TestimonialCard = ({ item }: { item: Testimonial }) => (
    <View style={styles.testimonialCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardAvatar}>
            <Icon name="user-alt" size={16} color={palette.darkText} />
        </View>
        <View style={styles.cardHeaderText}>
            <Text style={styles.donorName}>{String(item.donorName)}</Text>
            <Text style={styles.donorDepartment}>{String(item.department)}</Text>
        </View>
      </View>
      <Text style={styles.testimonialText}>"{String(item.text)}"</Text>
    </View>
);
export default function DashboardScreen() {
  const { toggleMenu } = useMenu(); 
  const router = useRouter(); // Initialize the router
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [topStudentDonors, setTopStudentDonors] = useState<UserProfile[]>([]);
  const [recentDonors, setRecentDonors] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'department' | 'students'>('department');
  const [daysUntilEligible, setDaysUntilEligible] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isEligible, setIsEligible] = useState(false);
  const [topDepartments, setTopDepartments] = useState<DepartmentStat[]>([]);
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [totalUnitsDonated, setTotalUnitsDonated] = useState(0);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // 3. Create a useCallback for fetching data to prevent re-creation
  const loadDashboardData = useCallback(() => {
    setLoading(true);
    const auth = getAuth(firebaseApp);
    const user = auth.currentUser;

    const fetchUserData = async () => { if (!user) return; const docSnap = await getDoc(doc(db, 'users', user.uid)); if (docSnap.exists()) setUserProfile({ uid: user.uid, ...docSnap.data() }); };
    const fetchTopDonors = async () => { const q = query(collection(db, 'users'), orderBy('totalDonates', 'desc'), limit(5)); const snap = await getDocs(q); setTopStudentDonors(snap.docs.map(d => ({ uid: d.id, ...d.data() }))); };
    const fetchRecent = async () => { const q = query(collection(db, 'donations'), orderBy('date', 'desc'), limit(3)); const snap = await getDocs(q); setRecentDonors(snap.docs.map(d => ({ id: d.id, ...d.data() }))); };
    const fetchAggregateStats = async () => {
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const studentCount = usersSnapshot.size;
      const totalUnits = usersSnapshot.docs.reduce((sum, doc) => sum + (doc.data().totalDonates || 0), 0);
      setTotalRegistered(studentCount);
      setTotalUnitsDonated(totalUnits);
      const deptStats: { [key: string]: { donorCount: number; totalUnits: number } } = {};
      usersSnapshot.forEach(userDoc => {
        const userData = userDoc.data();
        const department = userData.department;
        const totalDonates = userData.totalDonates || 0;
        if (department && totalDonates > 0) {
          if (!deptStats[department]) deptStats[department] = { donorCount: 0, totalUnits: 0 };
          deptStats[department].donorCount += 1;
          deptStats[department].totalUnits += totalDonates;
        }
      });
      const statsArray = Object.keys(deptStats).map(deptName => ({ name: deptName, donorCount: deptStats[deptName].donorCount, totalUnits: deptStats[deptName].totalUnits }));
      statsArray.sort((a, b) => b.donorCount - a.donorCount || b.totalUnits - a.totalUnits);
      setTopDepartments(statsArray);
    };
    const fetchTestimonials = async () => {
        const q = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setTestimonials(snap.docs.map(d => ({ id: d.id, ...d.data() } as Testimonial)));
    };
    
    Promise.all([ fetchUserData(), fetchTopDonors(), fetchRecent(), fetchAggregateStats(), fetchTestimonials() ])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // 4. Use the hook to refresh data whenever the screen is focused
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

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

    // --- NEW: Carousel navigation functions ---
  const handleScroll = (event: any) => { const scrollPosition = event.nativeEvent.contentOffset.x; const index = Math.round(scrollPosition / CARD_WIDTH); setActiveIndex(index); };
  const scrollToNext = () => { if (activeIndex < testimonials.length - 1) flatListRef.current?.scrollToIndex({ index: activeIndex + 1 }); };
  const scrollToPrev = () => { if (activeIndex > 0) flatListRef.current?.scrollToIndex({ index: activeIndex - 1 }); };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.statsRed} />
        <Text style={{ color: palette.darkText }}>Loading Dashboard...</Text>
      </View>
    );
  }

  const ListItem = ({ name, detail, action, iconName, iconBg, iconColor, isTrophy = false }: { name: string; detail?: string; action: React.ReactNode; iconName: string; iconBg: string; iconColor?: string; isTrophy?: boolean; }) => (
    <View style={styles.listItem}>
      <View style={[styles.itemIcon, { backgroundColor: iconBg }]}>
        <Icon name={iconName} size={18} color={iconColor || palette.darkText} solid={isTrophy} />
      </View>
      <View style={styles.itemDetails}>
        <Text style={styles.itemTitle}>{name}</Text>
        {detail ? <Text style={styles.itemSubtitle}>{String(detail)}</Text> : null}
      </View>
      <Text style={[styles.itemAction, { color: palette.primaryRed }]}>{String(action)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleMenu}>
          <Icon name="bars" size={22} color={palette.darkText} />
        </TouchableOpacity>
        <View style={styles.logo}>
          <Image source={{ uri: 'https://i.ibb.co/68v8z0p/heart-logo.png' }} style={styles.logoImg} />
          <Text style={styles.logoText}>PU Heart Connect</Text>
        </View>
        <TouchableOpacity>
          <RegularIcon name="bell" size={22} color={palette.darkText} onPress={() => router.push('/notifications')}/>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container]}>
        {userProfile && (
            <View style={styles.welcomeCard}>
                <View style={styles.leftContent}>
                    <Text style={styles.welcomeTitle}>Hi {userProfile.firstName || 'User'}!</Text>
                    <Text style={styles.welcomeDetail}>{'Department:\n'}{userProfile.department || 'N/A'}</Text>
                    <Text style={styles.welcomeDetail}>Total Donates: {userProfile.totalDonates || 0} Unites</Text>
                    <Text style={styles.welcomeDetail}>Last Donate:{' '}{userProfile.lastDonated ? new Date(userProfile.lastDonated.seconds * 1000).toLocaleDateString() : 'N/A'}</Text>
                    {isEligible ? (<Text style={styles.eligibilityTextEligible}>You can donate now</Text>) : (<Text style={styles.eligibilityTextWaiting}>Wait for {daysUntilEligible} days</Text>)}
                </View>
                <View style={styles.rightContent}>
                    <View style={styles.classicTag}><Text style={styles.classicTagText}>Classic</Text></View>
                    <View style={styles.bloodGroupBox}><Text style={styles.bloodGroupLabel}>Blood</Text><Text style={styles.bloodGroupValue}>{userProfile.bloodGroup || 'N/A'}</Text></View>
                </View>
                <View style={styles.progressCircleContainer}>
                    <Progress.Circle size={110} progress={progress} color={palette.statsRed} thickness={8} borderWidth={0} unfilledColor="rgba(255, 255, 255, 0.4)" />
                    <View style={styles.faceContainer}>
                        <View style={styles.eyesContainer}><View style={styles.eye} /><View style={styles.eye} /></View>
                        <Text style={styles.faceText}>{isEligible ? 'You Are Eligible' : 'Not Eligible'}</Text>
                        <View style={[styles.mouth, { transform: [{ rotate: isEligible ? '0deg' : '180deg' }] }]} />
                    </View>
                </View>
                
            </View>
            
        )}

        <ImageBackground source={{uri: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?q=80&w=1200'}} style={styles.ctaBanner} imageStyle={{ borderRadius: 12 }}>
            <View style={styles.overlay}><Text style={styles.ctaTitle}>Save Lives, Donate Blood</Text><Text style={styles.ctaSubtitle}>Join Our Genius Mission</Text></View>
        </ImageBackground>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.statsHeader}>PU Hits</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              {/* DYNAMIC: Display total registered students */}
              <Text style={styles.statNumber}>{totalRegistered}+</Text>
              <Text style={styles.statLabel}>Students{'\n'}Registered</Text>
            </View>
            <View style={styles.statItem}>
              {/* DYNAMIC: Display total units donated */}
              <Text style={styles.statNumber}>{totalUnitsDonated}+</Text>
              <Text style={styles.statLabel}>Units of Blood{'\n'}Donated</Text>
            </View>
            <View style={styles.statItem}>
              {/* STATIC: Campaigns organized */}
              <Text style={styles.statNumber}>99+</Text>
              <Text style={styles.statLabel}>Campaigns{'\n'}Organized</Text>
            </View>
          </View>
        </View>

        {/* Recent Donors */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}><Text style={styles.listTitle}>Recent Donors</Text><TouchableOpacity><Text style={styles.viewAll}>View Full List</Text></TouchableOpacity></View>
          {recentDonors.map(donor => (<ListItem key={donor.id} name={donor.donorName || 'Anonymous'} detail={donor.department || 'Unknown Department'} action={donor.bloodGroup} iconName="user" iconBg="#e9ecef" />))}
        </View>
  {/* --- NEW: TESTIMONIALS SECTION --- */}
        
        {/* Top Donors */}
        <View style={styles.listSection}>
          <Text style={styles.listTitle}>Top Donors</Text>
          <View style={styles.tabs}>
            <TouchableOpacity style={[styles.tab, activeTab === 'students' && styles.activeTab]} onPress={() => setActiveTab('students')}><Text style={[styles.tabText, activeTab === 'students' && styles.activeTabText]}>Students</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === 'department' && styles.activeTab]} onPress={() => setActiveTab('department')}><Text style={[styles.tabText, activeTab === 'department' && styles.activeTabText]}>Department</Text></TouchableOpacity>
          </View>
          {activeTab === 'students' ? (topStudentDonors.map(donor => (<ListItem key={donor.uid} name={donor.firstName || 'Anonymous'} detail={donor.department} action={`${donor.totalDonates} Units`} iconName="trophy" iconBg={palette.trophyBg} iconColor={palette.trophyYellow} isTrophy />))) : (topDepartments.map(dept => (<ListItem key={dept.name} name={dept.name} detail={`${dept.donorCount} Donors`} action={`${dept.totalUnits} Units`} iconName="trophy" iconBg={palette.trophyBg} iconColor={palette.trophyYellow} isTrophy />)))}
        </View>
        

        <View style={styles.testimonialSection}>
            <Text style={styles.sectionTitle}>What Our Donors Say</Text>
            <View style={styles.carouselContainer}>
                <TouchableOpacity onPress={scrollToPrev} style={styles.arrowButton} disabled={activeIndex === 0}>
                    <Icon name="chevron-left" size={20} color={activeIndex === 0 ? 'rgba(255,255,255,0.3)' : palette.white} />
                </TouchableOpacity>

                {/* --- NOW, COMMENT OUT ONLY THE FLATLIST --- */}
                
                <FlatList
                    ref={flatListRef}
                    data={testimonials}
                    renderItem={({ item }) => <TestimonialCard item={item} />}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    contentContainerStyle={{
                      paddingHorizontal: CARD_MARGIN, // Add padding to center first and last items
                    }}
                    snapToInterval={CARD_WIDTH + 20} // The magic prop for snapping
                    decelerationRate="fast" // Makes snapping feel better
                />
               

                <TouchableOpacity onPress={scrollToNext} style={styles.arrowButton} disabled={activeIndex >= testimonials.length - 1}>
                    <Icon name="chevron-right" size={20} color={activeIndex >= testimonials.length - 1 ? 'rgba(255,255,255,0.3)' : palette.white} />
                </TouchableOpacity>
            </View>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
      <View style={styles.footerFloating}>
        <TouchableOpacity style={[styles.footerBtn, styles.btnDonate]} onPress={() => router.push('/donate')}><Text style={[styles.footerBtnText, { color: palette.white }]}>Donate</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.footerBtn, styles.btnRequest]} onPress={() => router.push('/request')}><Text style={[styles.footerBtnText, { color: palette.statsRed }]}>Request</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// All your styles remain exactly the same
const styles = StyleSheet.create({
    trackerCard: { backgroundColor: palette.white, borderRadius: 12, padding: 20, marginBottom: 20, elevation: 4, shadowColor: 'rgba(0,0,0,0.1)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', },
    trackerTitle: { fontSize: 18, fontWeight: '600', color: palette.darkText, marginBottom: 4, },
    trackerSubtitle: { fontSize: 14, color: palette.lightText, },
    progressText: { fontSize: 20, fontWeight: '700', color: palette.darkText, },
    safeArea: { flex: 1, backgroundColor: '#EDF0F3' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', },
    welcomeCard: { backgroundColor: '#F7F2FA',marginHorizontal: 15, borderRadius: 16, paddingVertical: 16, paddingLeft: 20, paddingRight: 120, marginBottom: 20, marginTop: 24, alignItems: 'center', flexDirection: 'row', elevation: 4, shadowColor: 'rgba(0,0,0,0.1)', overflow: 'hidden', },
    leftContent: { flex: 1, justifyContent: 'center', },
    rightContent: { justifyContent: 'flex-start', alignItems: 'center', paddingLeft: 12, paddingTop: 13, },
    welcomeTitle: { fontSize: 23, fontWeight: 'bold', color: palette.darkText, marginBottom: 8, },
    welcomeDetail: { fontSize: 12, color: palette.lightText, lineHeight: 20, },
    eligibilityTextEligible: { color: palette.statsRed, fontSize: 14, fontWeight: 'bold', marginTop: 4, paddingVertical: 3, paddingHorizontal: 0, alignSelf: 'flex-start', overflow: 'hidden', },
    eligibilityTextWaiting: { color: palette.lightText, fontSize: 14, fontWeight: '500', marginTop: 16, paddingVertical: 8, },
    classicTag: { backgroundColor: palette.darkGreen, borderRadius: 16, paddingVertical: 1, paddingHorizontal: 5, marginBottom: 10, },
    classicTagText: { color: palette.white, fontWeight: '500', fontSize: 11, },
    bloodGroupBox: { backgroundColor: palette.statsRed, borderRadius: 8, padding: 8, alignItems: 'center', justifyContent: 'center', minWidth: 25, },
    bloodGroupLabel: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 6, fontWeight: '500', },
    bloodGroupValue: { color: palette.white, fontSize: 22, fontWeight: 'bold', },
    progressCircleContainer: { position: 'absolute', right: 15, top: '60%', transform: [{ translateY: -55 }], },
    progressCircleText: { color: palette.statsRed, fontWeight: 'bold', fontSize: 13, textAlign: 'center', lineHeight: 18, },
    faceContainer: { position: 'absolute', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', },
    eyesContainer: { flexDirection: 'row', position: 'absolute', top: 27, },
    eye: { width: 8, height: 8, borderRadius: 6, backgroundColor: palette.statsRed, marginHorizontal: 10, },
    faceText: { color: palette.statsRed, fontWeight: 'bold', fontSize: 10, textAlign: 'center', lineHeight: 11, position: 'absolute', top: 45, },
    mouth: { width: 47, height: 25, borderBottomLeftRadius: 50, borderBottomRightRadius: 50, borderTopWidth: 0, borderWidth: 4, borderColor: palette.statsRed, backgroundColor: 'transparent', position: 'absolute', bottom: 18, },
    header: { position: 'relative', top: 0, left: 0, right: 0, height: HEADER_HEIGHT, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, backgroundColor: '#EDF0F3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, zIndex: 10, elevation: 4, },
    logo: { flexDirection: 'row', alignItems: 'center' },
    logoImg: { width: 26, height: 26, marginRight: 8 },
    logoText: { fontSize: 16, fontWeight: '700', color: palette.statsRed, textTransform: 'uppercase', },
    scrollView: { flex: 1 },
    container: {  paddingBottom: 0 },
    searchBar: { position: 'relative', marginBottom: 20, marginTop: 20 },
    searchInput: { backgroundColor: palette.white, paddingVertical: 12, paddingLeft: 45, paddingRight: 15, borderRadius: 8, fontSize: 14, borderWidth: 1, borderColor: palette.borderLight, elevation: 3, },
    searchIcon: { position: 'absolute', top: 15, left: 18, zIndex: 1 },
    userCard: { backgroundColor: palette.white, borderRadius: 12, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: '#FFE8EB', elevation: 4, },
    userCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', },
    userInfo: { flex: 1 },
    userName: { fontSize: 18, fontWeight: '600', color: palette.darkText },
    userDetails: { fontSize: 12, color: palette.lightText, lineHeight: 20 },
    userAvatarContainer: { alignItems: 'center' },
    classicLabel: { fontSize: 11, fontWeight: '500', color: palette.lightText },
    bloodTypeLarge: { fontSize: 28, fontWeight: '700', color: palette.statsRed, },
    eligibleTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.white, borderWidth: 1, borderColor: '#E4DDEB', borderRadius: 12, padding: 4, marginTop: 10, elevation: 2, },
    eligibleTagText: { fontSize: 11, fontWeight: '500', color: palette.darkText, },
    ctaBanner: { marginHorizontal: 15, marginBottom: 25, borderRadius: 12, elevation: 5 },
    overlay: { backgroundColor: 'rgba(217, 50, 75, 0.85)', borderRadius: 12, padding: 20, },
    ctaTitle: { color: palette.white, fontSize: 20, fontWeight: '700' },
    ctaSubtitle: { color: palette.white, fontSize: 14, fontWeight: '400' },
    statsSection: { marginHorizontal: 15,backgroundColor: palette.statsRed, padding: 20, borderRadius: 12, marginBottom: 25, },
    statsHeader: { color: palette.white, fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 15, },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
    statItem: { alignItems: 'center' },
    statNumber: { fontSize: 20, fontWeight: '700', color: palette.white },
    statLabel: { fontSize: 11, color: palette.white, textAlign: 'center' },
     // --- NEW: Testimonial Section Styles ---
    testimonialSection: {
        backgroundColor: palette.darkGreen,
        paddingVertical: 25,
        marginTop: -15,
        width: '100%',        // Full width
        alignSelf: 'stretch',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: palette.white,
        textAlign: 'center',
        marginBottom: 20,
    },
    carouselContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrowButton: {
        paddingHorizontal: 10,
    },
   testimonialCard: {
        width: CARD_WIDTH,
        backgroundColor: palette.white,
        borderRadius: 15,
        padding: 20,
        marginHorizontal: 8,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },

    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    cardAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: palette.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardHeaderText: {
        flex: 1,
    },
    donorName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: palette.darkText,
    },
    donorDepartment: {
        fontSize: 12,
        color: palette.statsRed,
    },
    testimonialText: {
        fontSize: 14,
        color: palette.lightText,
        lineHeight: 22,
    },
    listSection: { marginHorizontal: 15, backgroundColor: palette.cardBgLavender, padding: 20, borderRadius: 12, marginBottom: 25, },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, },
    listTitle: { fontSize: 18, fontWeight: '600', color: palette.darkText },
    viewAll: { fontSize: 13, color: palette.primaryRed },
    listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.white, padding: 10, borderRadius: 10, marginBottom: 10, elevation: 1, },
    itemIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12, },
    itemDetails: { flex: 1 },
    itemTitle: { fontSize: 14, fontWeight: '600', color: palette.darkText },
    itemSubtitle: { fontSize: 12, color: palette.lightText },
    itemAction: { fontWeight: '600', fontSize: 16 },
    tabs: { flexDirection: 'row', marginBottom: 15, gap: 8 },
    tab: { paddingVertical: 6, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: '#E4DDEB', },
    activeTab: { backgroundColor: palette.statsRed, borderColor: palette.statsRed },
    tabText: { color: palette.darkText, fontSize: 13 },
    activeTabText: { color: palette.white },
    footerFloating: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 15, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', },
    footerBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', marginHorizontal: 8, },
    footerBtnText: { fontSize: 16, fontWeight: '600' },
    btnDonate: { backgroundColor: palette.statsRed },
    btnRequest: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.statsRed, },
});