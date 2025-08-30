import { Ionicons } from '@expo/vector-icons';
import { differenceInDays } from 'date-fns';
import { useFocusEffect, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import * as Progress from 'react-native-progress';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { db, firebaseApp } from '../firebase';


// --- Type Definitions ---
type UserProfile = { uid: string; lastname?: string; firstName?: string; department?: string; totalDonates?: number; lastDonated?: any; bloodGroup?: string; [key: string]: any; };
type Donation = { id: string; donorName?: string; department?: string; bloodGroup?: string; [key:string]: any; };
type DepartmentStat = { name: string; donorCount: number; totalUnits: number; };
type Testimonial = { id: string; donorName: string; department: string; text: string; rating?: number; createdAt?: any; };
type Event = { id: string; title: string; posterImageUrl: string; eventDate: { toDate: () => Date }; };
type CarouselItem = { type: 'banner'; id: string; } | (Event & { type: 'event' });

const palette = { primaryRed: '#FE465E', statsRed: '#D9324B', darkGreen: '#3A6054', pageBg: '#FFFBFB', cardBgLavender: 'rgba(255, 251, 251, 1)', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#F0F0F0', trophyYellow: '#FFC107', trophyBg: '#FFF2CC', eligibleGreen: '#28a745', };
const { width: screenWidth } = Dimensions.get('window');
const DONATION_ELIGIBILITY_DAYS = 60;
const CARD_WIDTH = screenWidth * 0.8; 
const CARD_MARGIN = (screenWidth - CARD_WIDTH) / 50;
const CARD_MARGIN_HORIZONTAL = 10;
const FULL_CARD_WIDTH = CARD_WIDTH + (CARD_MARGIN_HORIZONTAL * 2);

const BannerCard = () => {
    const router = useRouter();
    return (
        <TouchableOpacity style={styles.carouselItemWrapper} onPress={() => router.push('/events')}>
            <Image
                source={require('../assets/images/save_lives_banner.jpg')}
                style={styles.carouselImage}
            />
        </TouchableOpacity>
    );
};

const EventCarouselCard = ({ item }: { item: Event }) => {
    const router = useRouter();
    return (
        <TouchableOpacity style={styles.carouselItemWrapper} onPress={() => router.push('/events')}>
            <Image source={{ uri: item.posterImageUrl }} style={styles.carouselImage} />
        </TouchableOpacity>
    );
};

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

  const DetailRow = ({ label, value }: { label: string, value: string }) => (
    <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
    </View>
);
export default function DashboardScreen() {
  
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
  const [pastCampaignsCount, setPastCampaignsCount] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const daysPassed = DONATION_ELIGIBILITY_DAYS - daysUntilEligible;
  const loadDashboardData = useCallback(() => {
    const auth = getAuth(firebaseApp);
    const user = auth.currentUser;

    const fetchUserData = async () => { if (!user) return; const docSnap = await getDoc(doc(db, 'users', user.uid)); if (docSnap.exists()) setUserProfile({ uid: user.uid, ...docSnap.data() }); };
    const fetchTopDonors = async () => { const q = query(collection(db, 'users'), orderBy('totalDonates', 'desc'), limit(5)); const snap = await getDocs(q); setTopStudentDonors(snap.docs.map(d => ({ uid: d.id, ...d.data() }))); };
    const fetchRecent = async () => {
            
            const q = query(collection(db, 'donations'), orderBy('date', 'desc'), limit(20));
            const snap = await getDocs(q);
            setRecentDonors(snap.docs.map(d => {
                const data = d.data();
                return { id: d.id, ...data, department: data.department || 'N/A' };
            }));
        };
        
    const fetchAggregateStats = async () => {
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const studentCount = usersSnapshot.size;
      const totalUnits = usersSnapshot.docs.reduce((sum, doc) => sum + (doc.data().totalDonates || 0), 0);
      setTotalRegistered(studentCount);
      setTotalUnitsDonated(totalUnits);

      const eventsQuery = query(collection(db, 'events'));
      const eventsSnapshot = await getDocs(eventsQuery);
      const now = new Date();
      let pastEventsCount = 0;
      eventsSnapshot.forEach(doc => {
          const event = doc.data();
          if (event.eventDate && event.eventDate.toDate() < now) {
              pastEventsCount++;
          }
      });
      setPastCampaignsCount(pastEventsCount);

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

    const fetchUpcomingEvents = async () => {
            const q = query(
                collection(db, 'events'),
                where('eventDate', '>=', new Date()),
                orderBy('eventDate', 'asc'),
                limit(5)
            );
            const snap = await getDocs(q);
            const eventsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Event));
            setUpcomingEvents(eventsData);
        };
    
     Promise.all([
      fetchUserData(), fetchTopDonors(), fetchRecent(),
      fetchAggregateStats(), fetchTestimonials(), fetchUpcomingEvents()
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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

 
  const handleScroll = (event: any) => {
  const scrollPosition = event.nativeEvent.contentOffset.x;
  const index = Math.round(scrollPosition / FULL_CARD_WIDTH);
  setActiveIndex(index);
};
  const scrollToNext = () => { if (activeIndex < testimonials.length - 1) flatListRef.current?.scrollToIndex({ index: activeIndex + 1 }); };
  const scrollToPrev = () => { if (activeIndex > 0) flatListRef.current?.scrollToIndex({ index: activeIndex - 1 }); };

  const carouselData: CarouselItem[] = useMemo(() => {
      const bannerItem: CarouselItem = { type: 'banner', id: 'banner' };
      const eventsWithType = upcomingEvents.map(event => ({ ...event, type: 'event' as const }));
      return [bannerItem, ...eventsWithType];
  }, [upcomingEvents]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.statsRed} />
        <Text style={{ color: palette.darkText }}>Loading Dashboard...</Text>
      </View>
    );
  }



  return (
    <SafeAreaView style={styles.safeArea}>
      

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container]}>
        {userProfile && (
            <View style={styles.welcomeCard}>
                        <View style={styles.welcomeTopRow}>
                            <Text style={styles.welcomeTitle}>Hi {userProfile.firstName || 'User'}!</Text>
                            <View style={styles.bloodTag/* { position: 'absolute', left: '50%', transform: [{ translateX: -15 }], top: 7 }]*/}>
                              <Text style={styles.bloodTagText}>
                                <Text style={{ fontSize: 12 }}>Blood:</Text>
                                <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{userProfile.bloodGroup || 'N/A'}</Text>
                              </Text>
                            </View>
                        </View>

                        <View style={styles.welcomeMainRow}>
                            <View style={styles.welcomeLeftColumn}>
                                <DetailRow label="Dept:" value={userProfile.department || 'N/A'} />
                                <DetailRow label="Total Donate:" value={`${userProfile.totalDonates || 0} Unites`} />
                                <DetailRow label="Last Donate:" value={userProfile.lastDonated ? new Date(userProfile.lastDonated.seconds * 1000).toLocaleDateString() : 'N/A'} />
                                
                                {isEligible ? (
                                    <Text style={styles.eligibilityTextEligible}>You Can Donate Now</Text>
                                ) : (
                                    <Text style={styles.eligibilityTextWaiting}>Wait for {daysUntilEligible} days</Text>
                                )}
                            </View>
                            <View style={styles.welcomeRightColumn}>
                                <View style={styles.progressCircleContainer}>
                                    <Progress.Circle
                                        size={130}
                                        progress={progress}
                                        color={palette.statsRed}
                                        thickness={13}
                                        borderWidth={0}
                                        unfilledColor="rgba(58, 56, 57, 0.2)"
                                    />
                                    <View style={styles.faceContainer}>
                                        <View style={styles.eyesContainer}><View style={styles.eye} /><View style={styles.eye} /></View>
                                        <Text style={styles.faceText}>{isEligible ? 'You Are Eligible' : 'Not Eligible'}</Text>
                                        <View style={[styles.mouth, { transform: [{ rotate: isEligible ? '0deg' : '180deg' }] }]} />
                                    </View>
                                </View>
                                <View style={styles.dayProgressTag}>
                                    <Text style={styles.dayProgressText}>
                                        {isEligible ? `${DONATION_ELIGIBILITY_DAYS}/${DONATION_ELIGIBILITY_DAYS}` : `${daysPassed}/${DONATION_ELIGIBILITY_DAYS}`}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

          <FlatList
          data={carouselData}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          renderItem={({ item }) => {
            if (item.type === 'banner') {
              return <BannerCard />;
            }
            return <EventCarouselCard item={item} />;
          }}
        />

        <ImageBackground 
         source={require('../assets/images/puhits.png')}
      
         imageStyle={{ borderRadius: 12 }} // Makes the image corners rounded
       >
         <View style={styles.statsOverlay}>
                <Text style={styles.statsHeader}>PU HITS</Text>
                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{totalRegistered}+</Text>
                        <Text style={styles.statLabel}>Students{'\n'}Registered</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{totalUnitsDonated}+</Text>
                        <Text style={styles.statLabel}>Units of Blood{'\n'}Donated</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{pastCampaignsCount}+</Text>
                        <Text style={styles.statLabel}>Campaigns{'\n'}Organized</Text>
                    </View>
                </View>
            </View>
            
            </ImageBackground>

        <View style={styles.listSection}>
                    <View style={styles.listHeader}>
                        <Text style={styles.listTitle}>Recent Donors</Text>
                        <TouchableOpacity onPress={() => router.push('/recent-donors')}>
                            <Text style={styles.viewAll}>View Full List</Text>
                        </TouchableOpacity>
                    </View>
                    {recentDonors.slice(0, 5).map(donor => (
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
        
        <View style={styles.listSection}>
                    <View style={styles.listHeader}>
                        <Text style={styles.listTitle}>Top Donors</Text>
                        <TouchableOpacity onPress={() => router.push('/top-donors')}>
                            <Text style={styles.viewAll}>View Full List</Text>
                        </TouchableOpacity>
                    </View>
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
                
                <FlatList
                    ref={flatListRef}
                    data={testimonials}
                    renderItem={({ item }) => <TestimonialCard item={item} />}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    contentContainerStyle={{ paddingHorizontal: CARD_MARGIN }}
                    snapToInterval={FULL_CARD_WIDTH} 
                    decelerationRate="fast"
                />
               

                <TouchableOpacity onPress={scrollToNext} style={styles.arrowButton} disabled={activeIndex >= testimonials.length - 1}>
                    <Icon name="chevron-right" size={20} color={activeIndex >= testimonials.length - 1 ? 'rgba(255,255,255,0.3)' : palette.white} />
                </TouchableOpacity>
            </View>
        </View>
        <View style={styles.footerLinksContainer}>
                    <TouchableOpacity style={styles.footerLinkWrapper} onPress={() => router.push('/privacy-policy')}>
                        <Ionicons name="shield-checkmark-outline" size={14} color={palette.lightText} />
                        <Text style={styles.footerLink}>Privacy Policy</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.footerLinkWrapper} onPress={() => router.push('/terms-and-conditions')}>
                        <Ionicons name="document-text-outline" size={14} color={palette.lightText} />
                        <Text style={styles.footerLink}>Terms</Text>
                    </TouchableOpacity>

                    
                    <TouchableOpacity style={styles.footerLinkWrapper} onPress={() => router.push('/contact-us')}>
                        <Ionicons name="mail-outline" size={14} color={palette.lightText} />
                        <Text style={styles.footerLink}>Contact Us</Text>
                    </TouchableOpacity>
                </View>
      </ScrollView>
      <View style={styles.footerFloating}>
        <TouchableOpacity style={[styles.footerBtn, styles.btnDonate]} onPress={() => router.push('/donate')}><Text style={[styles.footerBtnText, { color: palette.white }]}>Donate</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.footerBtn, styles.btnRequest]} onPress={() => router.push('/request')}><Text style={[styles.footerBtnText, { color: palette.statsRed }]}>Request</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', },

  welcomeCard: {
    backgroundColor: '#FEF8F8',
    borderRadius: 16,
    padding: 16,
    marginLeft: 16,
    marginRight: 16,
    marginBottom: 20,
    marginTop: 20,
    paddingBottom: 23,
    elevation: 4,
    shadowColor: 'rgba(0,0,0,0.1)',
  },
  welcomeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: -5,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: palette.darkText,
    paddingBottom: -1,
    paddingTop: 3,
  },
  bloodTag: {
    backgroundColor: palette.statsRed,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 5,
    marginLeft: 10,
    top: 3,
  },
  bloodTagText: {
    color: palette.white,
    fontWeight: 'bold',
  },
  welcomeMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  welcomeLeftColumn: {
    justifyContent: 'space-around', // Use space-around for better vertical spacing
    flex: 1, // Allow left column to take available space
    marginRight: 0, // Add space between columns
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'baseline', // Aligns text nicely
    marginBottom: -25,
    // marginTop: -20, // Add some vertical spacing
    },
    detailLabel: {
    fontSize: 12,
    color: palette.lightText,
    marginRight: 6, // Add spacing between label and value
    // Remove fixed width for better auto-adjustment
    },
    detailValue: {
    fontSize: 12,
    color: palette.darkText,
    fontWeight: '400',
    flexShrink: 1, // Allow shrinking if needed
    flexGrow: 1,   // Allow growing to fill space
    // Remove fixed width/flex: 1 for better auto adjustment
    },
    eligibilityTextEligible: {
    color: palette.statsRed,
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 0,
    marginBottom: -10,
    },
    eligibilityTextWaiting: {
      color: palette.statsRed,
      fontSize: 14,
      fontWeight: '500',
      marginTop: 8,
    },
    welcomeRightColumn: {
    alignItems: 'center',
    },
    progressCircleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    top: '-0%',
    },
    dayProgressTag: {
    position: 'absolute',
    top: -15,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    },
    dayProgressText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555',
    },
    faceContainer: {
    position: 'absolute',
    width: '100%',
    height: '110%',
    alignItems: 'center',
    justifyContent: 'center',
    },
    eyesContainer: { flexDirection: 'row', position: 'absolute', top: 38, },
    eye: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.statsRed, marginHorizontal: 12, },
    faceText: { color: palette.statsRed, fontWeight: 'bold', fontSize: 12, textAlign: 'center', position: 'absolute', top: 55, },
    mouth: { width: 50, height: 25, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, borderWidth: 4, borderTopWidth: 0, borderColor: palette.statsRed, backgroundColor: 'transparent', position: 'absolute', bottom: 33, },

// header: { position: 'relative', top: Platform.OS === 'android' ? StatusBar.currentHeight : 0,left: 0, right: 0, height: HEADER_HEIGHT,  backgroundColor: '#EDF0F3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, zIndex: 10, elevation: 10, },
    

  // position: 'relative', top: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  // left: 0, 
  // right: 0, 
  // height: HEADER_HEIGHT, 
          // backgroundColor: palette.white,
        // borderBottomWidth: 1,
        // borderBottomColor: palette.borderLight,
          // shadowOffset: { width: 0, height: 11 }, // A positive height moves the shadow down
// header: { flexDirection: 'row', top: Platform.OS === 'android' ? StatusBar.currentHeight : 0, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 15, backgroundColor: palette.white },

logoText: { fontSize: 16, fontWeight: '700', color: palette.statsRed, textTransform: 'uppercase', },
    scrollView: { flex: 1 },
    container: {  paddingBottom: 80 ,},
   carouselItemWrapper: {
    width: screenWidth, // Each item takes the full screen width
    paddingHorizontal: 15,
    paddingVertical: 20,
    paddingTop: 0,
  },
  carouselImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#e0e0e0', // A placeholder color while image loads
  },
  
    statsOverlay: {
       backgroundColor: 'rgba(177, 15, 15, 0.9)', // A semi-transparent version of your red
       padding: 20,
       
   },
    statsHeader: { color: palette.white, fontSize: 18, fontWeight: '800',textDecorationLine: 'underline', textAlign: 'center', marginBottom: 12, },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
    statItem: { alignItems: 'center' },
    statNumber: { fontSize: 20, fontWeight: '700', color: palette.white },
    statLabel: { fontSize: 11, color: palette.white, textAlign: 'center' },
     // --- NEW: Testimonial Section Styles ---
    testimonialSection: {
        backgroundColor: palette.darkGreen,
        paddingVertical: 25,
        marginTop: 15,
        width: '100%',        // Full width
        alignSelf: 'stretch',
        marginBottom: 20,
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
        marginHorizontal: 10,
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
    listSection: { marginHorizontal: 15, backgroundColor: palette.cardBgLavender, padding: 20, borderRadius: 12, marginBottom: 2,marginTop:13, elevation: 2, shadowColor: '#390000ff', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, },
    listTitle: { fontSize: 18, fontWeight: '600', color: palette.darkText },
    viewAll: { fontSize: 13, color: palette.primaryRed },
    listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.white, padding: 10, borderRadius: 10, marginBottom: 10, elevation: 1, },
    itemIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12, },
    itemDetails: { flex: 1 },
    itemTitle: { fontSize: 14, fontWeight: '600', color: palette.darkText },
    itemSubtitle: { fontSize: 12, color: palette.lightText },
    itemAction: { fontWeight: '600', fontSize: 16 },
    tabs: { flexDirection: 'row', marginBottom:15,marginTop:0, gap: 5 },
    tab: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E4DDEB', },
    activeTab: { backgroundColor: palette.statsRed, borderColor: palette.statsRed },
    tabText: { color: palette.darkText, fontSize: 13 },
    activeTabText: { color: palette.white },
    footerFloating: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 15, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', },
    footerBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', marginHorizontal: 8, },
    footerBtnText: { fontSize: 16, fontWeight: '600' },
    btnDonate: { backgroundColor: palette.statsRed },
    btnRequest: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.statsRed, },
    footerLinksContainer: {
       flexDirection: 'row',
        justifyContent: 'space-evenly', // Evenly space the links
        alignItems: 'center',
        paddingVertical: 20,
        marginTop: -20,
        marginBottom: 0,
   },
   footerLinkWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
   },
   footerLink: {
       fontSize: 12,
       color: palette.lightText,
       marginHorizontal: 5,
       marginLeft: 5,
   },
   footerLinkSeparator: {
       fontSize: 12,
       color: palette.borderLight,
   },
});