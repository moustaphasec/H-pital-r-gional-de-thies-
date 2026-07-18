import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

// Initialize Firebase (using env vars injected by Vite)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

function PatientPortal() {
  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchAppointments(currentUser.email);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchAppointments = async (email: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, 'appointments'), where('email', '==', email));
      const snapshot = await getDocs(q);
      const appts: any[] = [];
      snapshot.forEach(doc => {
        appts.push({ id: doc.id, ...doc.data() });
      });
      // Sort by date descending
      appts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAppointments(appts);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
      alert('Erreur lors de la connexion. Veuillez réessayer.');
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const handleCancel = async (id: string) => {
    if (confirm('Voulez-vous vraiment annuler ce rendez-vous ?')) {
      try {
        await updateDoc(doc(db, 'appointments', id), { status: 'Annulé' });
        // Refresh list
        if (user) fetchAppointments(user.email);
      } catch (error) {
        console.error('Cancel failed:', error);
        alert('Erreur lors de l\'annulation.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200 dark:border-slate-700">
          <div className="flex justify-center mb-6">
             <i className="fas fa-user-circle text-6xl text-blue-600"></i>
          </div>
          <h1 className="text-2xl font-bold font-outfit mb-2">Espace Patient</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">Connectez-vous pour retrouver vos rendez-vous médicaux.</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition duration-200 flex items-center justify-center gap-3"
          >
            <i className="fab fa-google"></i> Continuer avec Google
          </button>
          <div className="mt-6 text-sm text-slate-500">
             <a href="/" className="hover:text-blue-600 underline">Retour à l'accueil</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-50">
      <nav className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <a href="/" className="text-xl font-bold font-outfit text-blue-600 flex items-center gap-2">
                <i className="fas fa-hospital"></i> Hôpital de Thiès
              </a>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <img src={user.photoURL || 'https://via.placeholder.com/150'} alt="Avatar" className="w-8 h-8 rounded-full" />
                <span className="font-medium">{user.displayName}</span>
              </div>
              <button onClick={handleLogout} className="text-slate-500 hover:text-red-500 transition">
                <i className="fas fa-sign-out-alt text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold font-outfit">Mes Rendez-vous</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Gérez vos consultations à venir et passées.</p>
          </div>
          <a href="/appointment.html" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-xl shadow-lg shadow-blue-500/30 transition flex items-center gap-2">
            <i className="fas fa-plus"></i> Nouveau RDV
          </a>
        </div>

        {appointments.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
            <i className="fas fa-calendar-times text-6xl text-slate-300 dark:text-slate-600 mb-4"></i>
            <h3 className="text-xl font-semibold mb-2">Aucun rendez-vous trouvé</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Vous n'avez pas encore pris de rendez-vous avec cette adresse e-mail.</p>
            <a href="/appointment.html" className="text-blue-600 hover:underline font-medium">Prendre un rendez-vous maintenant</a>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {appointments.map(apt => (
              <div key={apt.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {apt.specialty}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                    apt.status === 'Confirmé' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                    apt.status === 'Annulé' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                    apt.status === 'Terminé' ? 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {apt.status || 'En attente'}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold mb-1"><i className="far fa-calendar-alt text-slate-400 mr-2"></i>{apt.date}</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-4"><i className="far fa-clock text-slate-400 mr-2"></i>{apt.timeSlot}</p>
                
                <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p><strong>Patient :</strong> {apt.name}</p>
                  <p><strong>Code suivi :</strong> <span className="font-mono text-xs">{apt.trackingCode}</span></p>
                </div>
                
                {(apt.status !== 'Annulé' && apt.status !== 'Terminé') && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button 
                      onClick={() => handleCancel(apt.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium w-full text-center"
                    >
                      <i className="fas fa-times-circle mr-1"></i> Annuler le RDV
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const container = document.getElementById('patient-root');
if (container) {
  const root = createRoot(container);
  root.render(<PatientPortal />);
}
