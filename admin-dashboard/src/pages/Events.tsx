// In src/pages/Events.tsx

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';

// Define a type for our event data
type Event = {
  id: string;
  title: string;
  eventDate: {
    toDate: () => Date;
  };
};

// Simple CSS-in-JS for styling
const styles = {
  container: { width: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { fontSize: '28px', fontWeight: 'bold', color: '#1e293b' },
  addButton: { padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', textDecoration: 'none', borderRadius: '6px', fontWeight: '500' as '500' },
  table: { width: '100%', borderCollapse: 'collapse' as 'collapse' },
  th: { borderBottom: '2px solid #ddd', padding: '12px', textAlign: 'left' as 'left', backgroundColor: '#f8f8f8', color: '#334155', fontWeight: '600' as '600' },
  td: { borderBottom: '1px solid #ddd', padding: '12px', color: '#334155' },
  actionsCell: { display: 'flex', gap: '10px' },
  editButton: { color: '#007bff', cursor: 'pointer', fontWeight: '500' as '500' },
  deleteButton: { color: '#dc3545', cursor: 'pointer', fontWeight: '500' as '500' },
};

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchEvents = useCallback(async () => {
    try {
      const q = query(collection(db, 'events'), orderBy('eventDate', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Event[];
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleEdit = (eventId: string) => {
    // We will navigate to an "edit" page, which we can build later
    console.log("Editing event:", eventId);
    navigate(`/dashboard/events/edit/${eventId}`);
  };

  const handleDelete = async (eventId: string) => {
    // Ask for confirmation before deleting
    if (window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, 'events', eventId));
        alert("Event deleted successfully!");
        // Refresh the list of events
        fetchEvents();
      } catch (error) {
        console.error("Error deleting event:", error);
        alert("Failed to delete event.");
      }
    }
  };

  if (loading) {
    return <div>Loading events...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Manage Events</h1>
        <Link to="/dashboard/events/new" style={styles.addButton}>+ Add New Event</Link>
      </div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Event Title</th>
            <th style={styles.th}>Event Date</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map(event => (
            <tr key={event.id}>
              <td style={styles.td}>{event.title}</td>
              <td style={styles.td}>{event.eventDate.toDate().toLocaleDateString()}</td>
              <td style={styles.td}>
                <div style={styles.actionsCell}>
                  <span style={styles.editButton} onClick={() => handleEdit(event.id)}>Edit</span>
                  <span style={styles.deleteButton} onClick={() => handleDelete(event.id)}>Delete</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}