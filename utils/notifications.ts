import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from '../firebase';

// Send push notification to specific users
export async function sendPushNotification(expoPushTokens: string[], title: string, body: string, data?: any) {
    // Skip push notifications on web (CORS restriction)
    if (Platform.OS === 'web') {
        console.log('Push notifications skipped on web platform');
        return;
    }

    const messages = expoPushTokens
        .filter(token => token && token.startsWith('ExponentPushToken'))
        .map(token => ({
            to: token,
            sound: 'default',
            title: title,
            body: body,
            data: data || {},
            priority: 'high',
            channelId: 'default',
        }));

    if (messages.length === 0) return;

    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error sending push notification:', error);
        throw error;
    }
}

// Get all user push tokens (for broadcasting)
export async function getAllUserPushTokens(): Promise<string[]> {
    try {
        const usersQuery = query(collection(db, 'users'), where('pushToken', '!=', null));
        const snapshot = await getDocs(usersQuery);
        const tokens = snapshot.docs
            .map(doc => doc.data().pushToken)
            .filter((token): token is string => !!token);
        return tokens;
    } catch (error) {
        console.error('Error getting user push tokens:', error);
        return [];
    }
}

// Get push tokens for users with specific blood group
export async function getPushTokensByBloodGroup(bloodGroup: string): Promise<string[]> {
    try {
        const usersQuery = query(
            collection(db, 'users'),
            where('bloodGroup', '==', bloodGroup),
            where('pushToken', '!=', null)
        );
        const snapshot = await getDocs(usersQuery);
        const tokens = snapshot.docs
            .map(doc => doc.data().pushToken)
            .filter((token): token is string => !!token);
        return tokens;
    } catch (error) {
        console.error('Error getting blood group push tokens:', error);
        return [];
    }
}

// Save notification to Firestore (for in-app notification history)
export async function saveNotificationToFirestore(
    recipientId: string | string[] | 'all',
    title: string,
    message: string,
    type: 'blood_request' | 'event' | 'donation' | 'general' | 'event_reminder' | 'eligibility_reminder' | 'nss_status' | 'certificate_ready',
    data?: any
) {
    try {
        // If recipientId is an array of user IDs, save notification for each user
        if (Array.isArray(recipientId)) {
            const promises = recipientId.map(userId => 
                addDoc(collection(db, 'notifications'), {
                    recipientId: userId,
                    title,
                    message,
                    type,
                    data: data || {},
                    read: false,
                    createdAt: serverTimestamp(),
                })
            );
            await Promise.all(promises);
        } else {
            // Single recipient or 'all'
            await addDoc(collection(db, 'notifications'), {
                recipientId,
                title,
                message,
                type,
                data: data || {},
                read: false,
                createdAt: serverTimestamp(),
            });
        }
    } catch (error) {
        console.error('Error saving notification to Firestore:', error);
    }
}

// Send notification to ALL users about a new blood request (not filtered by blood group)
export async function notifyUsersAboutBloodRequest(
    bloodGroup: string,
    patientName: string,
    hospital: string,
    isCritical: boolean
) {
    try {
        // Get ALL user tokens (not filtered by blood group)
        const tokens = await getAllUserPushTokens();
        
        const title = isCritical ? '🚨 URGENT Blood Request!' : '🩸 Blood Request';
        const body = `${bloodGroup} blood needed for ${patientName} at ${hospital}`;

        // Send push notifications to all users
        if (tokens.length > 0) {
            await sendPushNotification(tokens, title, body, { type: 'blood_request' });
        }

        // Save notification to Firestore for all users
        await saveNotificationToFirestore('all', title, body, 'blood_request', {
            bloodGroup,
            patientName,
            hospital,
            isCritical
        });
    } catch (error) {
        console.error('Error notifying users about blood request:', error);
    }
}

// Send notification to all users about a new event
export async function notifyUsersAboutNewEvent(
    eventTitle: string,
    eventDate: string,
    location: string
) {
    try {
        const tokens = await getAllUserPushTokens();
        
        const title = '📅 New Event Posted!';
        const body = `${eventTitle} on ${eventDate} at ${location}`;

        if (tokens.length > 0) {
            await sendPushNotification(tokens, title, body, { type: 'event' });
        }

        // Save notification to Firestore for all users
        await saveNotificationToFirestore('all', title, body, 'event', {
            eventTitle,
            eventDate,
            location
        });
    } catch (error) {
        console.error('Error notifying users about event:', error);
    }
}

// Send notification to specific user about donation acceptance
export async function notifyUserAboutDonationAcceptance(
    userPushToken: string,
    userId: string,
    requesterName: string,
    hospital: string
) {
    try {
        const title = '✅ Donation Request Accepted!';
        const body = `${requesterName} accepted your offer to donate at ${hospital}`;

        await sendPushNotification([userPushToken], title, body, { type: 'donation' });
        
        // Save notification to Firestore
        await saveNotificationToFirestore(userId, title, body, 'donation', {
            requesterName,
            hospital
        });
    } catch (error) {
        console.error('Error notifying user about donation acceptance:', error);
    }
}

// Send event reminder notification (1 hour before event)
export async function sendEventReminder(
    eventTitle: string,
    location: string,
    eventId: string
) {
    try {
        const tokens = await getAllUserPushTokens();
        
        const title = '⏰ Event Starting Soon!';
        const body = `${eventTitle} starts in 1 hour at ${location}`;

        if (tokens.length > 0) {
            await sendPushNotification(tokens, title, body, { 
                type: 'event_reminder', 
                eventId 
            });
        }

        // Save notification to Firestore for all users
        await saveNotificationToFirestore('all', title, body, 'event_reminder', {
            eventTitle,
            location,
            eventId
        });
    } catch (error) {
        console.error('Error sending event reminder:', error);
    }
}

// Send donation eligibility reminder (after 60 days)
export async function sendDonationEligibilityReminder(
    userPushToken: string,
    userId: string,
    userName: string
) {
    try {
        const title = '💉 You\'re Eligible to Donate Again!';
        const body = `Hi ${userName}, it's been 60 days since your last donation. You can donate blood again!`;

        await sendPushNotification([userPushToken], title, body, { 
            type: 'eligibility_reminder' 
        });

        // Save notification to Firestore
        await saveNotificationToFirestore(userId, title, body, 'eligibility_reminder');
    } catch (error) {
        console.error('Error sending eligibility reminder:', error);
    }
}

// Send NSS status approval notification
export async function notifyNSSApproval(
    userPushToken: string,
    userId: string,
    userName: string,
    approved: boolean
) {
    try {
        const title = approved ? '✅ NSS Status Approved!' : '❌ NSS Status Rejected';
        const body = approved 
            ? `Congratulations ${userName}! Your NSS volunteer status has been approved.`
            : `Hi ${userName}, your NSS volunteer verification was not approved. Please contact admin for details.`;

        await sendPushNotification([userPushToken], title, body, { 
            type: 'nss_status',
            approved 
        });

        // Save notification to Firestore
        await saveNotificationToFirestore(userId, title, body, 'nss_status', {
            approved
        });
    } catch (error) {
        console.error('Error sending NSS approval notification:', error);
    }
}

// Send certificate generation notification
export async function notifyCertificateGenerated(
    userPushToken: string,
    userId: string,
    userName: string,
    certificateType: string
) {
    try {
        const title = '🎖️ Certificate Ready!';
        const body = `Hi ${userName}, your ${certificateType} certificate is now available for download!`;

        await sendPushNotification([userPushToken], title, body, { 
            type: 'certificate_ready' 
        });

        // Save notification to Firestore
        await saveNotificationToFirestore(userId, title, body, 'certificate_ready', {
            certificateType
        });
    } catch (error) {
        console.error('Error sending certificate notification:', error);
    }
}
