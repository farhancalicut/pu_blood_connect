import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { differenceInDays } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
    arrayRemove,
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    updateDoc,
    where,
} from "firebase/firestore";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    ImageBackground,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { db, firebaseApp } from "../firebase";

const { width: screenWidth } = Dimensions.get("window");
const guidelineBaseWidth = 375;
const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

type UserProfile = {
  uid: string;
  lastname?: string;
  firstName?: string;
  department?: string;
  totalDonates?: number;
  lastDonated?: any;
  bloodGroup?: string;
  [key: string]: any;
};
type Donation = {
  id: string;
  donorName?: string;
  department?: string;
  bloodGroup?: string;
  [key: string]: any;
};
type DepartmentStat = { name: string; donorCount: number; totalUnits: number };
type Testimonial = {
  id: string;
  donorName: string;
  department: string;
  text: string;
  rating?: number;
  createdAt?: any;
  profilePicUrl?: string;
};
type Event = {
  id: string;
  title: string;
  eventDate: { toDate: () => Date };
  location?: string;
  description?: string;
  joinedStudents?: string[]; // Array of user IDs who joined the event
  attendedStudents?: string[]; // Array of user IDs who actually attended
  qrCode?: string; // QR code for attendance tracking
  isActive?: boolean;
};
type CarouselItem =
  | { type: "banner"; id: string }
  | (Event & { type: "event" });

const palette = {
  primaryRed: "#FE465E",
  statsRed: "#D9324B",
  darkGreen: "#3A6054",
  pageBg: "#FFFBFB",
  cardBgLavender: "rgba(255, 251, 251, 1)",
  darkText: "#333333",
  lightText: "#8A8A8A",
  white: "#ffffff",
  borderLight: "#F0F0F0",
  trophyYellow: "#FFC107",
  trophyBg: "#FFF2CC",
  eligibleGreen: "#28a745",
};

const DONATION_ELIGIBILITY_DAYS = 60;
const CARD_WIDTH = screenWidth * 0.76;
const CARD_MARGIN = screenWidth * 0;
const CARD_MARGIN_HORIZONTAL = screenWidth * 0.05;
const FULL_CARD_WIDTH = CARD_WIDTH + CARD_MARGIN_HORIZONTAL * 2;

const BannerCard = () => {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.carouselItemWrapper}
      onPress={() => router.push("/events")}
    >
      <Image
        source={require("../assets/images/save_lives_banner.jpg")}
        style={styles.carouselImage}
      />
    </TouchableOpacity>
  );
};

const EventCarouselCard = ({
  item,
  onJoinEvent,
  onLeaveEvent,
  isJoined,
  isLoading,
}: {
  item: Event;
  onJoinEvent: (eventId: string) => void;
  onLeaveEvent: (eventId: string) => void;
  isJoined: boolean;
  isLoading: boolean;
}) => {
  const router = useRouter();
  const eventDate = item.eventDate.toDate();
  // Get today's date at midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Event is upcoming if eventDate is today or in the future
  const eventDay = new Date(eventDate);
  eventDay.setHours(0, 0, 0, 0);
  const isUpcoming = eventDay >= today;
  const scaleAnim = new Animated.Value(1);

  const handleCardPress = () => {
    router.push("/events");
  };

  const handleJoinPress = (e: any) => {
    e.stopPropagation(); // Prevent card press
    if (isJoined) {
      onLeaveEvent(item.id);
    } else {
      onJoinEvent(item.id);
    }
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      style={styles.carouselItemWrapper}
      onPress={handleCardPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.eventCardProfessional,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Gradient Background Overlay */}
        <View style={styles.eventCardGradientOverlay} />

        {/* Event Card with Gradient Background */}
        <LinearGradient
          colors={["#c91a1a0b", "#00122413"]}
          style={styles.eventCardBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Status Badge */}
          <LinearGradient
            colors={
              isUpcoming
                ? [palette.primaryRed, palette.statsRed]
                : [palette.lightText, "#999999"]
            }
            style={styles.eventStatusBadgeProfessional}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.eventStatusTextProfessional}>
              {isUpcoming ? "UPCOMING" : "PAST"}
            </Text>
          </LinearGradient>

          {/* Content Container */}
          <View style={styles.eventCardContentProfessional}>
            <View style={styles.eventCardHeader}>
              <Text style={styles.eventCardTitleProfessional} numberOfLines={2}>
                {item.title}
              </Text>
            </View>

            <View style={styles.eventCardDetailsProfessional}>
              <View style={styles.eventDetailRowProfessional}>
                <View style={styles.eventDetailIconContainer}>
                  <Ionicons
                    name="calendar"
                    size={scale(14)}
                    color={palette.lightText}
                  />
                </View>
                <Text style={styles.eventDetailTextProfessional}>
                  {eventDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>

              <View style={styles.eventDetailRowProfessional}>
                <View style={styles.eventDetailIconContainer}>
                  <Ionicons
                    name="location"
                    size={scale(14)}
                    color={palette.lightText}
                  />
                </View>
                <Text
                  style={styles.eventDetailTextProfessional}
                  numberOfLines={1}
                >
                  {item.location || "Location TBD"}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.eventCardActionsProfessional}>
              {/* View Details Button */}
              <TouchableOpacity
                style={styles.viewDetailsButtonProfessional}
                onPress={handleCardPress}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="information-circle"
                  size={scale(14)}
                  color={palette.lightText}
                />
                <Text style={styles.viewDetailsButtonTextProfessional}>
                  Details
                </Text>
              </TouchableOpacity>

              {/* Join/Leave Button */}
              {isUpcoming && (
                <TouchableOpacity
                  onPress={handleJoinPress}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={
                      isJoined
                        ? [palette.eligibleGreen, "#34ce57"]
                        : [palette.primaryRed, palette.statsRed]
                    }
                    style={styles.joinButtonProfessional}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={palette.white} />
                    ) : (
                      <>
                        <Ionicons
                          name={isJoined ? "checkmark-circle" : "add-circle"}
                          size={scale(14)}
                          color={palette.white}
                        />
                        <Text style={styles.joinButtonTextProfessional}>
                          {isJoined ? "Joined" : "Join"}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const TestimonialCard = ({ item }: { item: Testimonial }) => (
  <View style={styles.testimonialCard}>
    <View style={styles.cardHeader}>
      <View style={styles.cardAvatar}>
        {item.profilePicUrl ? (
          <Image
            source={{ uri: item.profilePicUrl }}
            style={styles.avatarImage}
          />
        ) : (
          <FontAwesome5
            name="user-alt"
            size={scale(16)}
            color={palette.darkText}
          />
        )}
      </View>
      <View style={styles.cardHeaderText}>
        <Text style={styles.donorName}>{String(item.donorName)}</Text>
        <Text style={styles.donorDepartment}>{String(item.department)}</Text>
      </View>
    </View>
    <Text style={styles.testimonialText}>"{String(item.text)}"</Text>
  </View>
);

const ListItem = ({
  name,
  detail,
  action,
  iconName,
  iconBg,
  iconColor,
  isTrophy = false,
}: {
  name: string;
  detail?: string;
  action: React.ReactNode;
  iconName: string;
  iconBg: string;
  iconColor?: string;
  isTrophy?: boolean;
}) => (
  <View style={styles.listItem}>
    <View style={[styles.itemIcon, { backgroundColor: iconBg }]}>
      <FontAwesome5
        name={iconName}
        size={scale(18)}
        color={iconColor || palette.darkText}
        solid={isTrophy}
      />
    </View>
    <View style={styles.itemDetails}>
      <Text style={styles.itemTitle}>{name}</Text>
      {detail ? (
        <Text style={styles.itemSubtitle}>{String(detail)}</Text>
      ) : null}
    </View>
    <Text style={[styles.itemAction, { color: palette.primaryRed }]}>
      {String(action)}
    </Text>
  </View>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

export default function DashboardScreen() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [topStudentDonors, setTopStudentDonors] = useState<UserProfile[]>([]);
  const [recentDonors, setRecentDonors] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"department" | "students">(
    "department",
  );
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
  const [isTestimonialAutoScroll, setIsTestimonialAutoScroll] = useState(true);
  const testimonialAutoScrollRef = useRef<number | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<string[]>([]); // Array of joined event IDs
  const [joiningEvents, setJoiningEvents] = useState<Set<string>>(new Set()); // Loading states
  const lastLoadTimeRef = useRef<number>(0); // Track last data load time
  const daysPassed = DONATION_ELIGIBILITY_DAYS - daysUntilEligible;

  // Auto-scroll for event carousel
  const [carouselActiveIndex, setCarouselActiveIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);
  const scrollTimeout = useRef<number | null>(null);

  const loadDashboardData = useCallback((isInitialLoad = false) => {
    const auth = getAuth(firebaseApp);
    const user = auth.currentUser;

    // Only show loading screen on initial load, use refreshing state for subsequent loads
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    const fetchUserData = async () => {
      if (!user) return;
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists())
        setUserProfile({ uid: user.uid, ...docSnap.data() });
    };
    const fetchTopDonors = async () => {
      const q = query(
        collection(db, "users"),
        orderBy("totalDonates", "desc"),
        limit(5),
      );
      const snap = await getDocs(q);
      setTopStudentDonors(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    };
    const fetchRecent = async () => {
      const q = query(
        collection(db, "donations"),
        orderBy("date", "desc"),
        limit(20),
      );
      const snap = await getDocs(q);
      setRecentDonors(
        snap.docs.map((d) => {
          const data = d.data();
          return { id: d.id, ...data, department: data.department || "N/A" };
        }),
      );
    };

    const fetchAggregateStats = async () => {
      const usersQuery = query(collection(db, "users"));
      const usersSnapshot = await getDocs(usersQuery);
      const studentCount = usersSnapshot.size;
      const totalUnits = usersSnapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().totalDonates || 0),
        0,
      );
      setTotalRegistered(studentCount);
      setTotalUnitsDonated(totalUnits);

      const eventsQuery = query(collection(db, "events"));
      const eventsSnapshot = await getDocs(eventsQuery);
      const now = new Date();
      let pastEventsCount = 0;
      eventsSnapshot.forEach((doc) => {
        const event = doc.data();
        if (event.eventDate && event.eventDate.toDate() < now) {
          pastEventsCount++;
        }
      });
      setPastCampaignsCount(pastEventsCount);

      const deptStats: {
        [key: string]: { donorCount: number; totalUnits: number };
      } = {};
      usersSnapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        const department = userData.department;
        const totalDonates = userData.totalDonates || 0;
        if (department && totalDonates > 0) {
          if (!deptStats[department])
            deptStats[department] = { donorCount: 0, totalUnits: 0 };
          deptStats[department].donorCount += 1;
          deptStats[department].totalUnits += totalDonates;
        }
      });
      const statsArray = Object.keys(deptStats).map((deptName) => ({
        name: deptName,
        donorCount: deptStats[deptName].donorCount,
        totalUnits: deptStats[deptName].totalUnits,
      }));
      statsArray.sort(
        (a, b) => b.donorCount - a.donorCount || b.totalUnits - a.totalUnits,
      );
      setTopDepartments(statsArray);
    };
    const fetchTestimonials = async () => {
      try {
        // Simplified query - get all feedback first, then filter in memory
        const q = query(
          collection(db, "feedback"),
          orderBy("createdAt", "desc"),
          limit(50), // Get more to have better selection after filtering
        );
        const snap = await getDocs(q);

        // Filter for high-rating feedback and map to testimonial format
        const highRatingFeedback = await Promise.all(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((feedback: any) => feedback.rating >= 4) // Filter in memory
            .slice(0, 10) // Take top 10
            .map(async (feedback: any) => {
              // Fetch user profile picture if userId is available
              let profilePicUrl = "";
              if (feedback.userId) {
                try {
                  const userDoc = await getDoc(
                    doc(db, "users", feedback.userId),
                  );
                  if (userDoc.exists()) {
                    const userData = userDoc.data();
                    profilePicUrl = userData.profilePicUrl || "";
                  }
                } catch (error) {
                  console.error("Error fetching user profile:", error);
                }
              }

              return {
                id: feedback.id,
                donorName: feedback.userName || "Anonymous",
                department: feedback.department || "Unknown",
                text: feedback.comment || "No comment provided",
                rating: feedback.rating || 5,
                createdAt: feedback.createdAt,
                profilePicUrl: profilePicUrl,
              } as Testimonial;
            }),
        );

        setTestimonials(highRatingFeedback);
      } catch (error) {
        console.error("Error fetching testimonials:", error);
        // Set empty array on error
        setTestimonials([]);
      }
    };

    const fetchUpcomingEvents = async () => {
      // Get today's date at midnight to include today's events
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const q = query(
        collection(db, "events"),
        where("eventDate", ">=", today),
        orderBy("eventDate", "asc"),
        limit(5),
      );
      const snap = await getDocs(q);
      const eventsData = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Event,
      );
      setUpcomingEvents(eventsData);
    };

    const fetchJoinedEvents = async () => {
      if (!user) return;
      try {
        const eventsQuery = query(
          collection(db, "events"),
          where("joinedStudents", "array-contains", user.uid),
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        const joinedEventIds = eventsSnapshot.docs.map((doc) => doc.id);
        setJoinedEvents(joinedEventIds);
      } catch (error) {
        console.error("Error fetching joined events:", error);
      }
    };

    Promise.all([
      fetchUserData(),
      fetchTopDonors(),
      fetchRecent(),
      fetchAggregateStats(),
      fetchTestimonials(),
      fetchUpcomingEvents(),
      fetchJoinedEvents(),
    ])
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
        lastLoadTimeRef.current = Date.now(); // Update last load time
      });
  }, []);

  // Initial data load when component mounts
  useEffect(() => {
    loadDashboardData(true); // true indicates initial load
  }, [loadDashboardData]);

  useFocusEffect(
    useCallback(() => {
      // Only reload data if this is the very first load or data is very old
      const now = Date.now();
      const lastLoadTime = lastLoadTimeRef.current;

      // Only refresh on focus if:
      // 1. Never loaded before, OR
      // 2. Data is older than 5 minutes (very conservative)
      const shouldRefresh = !lastLoadTime || now - lastLoadTime > 300000;

      if (shouldRefresh) {
        loadDashboardData(false); // false = don't show loading screen, just refresh
      }
    }, [loadDashboardData]),
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

  // Auto-scroll for testimonials
  useEffect(() => {
    // Reset active index when testimonials change
    if (testimonials.length === 0) {
      setActiveIndex(0);
      return;
    }

    // Ensure active index is within bounds
    if (activeIndex >= testimonials.length) {
      setActiveIndex(0);
    }

    if (!isTestimonialAutoScroll || testimonials.length <= 1) return;

    const startAutoScroll = () => {
      testimonialAutoScrollRef.current = setInterval(() => {
        setActiveIndex((prevIndex) => {
          // Safety check
          if (testimonials.length === 0) return 0;

          const nextIndex = (prevIndex + 1) % testimonials.length;

          // Only scroll if FlatList exists and index is valid
          if (
            flatListRef.current &&
            nextIndex >= 0 &&
            nextIndex < testimonials.length
          ) {
            flatListRef.current?.scrollToIndex({
              index: nextIndex,
              animated: true,
            });
          }

          return nextIndex;
        });
      }, 5000); // Change every 5 seconds
    };

    startAutoScroll();

    return () => {
      if (testimonialAutoScrollRef.current) {
        clearInterval(testimonialAutoScrollRef.current);
      }
    };
  }, [testimonials.length, isTestimonialAutoScroll, activeIndex]);

  // Handle user touch - stop auto scroll
  const handleTestimonialTouchStart = () => {
    setIsTestimonialAutoScroll(false);
    if (testimonialAutoScrollRef.current) {
      clearInterval(testimonialAutoScrollRef.current);
    }
  };

  // Resume auto scroll after user stops touching (with delay)
  const handleTestimonialTouchEnd = () => {
    setTimeout(() => {
      setIsTestimonialAutoScroll(true);
    }, 5000); // Resume after 5 seconds of no interaction
  };

  const scrollToNext = () => {
    if (testimonials.length === 0) return; // Safety check

    setIsTestimonialAutoScroll(false); // Stop auto scroll when user manually navigates

    const newIndex =
      activeIndex < testimonials.length - 1 ? activeIndex + 1 : 0;

    if (
      flatListRef.current &&
      newIndex >= 0 &&
      newIndex < testimonials.length
    ) {
      flatListRef.current?.scrollToIndex({
        index: newIndex,
        animated: true,
      });
      setActiveIndex(newIndex);
    }

    setTimeout(() => {
      setIsTestimonialAutoScroll(true);
    }, 5000); // Resume after 5 seconds
  };

  const scrollToPrev = () => {
    if (testimonials.length === 0) return; // Safety check

    setIsTestimonialAutoScroll(false); // Stop auto scroll when user manually navigates

    const newIndex =
      activeIndex > 0 ? activeIndex - 1 : testimonials.length - 1;

    if (
      flatListRef.current &&
      newIndex >= 0 &&
      newIndex < testimonials.length
    ) {
      flatListRef.current?.scrollToIndex({
        index: newIndex,
        animated: true,
      });
      setActiveIndex(newIndex);
    }

    setTimeout(() => {
      setIsTestimonialAutoScroll(true);
    }, 2000); // Resume after 5 seconds
  };

  const carouselData: CarouselItem[] = useMemo(() => {
    const bannerItem: CarouselItem = { type: "banner", id: "banner" };
    const eventsWithType = upcomingEvents.map((event) => ({
      ...event,
      type: "event" as const,
    }));
    return [bannerItem, ...eventsWithType];
  }, [upcomingEvents]);

  // Auto-scroll effect for event carousel
  useEffect(() => {
    if (carouselData.length <= 1) return;

    const autoScrollInterval = setInterval(() => {
      setCarouselActiveIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % carouselData.length;

        // Scroll to next item
        carouselRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });

        return nextIndex;
      });
    }, 4000); // Change every 4 seconds

    return () => {
      clearInterval(autoScrollInterval);
      // Clear any pending scroll timeout
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [carouselData.length]);

  // Handle manual scroll - only update when scroll ends
  const handleCarouselScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / screenWidth);

    // Update immediately when momentum scroll ends (no flickering)
    if (index >= 0 && index < carouselData.length) {
      setCarouselActiveIndex(index);
    }
  };

  // Join/Leave event functions
  const handleJoinEvent = async (eventId: string) => {
    const auth = getAuth(firebaseApp);
    const user = auth.currentUser;
    if (!user) return;

    setJoiningEvents((prev) => new Set(prev).add(eventId));

    try {
      const eventRef = doc(db, "events", eventId);
      await updateDoc(eventRef, {
        joinedStudents: arrayUnion(user.uid),
      });

      setJoinedEvents((prev) => [...prev, eventId]);

      // Update the local events state to reflect the change
      setUpcomingEvents((prev) =>
        prev.map((event) =>
          event.id === eventId
            ? {
                ...event,
                joinedStudents: [...(event.joinedStudents || []), user.uid],
              }
            : event,
        ),
      );
    } catch (error) {
      console.error("Error joining event:", error);
      // TODO: Show error message to user
    } finally {
      setJoiningEvents((prev) => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
    }
  };

  const handleLeaveEvent = async (eventId: string) => {
    const auth = getAuth(firebaseApp);
    const user = auth.currentUser;
    if (!user) return;

    setJoiningEvents((prev) => new Set(prev).add(eventId));

    try {
      const eventRef = doc(db, "events", eventId);
      await updateDoc(eventRef, {
        joinedStudents: arrayRemove(user.uid),
      });

      setJoinedEvents((prev) => prev.filter((id) => id !== eventId));

      // Update the local events state to reflect the change
      setUpcomingEvents((prev) =>
        prev.map((event) =>
          event.id === eventId
            ? {
                ...event,
                joinedStudents: (event.joinedStudents || []).filter(
                  (uid) => uid !== user.uid,
                ),
              }
            : event,
        ),
      );
    } catch (error) {
      console.error("Error leaving event:", error);
      // TODO: Show error message to user
    } finally {
      setJoiningEvents((prev) => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
    }
  };

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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
      >
        {userProfile && (
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeHeadCard}>
              <Image
                source={require("../assets/images/PU_Logo.png")}
                style={styles.headerLogo}
                resizeMode="contain"
              />
              <Text style={styles.headerText}>Welcome to PU</Text>
              <Image
                source={require("../assets/images/logo_dashboard.png")}
                style={styles.headerLogo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.welcomeTopRow}>
              <Text style={styles.welcomeTitle}>
                Hi {userProfile.firstName || "User"}!
              </Text>
              <View style={styles.bloodTag}>
                <Text style={styles.bloodTagText}>
                  <Text style={{ fontSize: 12 }}>Blood:</Text>
                  <Text style={{ fontSize: 12, fontWeight: "bold" }}>
                    {userProfile.bloodGroup || "N/A"}
                  </Text>
                </Text>
              </View>
            </View>

            <View style={styles.welcomeMainRow}>
              <View style={styles.welcomeLeftColumn}>
                <DetailRow
                  label="Dept:"
                  value={userProfile.department || "N/A"}
                />
                <DetailRow
                  label="Total Donate:"
                  value={`${userProfile.totalDonates || 0} Unites`}
                />
                <DetailRow
                  label="Last Donate:"
                  value={
                    userProfile.lastDonated
                      ? new Date(
                          userProfile.lastDonated.seconds * 1000,
                        ).toLocaleDateString()
                      : "N/A"
                  }
                />

                {isEligible ? (
                  <Text style={styles.eligibilityTextEligible}>
                    You Can Donate Now
                  </Text>
                ) : (
                  <Text style={styles.eligibilityTextWaiting}>
                    Wait for {daysUntilEligible} days
                  </Text>
                )}
              </View>
              <View style={styles.welcomeRightColumn}>
                <View style={styles.progressCircleContainer}>
                  {/* Custom Progress Circle */}
                  <View
                    style={{
                      width: 130,
                      height: 130,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Svg height="130" width="130" viewBox="0 0 130 130">
                      <Circle
                        cx="65"
                        cy="65"
                        r="58"
                        stroke="rgba(58, 56, 57, 0.2)"
                        strokeWidth="13"
                        fill="none"
                      />
                      <Circle
                        cx="65"
                        cy="65"
                        r="58"
                        stroke={palette.statsRed}
                        strokeWidth="13"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 58}`}
                        strokeDashoffset={`${2 * Math.PI * 58 * (1 - progress)}`}
                        strokeLinecap="round"
                        transform={`rotate(-90 65 65)`}
                      />
                    </Svg>
                  </View>

                  <View style={styles.faceContainer}>
                    <View style={styles.eyesContainer}>
                      <View style={styles.eye} />
                      <View style={styles.eye} />
                    </View>
                    <Text style={styles.faceText}>
                      {isEligible ? "You Are Eligible" : "Not Eligible"}
                    </Text>
                    <View
                      style={[
                        styles.mouth,
                        {
                          transform: [
                            { rotate: isEligible ? "0deg" : "180deg" },
                          ],
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.dayProgressTag}>
                  <Text style={styles.dayProgressText}>
                    {isEligible
                      ? `${DONATION_ELIGIBILITY_DAYS}/${DONATION_ELIGIBILITY_DAYS}`
                      : `${daysPassed}/${DONATION_ELIGIBILITY_DAYS}`}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View>
          <FlatList
            ref={carouselRef}
            data={carouselData}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            onMomentumScrollEnd={handleCarouselScroll}
            renderItem={({ item }) => {
              if (item.type === "banner") {
                return <BannerCard />;
              }
              return (
                <EventCarouselCard
                  item={item}
                  onJoinEvent={handleJoinEvent}
                  onLeaveEvent={handleLeaveEvent}
                  isJoined={joinedEvents.includes(item.id)}
                  isLoading={joiningEvents.has(item.id)}
                />
              );
            }}
          />

          {/* Carousel Indicators */}
          {carouselData.length > 1 && (
            <View style={styles.carouselIndicators}>
              {carouselData.map((_, index) => (
                <View
                  key={`indicator-${index}`}
                  style={[
                    styles.carouselDot,
                    carouselActiveIndex === index
                      ? styles.carouselDotActive
                      : styles.carouselDotInactive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        <ImageBackground
          source={require("../assets/images/puhits.png")}
          style={styles.statsBackground}
          resizeMode="cover"
        >
          <View style={styles.statsOverlay}>
            <Text style={styles.statsHeader}>PU HITS</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalRegistered}+</Text>
                <Text style={styles.statLabel}>Students{"\n"}Registered</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalUnitsDonated}+</Text>
                <Text style={styles.statLabel}>
                  Units of Blood{"\n"}Donated
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{pastCampaignsCount}+</Text>
                <Text style={styles.statLabel}>Campaigns{"\n"}Organized</Text>
              </View>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Recent Donors</Text>
            <TouchableOpacity onPress={() => router.push("/recent-donors")}>
              <Text style={styles.viewAll}>View Full List</Text>
            </TouchableOpacity>
          </View>
          {recentDonors.slice(0, 3).map((donor) => (
            <ListItem
              key={donor.id}
              name={donor.donorName || "Anonymous"}
              detail={donor.department || "Unknown Department"}
              action={donor.bloodGroup}
              iconName="user"
              iconBg="#e9ecef"
            />
          ))}
        </View>

        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Top Donors</Text>
            <TouchableOpacity onPress={() => router.push("/top-donors")}>
              <Text style={styles.viewAll}>View Full List</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "students" && styles.activeTab]}
              onPress={() => setActiveTab("students")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "students" && styles.activeTabText,
                ]}
              >
                Students
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "department" && styles.activeTab,
              ]}
              onPress={() => setActiveTab("department")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "department" && styles.activeTabText,
                ]}
              >
                Department
              </Text>
            </TouchableOpacity>
          </View>
          {activeTab === "students"
            ? topStudentDonors
                .slice(0, 3)
                .map((donor) => (
                  <ListItem
                    key={donor.uid}
                    name={donor.firstName || "Anonymous"}
                    detail={donor.department}
                    action={`${donor.totalDonates} Units`}
                    iconName="trophy"
                    iconBg={palette.trophyBg}
                    iconColor={palette.trophyYellow}
                    isTrophy
                  />
                ))
            : topDepartments
                .slice(0, 3)
                .map((dept) => (
                  <ListItem
                    key={dept.name}
                    name={dept.name}
                    detail={`${dept.donorCount} Donors`}
                    action={`${dept.totalUnits} Units`}
                    iconName="trophy"
                    iconBg={palette.trophyBg}
                    iconColor={palette.trophyYellow}
                    isTrophy
                  />
                ))}
        </View>

        <View style={styles.testimonialSection}>
          <Text style={styles.sectionTitle}>What Our Donors Say</Text>
          <View style={styles.carouselContainer}>
            <TouchableOpacity onPress={scrollToPrev} style={styles.arrowButton}>
              <FontAwesome5
                name="chevron-left"
                size={20}
                color={palette.white}
              />
            </TouchableOpacity>

            {testimonials.length > 0 ? (
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
                onTouchStart={handleTestimonialTouchStart}
                onTouchEnd={handleTestimonialTouchEnd}
                onMomentumScrollEnd={() => {
                  // When user finishes scrolling manually, stop auto scroll temporarily
                  setIsTestimonialAutoScroll(false);
                  setTimeout(() => {
                    setIsTestimonialAutoScroll(true);
                  }, 5000);
                }}
              />
            ) : (
              <View style={styles.emptyTestimonialContainer}>
                <Text style={styles.emptyTestimonialText}>
                  No testimonials yet. Be the first to share your feedback!
                </Text>
              </View>
            )}

            <TouchableOpacity onPress={scrollToNext} style={styles.arrowButton}>
              <FontAwesome5
                name="chevron-right"
                size={20}
                color={palette.white}
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.footerLinksContainer}>
          <TouchableOpacity
            style={styles.footerLinkWrapper}
            onPress={() => router.push("/privacy-policy")}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={14}
              color={palette.lightText}
            />
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerLinkWrapper}
            onPress={() => router.push("/terms-and-conditions")}
          >
            <Ionicons
              name="document-text-outline"
              size={14}
              color={palette.lightText}
            />
            <Text style={styles.footerLink}>Terms</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerLinkWrapper}
            onPress={() => router.push("/contact-us")}
          >
            <Ionicons name="mail-outline" size={14} color={palette.lightText} />
            <Text style={styles.footerLink}>Contact Us</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <View style={styles.footerFloating}>
        <TouchableOpacity
          style={[styles.footerBtn, styles.btnDonate]}
          onPress={() => router.push("/donate")}
        >
          <Text style={[styles.footerBtnText, { color: palette.white }]}>
            Donate
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerBtn, styles.btnRequest]}
          onPress={() => router.push("/request")}
        >
          <Text style={[styles.footerBtnText, { color: palette.statsRed }]}>
            Request
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F0F2F5" },
  scrollView: { flex: 1 },
  container: { paddingBottom: scale(80) },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F2F5", // Match the page background
  },

  welcomeCard: {
    backgroundColor: "#FEF8F8",
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 15,
    marginTop: 16,
    paddingBottom: 18,
    elevation: 4,
    shadowColor: "rgba(0,0,0,0.1)",
  },
  welcomeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scale(-2),
  },
  welcomeTitle: {
    fontSize: scale(18),
    fontWeight: "bold",
    color: palette.darkText,
    paddingTop: scale(3),
  },
  bloodTag: {
    backgroundColor: palette.statsRed,
    borderRadius: scale(4),
    paddingVertical: scale(2),
    paddingHorizontal: scale(5),
    marginLeft: scale(10),
    top: scale(3),
  },
  bloodTagText: {
    color: palette.white,
    fontWeight: "bold",
    fontSize: scale(10),
  },
  welcomeMainRow: { flexDirection: "row", justifyContent: "space-between" },
  welcomeLeftColumn: {
    justifyContent: "space-around",
    flex: 1,
    marginRight: scale(10),
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: scale(-15),
  },
  detailLabel: {
    fontSize: scale(11),
    color: palette.lightText,
    marginRight: scale(6),
  },
  detailValue: {
    fontSize: scale(12),
    color: palette.darkText,
    fontWeight: "400",
    flexShrink: 1,
  },
  eligibilityTextEligible: {
    color: palette.statsRed,
    fontSize: scale(15),
    fontWeight: "bold",
    marginTop: scale(5),
    marginBottom: scale(-8),
  },
  eligibilityTextWaiting: {
    color: palette.statsRed,
    fontSize: scale(14),
    fontWeight: "500",
    marginTop: scale(8),
  },
  welcomeRightColumn: { alignItems: "center" },
  progressCircleContainer: { justifyContent: "center", alignItems: "center" },
  dayProgressTag: {
    position: "absolute",
    top: scale(-15),
    backgroundColor: "#E0E0E0",
    borderRadius: scale(4),
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
  },
  dayProgressText: { fontSize: scale(11), fontWeight: "bold", color: "#555" },
  faceContainer: {
    position: "absolute",
    width: "100%",
    height: "110%",
    alignItems: "center",
    justifyContent: "center",
  },
  eyesContainer: { flexDirection: "row", position: "absolute", top: scale(38) },
  eye: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: palette.statsRed,
    marginHorizontal: scale(12),
  },
  faceText: {
    color: palette.statsRed,
    fontWeight: "bold",
    fontSize: scale(10),
    textAlign: "center",
    position: "absolute",
    top: scale(55),
  },
  mouth: {
    width: scale(50),
    height: scale(25),
    borderBottomLeftRadius: scale(25),
    borderBottomRightRadius: scale(25),
    borderWidth: scale(4),
    borderTopWidth: 0,
    borderColor: palette.statsRed,
    position: "absolute",
    bottom: scale(33),
  },

  carouselItemWrapper: {
    width: screenWidth,
    paddingHorizontal: scale(15),
    paddingVertical: scale(10),
    paddingTop: 0,
  },
  carouselImage: {
    width: "100%",
    height: scale(160),
    borderRadius: scale(12),
    backgroundColor: "#e0e0e0",
  },

  statsBackground: {
    width: "100%",
    minHeight: scale(200),
    overflow: "hidden",
  },
  statsOverlay: {
    backgroundColor: "rgba(177, 15, 15, 0.9)",
    padding: scale(20),
  },
  statsHeader: {
    color: palette.white,
    fontSize: scale(18),
    fontWeight: "800",
    textDecorationLine: "underline",
    textAlign: "center",
    marginBottom: scale(12),
  },
  statsGrid: { flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: scale(20), fontWeight: "700", color: palette.white },
  statLabel: { fontSize: scale(11), color: palette.white, textAlign: "center" },

  testimonialSection: {
    backgroundColor: palette.darkGreen,
    paddingVertical: scale(25),
    marginTop: scale(15),
    width: "100%",
    alignSelf: "stretch",
    marginBottom: scale(20),
  },
  sectionTitle: {
    fontSize: scale(18),
    fontWeight: "bold",
    color: palette.white,
    textAlign: "center",
    marginBottom: scale(20),
  },
  carouselContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowButton: { paddingHorizontal: scale(10) },
  testimonialCard: {
    width: CARD_WIDTH,
    backgroundColor: palette.white,
    borderRadius: scale(15),
    padding: scale(20),
    marginHorizontal: CARD_MARGIN_HORIZONTAL,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scale(15),
  },
  cardAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: palette.borderLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(12),
  },
  avatarImage: { width: scale(40), height: scale(40), borderRadius: scale(20) },
  cardHeaderText: { flex: 1 },
  donorName: {
    fontSize: scale(15),
    fontWeight: "bold",
    color: palette.darkText,
  },
  donorDepartment: { fontSize: scale(11), color: palette.statsRed },
  testimonialText: {
    fontSize: scale(14),
    color: palette.lightText,
    lineHeight: scale(22),
  },
  emptyTestimonialContainer: {
    width: CARD_WIDTH,
    backgroundColor: palette.white,
    borderRadius: scale(15),
    padding: scale(30),
    marginHorizontal: CARD_MARGIN_HORIZONTAL,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTestimonialText: {
    fontSize: scale(16),
    color: palette.lightText,
    textAlign: "center",
    fontStyle: "italic",
  },

  listSection: {
    marginHorizontal: scale(15),
    backgroundColor: palette.cardBgLavender,
    padding: scale(20),
    borderRadius: scale(12),
    marginVertical: scale(7),
    elevation: 2,
    shadowColor: "#390000ff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: scale(15),
  },
  listTitle: {
    fontSize: scale(18),
    fontWeight: "600",
    color: palette.darkText,
  },
  viewAll: { fontSize: scale(13), color: palette.primaryRed },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.white,
    padding: scale(10),
    borderRadius: scale(10),
    marginBottom: scale(10),
    elevation: 1,
  },
  itemIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(12),
  },
  itemDetails: { flex: 1 },
  itemTitle: {
    fontSize: scale(14),
    fontWeight: "600",
    color: palette.darkText,
  },
  itemSubtitle: { fontSize: scale(12), color: palette.lightText },
  itemAction: { fontWeight: "600", fontSize: scale(16) },

  tabs: { flexDirection: "row", marginBottom: scale(15), gap: scale(5) },
  tab: {
    paddingVertical: scale(3),
    paddingHorizontal: scale(10),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: "#E4DDEB",
  },
  activeTab: {
    backgroundColor: palette.statsRed,
    borderColor: palette.statsRed,
  },
  tabText: { color: palette.darkText, fontSize: scale(13) },
  activeTabText: { color: palette.white },

  footerFloating: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: scale(15),
    paddingBottom: scale(20),
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerBtn: {
    flex: 1,
    padding: scale(10),
    borderRadius: scale(10),
    alignItems: "center",
    marginHorizontal: scale(8),
  },
  footerBtnText: { fontSize: scale(16), fontWeight: "600" },
  btnDonate: { backgroundColor: palette.statsRed },
  btnRequest: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.statsRed,
  },

  footerLinksContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: scale(20),
    marginTop: scale(-20),
    marginBottom: 0,
  },
  footerLinkWrapper: { flexDirection: "row", alignItems: "center" },
  footerLink: {
    fontSize: scale(12),
    color: palette.lightText,
    marginHorizontal: scale(5),
  },

  welcomeHeadCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 10,
    backgroundColor: "#FEF8F8",
    borderBottomWidth: 1,
    borderColor: "#000",
    marginTop: 10,
    paddingBottom: 8,
  },

  headerLogo: {
    width: 40,
    height: 40,
  },

  headerText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },

  stackContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: Platform.OS === "android" ? "hidden" : "visible",
    zIndex: -1,
  },

  shadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
  },

  // Enhanced Event Card Styles
  eventCard: {
    backgroundColor: palette.white,
    borderRadius: scale(15),
    marginHorizontal: scale(5),
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: scale(6),
    overflow: "hidden",
  },

  eventStatusBadge: {
    position: "absolute",
    top: scale(8),
    right: scale(8),
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(12),
  },
  eventStatusText: {
    color: palette.white,
    fontSize: scale(9),
    fontWeight: "bold",
  },
  eventCardContent: {
    padding: scale(15),
  },
  eventCardTitle: {
    fontSize: scale(16),
    fontWeight: "bold",
    color: palette.darkText,
    marginBottom: scale(10),
    lineHeight: scale(20),
  },
  eventCardDetails: {
    marginBottom: scale(12),
    gap: scale(6),
  },
  eventDetailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  eventDetailText: {
    fontSize: scale(12),
    color: palette.lightText,
    marginLeft: scale(6),
    flex: 1,
  },
  eventCardAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: scale(8),
    borderTopWidth: 1,
    borderTopColor: palette.borderLight,
  },
  eventActionText: {
    fontSize: scale(13),
    fontWeight: "600",
    color: palette.primaryRed,
  },

  // Carousel indicators
  carouselIndicators: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: scale(2),
    marginBottom: scale(7),
  },
  carouselDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(10),
    marginHorizontal: scale(4),
  },
  carouselDotActive: {
    backgroundColor: palette.primaryRed,
  },
  carouselDotInactive: {
    backgroundColor: palette.lightText,
  },

  // Join Event Button Styles
  // Event Card Actions Layout
  eventCardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: scale(8),
    minHeight: scale(30),
  },

  // View Details Button
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
  },
  viewDetailsButtonText: {
    fontSize: scale(10),
    fontWeight: "500",
    color: palette.primaryRed,
    marginLeft: scale(3),
  },

  // Join Event Button Styles
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.primaryRed,
    paddingHorizontal: scale(8),
    paddingVertical: scale(6),
    borderRadius: scale(15),
    flex: 1,
    minWidth: scale(80),
    maxWidth: scale(110),
    justifyContent: "center",
  },
  joinedButton: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.primaryRed,
  },
  joinButtonText: {
    fontSize: scale(9),
    fontWeight: "600",
    color: palette.white,
    marginLeft: scale(2),
    textAlign: "center",
    flexShrink: 1,
  },
  joinedButtonText: {
    color: palette.primaryRed,
  },

  // Professional Event Card Styles
  eventCardProfessional: {
    backgroundColor: palette.white,
    borderRadius: scale(20),
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: scale(12),
    marginHorizontal: scale(8),
  },

  eventCardGradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: "rgba(254, 70, 94, 0.1)",
    zIndex: 1,
  },

  eventCardBackground: {
    width: "100%",
    height: scale(160),
    justifyContent: "flex-end",
  },

  eventCardDarkOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: scale(20),
  },

  eventStatusBadgeProfessional: {
    position: "absolute",
    top: scale(12),
    right: scale(12),
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(15),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },

  eventStatusTextProfessional: {
    color: palette.white,
    fontSize: scale(9),
    fontWeight: "bold",
    letterSpacing: 0.5,
  },

  eventCardContentProfessional: {
    padding: scale(15),
    paddingTop: scale(10),
    zIndex: 2,
  },

  eventCardHeader: {
    marginBottom: scale(8),
  },

  eventCardTitleProfessional: {
    fontSize: scale(16),
    fontWeight: "bold",
    color: palette.darkText,
    lineHeight: scale(18),
  },

  eventCardDetailsProfessional: {
    marginBottom: scale(10),
    gap: scale(4),
  },

  eventDetailRowProfessional: {
    flexDirection: "row",
    alignItems: "center",
  },

  eventDetailIconContainer: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(8),
  },

  eventDetailTextProfessional: {
    fontSize: scale(12),
    color: palette.lightText,
    fontWeight: "500",
    flex: 1,
  },

  eventCardActionsProfessional: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  viewDetailsButtonProfessional: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },

  viewDetailsButtonTextProfessional: {
    fontSize: scale(10),
    fontWeight: "600",
    color: palette.lightText,
    marginLeft: scale(4),
  },

  joinButtonProfessional: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(18),
    minWidth: scale(70),
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },

  joinButtonTextProfessional: {
    fontSize: scale(10),
    fontWeight: "600",
    color: palette.white,
    marginLeft: scale(4),
  },
});
