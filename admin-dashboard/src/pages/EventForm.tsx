// In src/pages/EventForm.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
// import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, /* storage */ } from '../firebase';
import DatePicker from 'react-datepicker';

const styles = {
  container: { width: '100%' },
  title: { fontSize: '28px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b' },
  form: { backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  label: { display: 'block', marginBottom: '8px', fontWeight: '500' as '500', color: '#334155' },
  input: { width: 'calc(100% - 24px)', padding: '12px', marginBottom: '20px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '16px', },
  datePickerWrapper: { marginBottom: '20px', },
  button: { padding: '12px 24px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '500' as '500', cursor: 'pointer', fontSize: '16px' },
};

export default function EventForm() {
  const { eventId } = useParams<{ eventId: string }>(); // Gets the ID from the URL
  const navigate = useNavigate();
  const isEditMode = !!eventId;

  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState<Date | null>(new Date());
  const [posterImage, setPosterImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      const fetchEvent = async () => {
        const docRef = doc(db, 'events', eventId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTitle(data.title);
          setEventDate(data.eventDate.toDate());
        }
      };
      fetchEvent();
    }
  }, [eventId, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !eventDate) {
      alert("Please fill in all fields.");
      return;
    }
    setLoading(true);

    try {
      let posterImageUrl = '';
      if (posterImage) {
        // Upload image to Firebase Storage if a new one is selected
        // const storageRef = ref(storage, `event_posters/${Date.now()}_${posterImage.name}`);
        // await uploadBytes(storageRef, posterImage);
        // posterImageUrl = await getDownloadURL(storageRef);
      }

      const eventData = {
        title,
        eventDate,
        ...(posterImageUrl && { posterImageUrl }), // Only include imageUrl if it exists
      };

      if (isEditMode) {
        // Update existing document
        const docRef = doc(db, 'events', eventId);
        await updateDoc(docRef, eventData);
        alert("Event updated successfully!");
      } else {
        // Create new document
        await addDoc(collection(db, 'events'), { ...eventData, createdAt: serverTimestamp() });
        alert("Event created successfully!");
      }
      navigate('/dashboard/events');
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Failed to save event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{isEditMode ? 'Edit Event' : 'Add New Event'}</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div>
          <label style={styles.label}>Event Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={styles.input} />
        </div>
        <div>
            <label style={styles.label}>Event Date</label>
                <div style={styles.datePickerWrapper}> 
            <DatePicker 
                selected={eventDate} 
                onChange={(date: Date | null) => setEventDate(date)}
                // 👇 2. STYLE the input inside the picker instead 👇
                className="custom-datepicker-input" 
            />
                </div>
        </div>
        <div style={{ marginTop: '20px' }}>
          <label style={styles.label}>Poster Image (Optional)</label>
          <input type="file" onChange={e => e.target.files && setPosterImage(e.target.files[0])} style={{ ...styles.input, border: 'none', padding: '0' }} />
        </div>
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Saving...' : 'Save Event'}
        </button>
      </form>
    </div>
  );
}