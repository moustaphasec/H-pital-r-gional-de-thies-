import React, { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { auth, googleAuthProvider } from './lib/firebase';
import { User } from 'firebase/auth';

function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        fetchAppointments(u);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  const logout = () => auth.signOut();

  const fetchAppointments = async (u: User) => {
    try {
      const db = getFirestore();
      const q = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    if (!user) return;
    try {
      const db = getFirestore();
      const appointmentRef = doc(db, 'appointments', id);
      await updateDoc(appointmentRef, { status });
      
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Administration Hôpital</h1>
          <p className="text-gray-600 mb-8">Veuillez vous connecter pour accéder aux demandes de rendez-vous.</p>
          <button 
            onClick={login}
            className="w-full bg-[#2051a5] hover:bg-[#1a4080] text-white font-medium py-3 px-4 rounded transition-colors"
          >
            Se connecter avec Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800">Tableau de Bord - Rendez-vous</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button 
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {appointments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Aucun rendez-vous trouvé.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Spécialité</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {appointments.map((apt) => (
                    <tr key={apt.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{apt.name}</div>
                        <div className="text-sm text-gray-500">{apt.createdAt ? new Date(apt.createdAt).toLocaleDateString() : '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{apt.phone}</div>
                        <div className="text-sm text-gray-500">{apt.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{apt.date}</div>
                        <div className="text-sm text-gray-500">{apt.specialty}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={apt.message}>
                          {apt.message || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${apt.status === 'Confirmé' ? 'bg-green-100 text-green-800' : 
                            apt.status === 'Annulé' ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'}`}>
                          {apt.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {apt.status === 'En attente' && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => updateStatus(apt.id, 'Confirmé')}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Confirmer
                            </button>
                            <button 
                              onClick={() => updateStatus(apt.id, 'Annulé')}
                              className="text-red-600 hover:text-red-900"
                            >
                              Annuler
                            </button>
                          </div>
                        )}
                        {apt.status !== 'En attente' && (
                          <button 
                            onClick={() => updateStatus(apt.id, 'En attente')}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Réinitialiser
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const rootEl = document.getElementById('admin-root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <AdminDashboard />
    </StrictMode>
  );
}
