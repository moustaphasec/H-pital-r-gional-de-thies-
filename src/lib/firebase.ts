import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyA_h9BlH7VHA6jYwgDdmSU5A_vUmQKQsj0",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "hopital-de-thies.firebaseapp.com",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "hopital-de-thies",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "hopital-de-thies.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "930244670612",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "1:930244670612:web:39939291b86c085d027081",
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || "G-W7YKDCVGRL"
};

export const EMAILJS_CONFIG = {
  serviceId: metaEnv.VITE_EMAILJS_SERVICE_ID || "service_hi9vb08",
  templateId: metaEnv.VITE_EMAILJS_TEMPLATE_ID || "template_onkdmd8",
  publicKey: metaEnv.VITE_EMAILJS_PUBLIC_KEY || "kwKiHmvSH_3P6rgNF"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

// Firestore with multi-tab offline persistence built-in
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export function getClinicId(): string {
  try {
    return localStorage.getItem('healthsaas_clinic_id') || 'thies';
  } catch {
    return 'thies';
  }
}

export function buildSlotId(clinicId: string, specialty: string, date: string, timeSlot: string): string {
  const cleanSpec = specialty
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  const cleanTime = timeSlot.replace(/[^0-9]/g, '');
  return `${clinicId}_${cleanSpec}_${date}_${cleanTime}`;
}

export async function reserveBookedSlot(params: {
  clinicId: string;
  specialty: string;
  date: string;
  timeSlot: string;
  appointmentId: string;
}): Promise<void> {
  if (!params.date || !params.timeSlot || !params.specialty) return;
  try {
    const slotId = buildSlotId(params.clinicId, params.specialty, params.date, params.timeSlot);
    await setDoc(doc(db, 'booked_slots', slotId), {
      clinicId: params.clinicId,
      specialty: params.specialty,
      date: params.date,
      timeSlot: params.timeSlot,
      appointmentId: params.appointmentId,
      status: 'Réservé',
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Note: réservation de créneau en mode dégradé/sécurisé:', err);
  }
}

export async function releaseBookedSlot(params: {
  clinicId?: string;
  specialty?: string;
  date?: string;
  timeSlot?: string;
  appointmentId?: string;
}): Promise<void> {
  if (!params.date || !params.timeSlot || !params.specialty) return;
  try {
    const clinic = params.clinicId || getClinicId();
    const slotId = buildSlotId(clinic, params.specialty, params.date, params.timeSlot);
    await setDoc(
      doc(db, 'booked_slots', slotId),
      {
        clinicId: clinic,
        specialty: params.specialty,
        date: params.date,
        timeSlot: params.timeSlot,
        appointmentId: params.appointmentId || '',
        status: 'Annulé',
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Note: libération de créneau en mode dégradé:', err);
  }
}

export async function fetchBookedSlotsForDate(
  clinicId: string,
  specialty: string,
  dateStr: string
): Promise<string[]> {
  const booked: string[] = [];
  try {
    const q = query(
      collection(db, 'booked_slots'),
      where('clinicId', '==', clinicId),
      where('specialty', '==', specialty),
      where('date', '==', dateStr)
    );
    const snap = await getDocs(q);
    snap.forEach(d => {
      const data = d.data();
      if (data.timeSlot && data.status !== 'Annulé') {
        booked.push(data.timeSlot);
      }
    });
  } catch (err) {
    console.warn('Info: lecture des créneaux en mode dégradé/hors-ligne:', err);
  }
  return booked;
}

export function formatWhatsAppUrl(phone: string | undefined, message: string): string | null {
  if (!phone) return null;
  let cleaned = phone.replace(/[\s\-\.\(\)]/g, '');
  cleaned = cleaned.replace(/^\+/, '').replace(/^00/, '');
  if (!/^\d{7,15}$/.test(cleaned)) return null;
  // Normalisation automatique des numéros sénégalais à 9 chiffres (70, 75, 76, 77, 78, 33)
  if (cleaned.length === 9 && /^(70|75|76|77|78|33)/.test(cleaned)) {
    cleaned = '221' + cleaned;
  }
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

export function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
