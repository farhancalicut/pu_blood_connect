import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { getAuth, signOut } from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
} from "firebase/firestore";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { db } from "../firebase";
import { BloodRequest, HospitalUser } from "../types/env";

const { width: screenWidth } = Dimensions.get("window");
const guidelineBaseWidth = 375;
const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = {
  primaryRed: "#9B0000",
  darkText: "#333333",
  lightText: "#8A8A8A",
  white: "#ffffff",
  borderLight: "#EAEAEA",
  pageBg: "#F7F7F7",
  success: "#34C759",
  warning: "#FF9500",
  critical: "#DC3545",
};

export default function HospitalDashboardScreen() {
  const router = useRouter();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [hospitalProfile, setHospitalProfile] = useState<HospitalUser | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    activeRequests: 0,
    totalRequests: 0,
    todayRequests: 0,
    acceptedDonors: 0,
  });
  const [recentRequests, setRecentRequests] = useState<BloodRequest[]>([]);

  const fetchHospitalData = useCallback(async () => {
    if (!currentUser) {
      router.replace("/login");
      return;
    }

    setIsLoading(true);
    try {
      // Fetch hospital profile directly by UID
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        Alert.alert("Error", "Hospital profile not found", [
          {
            text: "OK",
            onPress: () => {
              signOut(auth);
              router.replace("/login");
            },
          },
        ]);
        return;
      }

      const hospitalData = userDoc.data() as HospitalUser;

      // Verify this is actually a hospital account
      if (hospitalData.role !== "hospital") {
        Alert.alert("Error", "Unauthorized access", [
          {
            text: "OK",
            onPress: () => {
              signOut(auth);
              router.replace("/login");
            },
          },
        ]);
        return;
      }

      setHospitalProfile(hospitalData);

      // Fetch blood requests
      const requestsQuery = query(
        collection(db, "requests"),
        where("hospitalId", "==", currentUser.uid),
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const requests = requestsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as BloodRequest[];

      // Calculate stats
      const activeRequests = requests.filter(
        (r) => r.status === "active",
      ).length;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayRequests = requests.filter((r) => {
        const createdAt = r.createdAt?.toDate?.() || new Date(r.createdAt);
        return createdAt >= today;
      }).length;
      const acceptedDonors = requests.reduce(
        (sum, r) => sum + (r.acceptedDonors?.length || 0),
        0,
      );

      setStats({
        activeRequests,
        totalRequests: requests.length,
        todayRequests,
        acceptedDonors,
      });

      // Get 3 most recent requests
      const sorted = requests.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      setRecentRequests(sorted.slice(0, 3));
    } catch (error) {
      console.error("Error fetching hospital data:", error);
      Alert.alert("Error", "Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, router]);

  useFocusEffect(
    useCallback(() => {
      fetchHospitalData();
    }, [fetchHospitalData]),
  );

  const handleLogout = () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to log out?");
      if (confirmed) {
        try {
          signOut(auth);
          window.location.href = "/login";
        } catch (error) {
          console.error("Logout error:", error);
        }
      }
    } else {
      Alert.alert("Log Out", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: () => {
            signOut(auth);
            router.replace("/login");
          },
        },
      ]);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return palette.critical;
      case "urgent":
        return palette.warning;
      default:
        return palette.success;
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "alert-circle";
      case "urgent":
        return "warning";
      default:
        return "information-circle";
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primaryRed} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.hospitalIcon}>
              <Ionicons name="business" size={28} color={palette.primaryRed} />
            </View>
            <View>
              <Text style={styles.welcomeText}>Welcome</Text>
              <Text style={styles.hospitalName}>
                {hospitalProfile?.hospitalName}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons
              name="log-out-outline"
              size={24}
              color={palette.primaryRed}
            />
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: "#4CAF5015" },
                ]}
              >
                <Ionicons name="pulse" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.statValue}>{stats.activeRequests}</Text>
              <Text style={styles.statLabel}>Active Requests</Text>
            </View>

            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: "#2196F315" },
                ]}
              >
                <Ionicons name="document-text" size={24} color="#2196F3" />
              </View>
              <Text style={styles.statValue}>{stats.totalRequests}</Text>
              <Text style={styles.statLabel}>Total Requests</Text>
            </View>

            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: "#FF980015" },
                ]}
              >
                <Ionicons name="today" size={24} color="#FF9800" />
              </View>
              <Text style={styles.statValue}>{stats.todayRequests}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>

            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: "#E91E6315" },
                ]}
              >
                <Ionicons name="people" size={24} color="#E91E63" />
              </View>
              <Text style={styles.statValue}>{stats.acceptedDonors}</Text>
              <Text style={styles.statLabel}>Donors</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={() => router.push("/hospital-add-request")}
          >
            <View style={styles.actionButtonContent}>
              <View style={styles.actionIconCircle}>
                <Ionicons name="add-circle" size={28} color={palette.white} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionButtonTitle}>New Blood Request</Text>
                <Text style={styles.actionButtonSubtitle}>
                  Create a new blood donation request
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={palette.white}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={() => router.push("/hospital-my-requests")}
          >
            <View style={styles.actionButtonContent}>
              <View
                style={[
                  styles.actionIconCircle,
                  { backgroundColor: palette.primaryRed },
                ]}
              >
                <Ionicons name="list" size={24} color={palette.white} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text
                  style={[
                    styles.actionButtonTitle,
                    { color: palette.darkText },
                  ]}
                >
                  My Requests
                </Text>
                <Text
                  style={[
                    styles.actionButtonSubtitle,
                    { color: palette.lightText },
                  ]}
                >
                  View and manage your requests
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={palette.lightText}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Recent Requests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Requests</Text>
            <TouchableOpacity
              onPress={() => router.push("/hospital-my-requests")}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="document-outline"
                size={48}
                color={palette.lightText}
              />
              <Text style={styles.emptyText}>No requests yet</Text>
              <Text style={styles.emptySubtext}>
                Create your first blood request
              </Text>
            </View>
          ) : (
            recentRequests.map((request) => (
              <TouchableOpacity
                key={request.id}
                style={styles.requestCard}
                onPress={() =>
                  router.push(`/hospital-request-details?id=${request.id}`)
                }
              >
                <View style={styles.requestHeader}>
                  <View
                    style={[
                      styles.bloodGroupBadge,
                      {
                        backgroundColor:
                          getUrgencyColor(request.urgency) + "15",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bloodGroupText,
                        { color: getUrgencyColor(request.urgency) },
                      ]}
                    >
                      {request.bloodGroup}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.urgencyBadge,
                      {
                        backgroundColor:
                          getUrgencyColor(request.urgency) + "15",
                      },
                    ]}
                  >
                    <Ionicons
                      name={getUrgencyIcon(request.urgency)}
                      size={14}
                      color={getUrgencyColor(request.urgency)}
                    />
                    <Text
                      style={[
                        styles.urgencyText,
                        { color: getUrgencyColor(request.urgency) },
                      ]}
                    >
                      {request.urgency.charAt(0).toUpperCase() +
                        request.urgency.slice(1)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.patientName}>{request.patientName}</Text>
                <Text style={styles.requestDetails}>
                  {request.unitsNeeded}{" "}
                  {request.unitsNeeded === 1 ? "unit" : "units"} needed
                </Text>

                <View style={styles.requestFooter}>
                  <View style={styles.donorsInfo}>
                    <Ionicons name="people" size={16} color={palette.success} />
                    <Text style={styles.donorsText}>
                      {request.acceptedDonors?.length || 0} donor
                      {(request.acceptedDonors?.length || 0) !== 1 ? "s" : ""}{" "}
                      accepted
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          request.status === "active"
                            ? palette.success + "15"
                            : palette.lightText + "15",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            request.status === "active"
                              ? palette.success
                              : palette.lightText,
                        },
                      ]}
                    >
                      {request.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.pageBg,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: scale(10),
    fontSize: scale(16),
    color: palette.lightText,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: scale(20),
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  hospitalIcon: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: palette.primaryRed + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(12),
  },
  welcomeText: {
    fontSize: scale(14),
    color: palette.lightText,
    marginBottom: scale(2),
  },
  hospitalName: {
    fontSize: scale(18),
    fontWeight: "bold",
    color: palette.darkText,
    flexShrink: 1,
  },
  logoutButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: palette.primaryRed + "10",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: scale(8),
  },
  statsContainer: {
    paddingHorizontal: scale(20),
    paddingTop: scale(20),
    backgroundColor: palette.pageBg,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    backgroundColor: palette.white,
    borderRadius: scale(12),
    padding: scale(16),
    alignItems: "center",
    marginBottom: scale(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  statIconContainer: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: scale(10),
  },
  statValue: {
    fontSize: scale(28),
    fontWeight: "bold",
    color: palette.darkText,
    marginBottom: scale(2),
  },
  statLabel: {
    fontSize: scale(13),
    color: palette.lightText,
    textAlign: "center",
  },
  section: {
    paddingHorizontal: scale(20),
    marginBottom: scale(20),
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scale(16),
  },
  sectionTitle: {
    fontSize: scale(20),
    fontWeight: "bold",
    color: palette.darkText,
  },
  seeAllText: {
    fontSize: scale(14),
    color: palette.primaryRed,
    fontWeight: "600",
  },
  primaryActionButton: {
    backgroundColor: palette.primaryRed,
    borderRadius: scale(14),
    padding: scale(13),
    marginBottom: scale(12),
    marginTop: scale(12),
    shadowColor: palette.primaryRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  secondaryActionButton: {
    backgroundColor: palette.white,
    borderRadius: scale(14),
    padding: scale(13),
    borderWidth: 1.5,
    borderColor: palette.borderLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  actionButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionIconCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(25),
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(14),
  },
  actionTextContainer: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: scale(17),
    fontWeight: "700",
    color: palette.white,
    marginBottom: scale(4),
  },
  actionButtonSubtitle: {
    fontSize: scale(10),
    color: "rgba(255,255,255,0.8)",
  },
  emptyContainer: {
    backgroundColor: palette.white,
    borderRadius: scale(12),
    padding: scale(40),
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.borderLight,
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: scale(16),
    fontWeight: "600",
    color: palette.darkText,
    marginTop: scale(12),
  },
  emptySubtext: {
    fontSize: scale(14),
    color: palette.lightText,
    marginTop: scale(6),
  },
  requestCard: {
    backgroundColor: palette.white,
    borderRadius: scale(14),
    padding: scale(18),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: palette.borderLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: scale(8),
    marginBottom: scale(12),
  },
  bloodGroupBadge: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(14),
  },
  bloodGroupText: {
    fontSize: scale(15),
    fontWeight: "bold",
  },
  urgencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(5),
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(14),
  },
  urgencyText: {
    fontSize: scale(12),
    fontWeight: "700",
    textTransform: "uppercase",
  },
  patientName: {
    fontSize: scale(17),
    fontWeight: "700",
    color: palette.darkText,
    marginBottom: scale(6),
  },
  requestDetails: {
    fontSize: scale(14),
    color: palette.lightText,
    marginBottom: scale(14),
  },
  requestFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: scale(12),
    borderTopWidth: 1,
    borderTopColor: palette.borderLight,
  },
  donorsInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
  },
  donorsText: {
    fontSize: scale(14),
    color: palette.success,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(6),
    borderRadius: scale(10),
  },
  statusText: {
    fontSize: scale(12),
    fontWeight: "700",
    textTransform: "capitalize",
  },
});
