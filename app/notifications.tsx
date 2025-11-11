import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, or, orderBy, query, where, writeBatch } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../firebase';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375; 

const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7' };

type Notification = {
    id: string;
    title: string;
    message: string;
    type: 'blood_request' | 'event' | 'donation' | 'general' | 'event_reminder' | 'eligibility_reminder' | 'nss_status' | 'certificate_ready';
    read: boolean;
    createdAt: { toDate: () => Date } | Date;
    data?: any;
};

const getNotificationIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
        case 'blood_request': return 'water';
        case 'event': return 'calendar';
        case 'event_reminder': return 'alarm';
        case 'donation': return 'checkmark-circle';
        case 'eligibility_reminder': return 'time';
        case 'nss_status': return 'ribbon';
        case 'certificate_ready': return 'document-text';
        default: return 'notifications';
    }
};

const getNotificationColor = (type: string): string => {
    switch (type) {
        case 'blood_request': return '#9B0000';
        case 'event': return '#2196F3';
        case 'event_reminder': return '#FF9800';
        case 'donation': return '#4CAF50';
        case 'eligibility_reminder': return '#9C27B0';
        case 'nss_status': return '#FF5722';
        case 'certificate_ready': return '#009688';
        default: return '#666666';
    }
};

const NotificationItem = ({ item, onPress }: { item: Notification; onPress?: () => void }) => {
    const iconName = getNotificationIcon(item.type);
    const iconColor = getNotificationColor(item.type);
    const createdAt = item.createdAt instanceof Date ? item.createdAt : item.createdAt.toDate();
    
    return (
        <TouchableOpacity 
            style={[styles.itemContainer, !item.read && styles.unreadItem]} 
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
                <Ionicons name={iconName} size={scale(24)} color={iconColor} />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.titleText}>{item.title}</Text>
                <Text style={styles.messageText} numberOfLines={2}>{item.message}</Text>
                <Text style={styles.timestamp}>
                    {createdAt.toLocaleDateString()} at {createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
    );
};

export default function NotificationsScreen() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const auth = getAuth();
    const user = auth.currentUser;

    const fetchNotifications = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            // Query for notifications where recipientId is either the user's ID or 'all'
            const q = query(
                collection(db, 'notifications'),
                or(
                    where('recipientId', '==', user.uid),
                    where('recipientId', '==', 'all')
                ),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            } as Notification));
            setNotifications(data);
            
            // Mark all unread notifications as read
            const unreadNotifications = querySnapshot.docs.filter(doc => !doc.data().read);
            if (unreadNotifications.length > 0) {
                const batch = writeBatch(db);
                unreadNotifications.forEach(notificationDoc => {
                    batch.update(notificationDoc.ref, { read: true });
                });
                await batch.commit();
                console.log(`Marked ${unreadNotifications.length} notifications as read`);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useFocusEffect(useCallback(() => { fetchNotifications(); }, [fetchNotifications]));

    const handleNotificationPress = (notification: Notification) => {
        // Navigate based on notification type
        switch (notification.type) {
            case 'blood_request':
                router.push('/donate');
                break;
            case 'event':
            case 'event_reminder':
                router.push('/events');
                break;
            case 'donation':
                router.push('/History');
                break;
            case 'certificate_ready':
                router.push('/certificate');
                break;
            case 'nss_status':
                router.push('/profile');
                break;
            default:
                // Just dismiss for general notifications
                break;
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <SafeAreaView style={styles.safeArea}>
            {isLoading ? (
                <ActivityIndicator style={{ flex: 1 }} size="large" color={palette.primaryRed} />
            ) : (
                <>
                    {unreadCount > 0 && (
                        <View style={styles.headerBanner}>
                            <Ionicons name="notifications" size={scale(20)} color={palette.white} />
                            <Text style={styles.headerText}>
                                You have {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
                            </Text>
                        </View>
                    )}
                    <FlatList
                        data={notifications}
                        renderItem={({ item }) => (
                            <NotificationItem 
                                item={item} 
                                onPress={() => handleNotificationPress(item)}
                            />
                        )}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContainer}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="notifications-off-outline" size={scale(60)} color={palette.lightText} />
                                <Text style={styles.emptyText}>No notifications yet</Text>
                                <Text style={styles.emptySubtext}>We'll notify you when something important happens</Text>
                            </View>
                        }
                    />
                </>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: palette.pageBg,
    },
    headerBanner: {
        backgroundColor: palette.primaryRed,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: scale(12),
        gap: scale(8),
    },
    headerText: {
        color: palette.white,
        fontSize: scale(14),
        fontWeight: '600',
    },
    listContainer: {
        padding: scale(15),
        flexGrow: 1,
    },
    itemContainer: {
        flexDirection: 'row',
        backgroundColor: palette.white,
        padding: scale(15),
        borderRadius: scale(12),
        marginBottom: scale(12),
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: palette.borderLight,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    unreadItem: {
        borderLeftWidth: scale(4),
        borderLeftColor: palette.primaryRed,
        backgroundColor: '#FFF8F8',
    },
    iconContainer: {
        width: scale(48),
        height: scale(48),
        borderRadius: scale(24),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: scale(12),
    },
    textContainer: {
        flex: 1,
        marginRight: scale(8),
    },
    titleText: {
        fontSize: scale(16),
        fontWeight: '700',
        color: palette.darkText,
        marginBottom: scale(4),
    },
    messageText: {
        fontSize: scale(14),
        color: palette.darkText,
        lineHeight: scale(20),
        marginBottom: scale(6),
    },
    timestamp: {
        fontSize: scale(12),
        color: palette.lightText,
    },
    unreadDot: {
        width: scale(10),
        height: scale(10),
        borderRadius: scale(5),
        backgroundColor: palette.primaryRed,
        marginTop: scale(4),
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: scale(100),
    },
    emptyText: {
        textAlign: 'center',
        marginTop: scale(20),
        color: palette.darkText,
        fontSize: scale(18),
        fontWeight: '600',
    },
    emptySubtext: {
        textAlign: 'center',
        marginTop: scale(8),
        color: palette.lightText,
        fontSize: scale(14),
    },
});