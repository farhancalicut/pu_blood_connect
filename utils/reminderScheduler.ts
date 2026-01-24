import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { sendDonationEligibilityReminder, sendEventReminder } from './notifications';

// Check for upcoming events and send reminders 1 hour before
export async function checkAndSendEventReminders() {
    try {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        const twoHoursLater = new Date(now.getTime() + 120 * 60 * 1000);

        // Query events happening in the next 1-2 hours
        const eventsQuery = query(
            collection(db, 'events'),
            where('eventDate', '>=', Timestamp.fromDate(oneHourLater)),
            where('eventDate', '<=', Timestamp.fromDate(twoHoursLater)),
            where('status', '==', 'upcoming')
        );

        const eventsSnapshot = await getDocs(eventsQuery);

        for (const eventDoc of eventsSnapshot.docs) {
            const event = eventDoc.data();
            const eventDate = event.eventDate?.toDate();

            if (!eventDate) continue;

            // Check if event is approximately 1 hour away (within 5 minute tolerance)
            const timeDiff = eventDate.getTime() - now.getTime();
            const oneHourInMs = 60 * 60 * 1000;
            const tolerance = 5 * 60 * 1000; // 5 minutes

            if (Math.abs(timeDiff - oneHourInMs) <= tolerance) {
                // Send reminder
                await sendEventReminder(
                    event.title || 'Upcoming Event',
                    event.location || 'TBA',
                    eventDoc.id
                );
            }
        }
    } catch (error) {
        console.error('Error checking event reminders:', error);
    }
}

// Check for users eligible to donate again (60 days after last donation)
export async function checkAndSendEligibilityReminders() {
    try {
        const now = new Date();
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const sixtyOneDaysAgo = new Date(now.getTime() - 61 * 24 * 60 * 60 * 1000);

        // Query users who last donated around 60 days ago
        const usersQuery = query(
            collection(db, 'users'),
            where('lastDonated', '>=', Timestamp.fromDate(sixtyOneDaysAgo)),
            where('lastDonated', '<=', Timestamp.fromDate(sixtyDaysAgo)),
            where('pushToken', '!=', null)
        );

        const usersSnapshot = await getDocs(usersQuery);

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            const lastDonated = userData.lastDonated?.toDate();

            if (!lastDonated || !userData.pushToken) continue;

            // Check if it's been exactly 60 days (within 1 day tolerance)
            const daysSinceLastDonation = Math.floor(
                (now.getTime() - lastDonated.getTime()) / (24 * 60 * 60 * 1000)
            );

            if (daysSinceLastDonation === 60) {
                const userName = userData.firstName || userData.name || 'Donor';
                await sendDonationEligibilityReminder(userData.pushToken, userId, userName);
            }
        }
    } catch (error) {
        console.error('Error checking eligibility reminders:', error);
    }
}

// Main scheduler function to run all reminder checks
export async function runReminderScheduler() {
    await Promise.all([
        checkAndSendEventReminders(),
        checkAndSendEligibilityReminders()
    ]);
}
