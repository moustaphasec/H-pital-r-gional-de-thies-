import React, { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { signInWithPopup } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { app, auth, db, googleAuthProvider } from './lib/firebase';
import { User } from 'firebase/auth';

function DoctorDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingApt, setEditingApt] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ date: '', timeSlot: '' });
  const [mySpecialty, setMySpecialty] = useState<string>('Cardiologie');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        fetchAppointments(u, mySpecialty);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error: any) {
      console.error('Error logging in:', error);
      alert('Erreur de connexion : ' + (error.message || 'Vérifiez votre configuration Firebase ou vos bloqueurs de pop-up.'));
    }
  };

  const logout = () => auth.signOut();

  const fetchAppointments = async (u: User, specialty: string) => {
    try {
      
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
      
      const appointmentRef = doc(db, 'appointments', id);
      await updateDoc(appointmentRef, { status });
      
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const saveEdit = async () => {
    if (!editingApt || !user) return;
    try {
      const appointmentRef = doc(db, 'appointments', editingApt.id);
      await updateDoc(appointmentRef, { date: editForm.date, timeSlot: editForm.timeSlot });
      setAppointments(prev => prev.map(a => a.id === editingApt.id ? { ...a, date: editForm.date, timeSlot: editForm.timeSlot } : a));
      setEditingApt(null);
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert("Une erreur s'est produite lors de la sauvegarde.");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white/70 backdrop-blur-xl p-10 rounded-3xl shadow-2xl w-full max-w-md text-center border border-white/50">
          <h1 className="text-3xl font-bold text-slate-800 mb-6 font-['Outfit']">Espace Médecin</h1>
          <p className="text-slate-600 mb-8">Connectez-vous pour gérer les demandes de rendez-vous de l'hôpital.</p>
          <button 
            onClick={login}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Se connecter avec Google
          </button>
        </div>
      </div>
    );
  }

  const totalApts = appointments.length;
  const pendingApts = appointments.filter(a => a.status === 'En attente').length;
  const confirmedApts = appointments.filter(a => a.status === 'Confirmé').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-sans text-slate-800 pb-12">
      <header className="bg-white/60 backdrop-blur-lg shadow-sm border-b border-white/50 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800 font-['Outfit']">Tableau de Bord</h1>
          <div className="flex items-center gap-4">
            <select value={mySpecialty} onChange={e => { setMySpecialty(e.target.value); fetchAppointments(user, e.target.value); }} className="text-sm bg-white/80 border border-slate-200 rounded-full px-3 py-1 shadow-sm text-slate-700 outline-none">
              <option value="Cardiologie">Cardiologie</option>
              <option value="Néphrologie">Néphrologie</option>
              <option value="Gynécologie">Gynécologie</option>
              <option value="Pédiatrie">Pédiatrie</option>
              <option value="Chirurgie">Chirurgie</option>
              <option value="Ophtalmologie">Ophtalmologie</option>
              <option value="Urgences">Urgences</option>
            </select>
            <span className="text-sm font-medium text-slate-600 bg-white/80 px-4 py-2 rounded-full shadow-sm">{user.email}</span>
            <button 
              onClick={logout}
              className="text-sm text-rose-500 hover:text-rose-700 font-medium transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Hero Header Illustré */}
        <div className="relative bg-gradient-to-r from-emerald-600 to-teal-500 rounded-3xl shadow-xl overflow-hidden p-8 flex items-center justify-between text-white border border-white/20">
          <div className="z-10 max-w-lg">
            <h2 className="text-3xl font-bold font-['Outfit'] mb-2">Bienvenue sur votre espace !</h2>
            <p className="text-blue-100">Gérez les consultations et prenez soin de vos patients avec efficacité. Voici le résumé de votre activité.</p>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-30 pointer-events-none" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1538108149393-fbbd81895907?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80")', backgroundSize: 'cover', backgroundPosition: 'center', maskImage: 'linear-gradient(to right, transparent, black)' }}></div>
          <i className="fas fa-stethoscope text-6xl text-white/20 absolute right-12 bottom-[-10px] transform rotate-12 z-0"></i>
        </div>

        {/* Cartes de Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/50 flex items-center gap-4 transition-transform hover:-translate-y-1">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-2xl shadow-inner">
              <i className="fas fa-folder-open"></i>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Total des demandes</p>
              <p className="text-3xl font-bold text-slate-800">{totalApts}</p>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/50 flex items-center gap-4 transition-transform hover:-translate-y-1">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-500 text-2xl shadow-inner">
              <i className="fas fa-hourglass-half"></i>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">En attente</p>
              <p className="text-3xl font-bold text-slate-800">{pendingApts}</p>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/50 flex items-center gap-4 transition-transform hover:-translate-y-1">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-2xl shadow-inner">
              <i className="fas fa-check-circle"></i>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Confirmés</p>
              <p className="text-3xl font-bold text-slate-800">{confirmedApts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
          {appointments.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center">
              <img src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Bureau vide" className="w-56 h-56 object-cover rounded-full mb-6 border-8 border-slate-50 shadow-md opacity-90" />
              <h2 className="text-2xl font-bold text-slate-700 font-['Outfit'] mb-2">Tout est à jour !</h2>
              <p className="text-slate-500">Aucune demande de rendez-vous n'est à traiter pour le moment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Spécialité</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-100 to-cyan-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200 shadow-sm">
                            {apt.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900">{apt.name}</div>
                            <div className="text-sm text-slate-500">{apt.createdAt ? new Date(apt.createdAt).toLocaleDateString() : '-'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{apt.phone}</div>
                        <div className="text-sm text-gray-500">{apt.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{apt.date}</div>
                        <div className="text-sm text-gray-500">{apt.timeSlot ? `Heure: ${apt.timeSlot}` : ''}</div>
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
                        <div className="mt-2 flex gap-3">
                          <button 
                            onClick={() => { setEditingApt(apt); setEditForm({ date: apt.date, timeSlot: apt.timeSlot || '' }); }}
                            className="text-emerald-600 hover:text-blue-900 font-bold"
                          >
                            Éditer <i className="fas fa-edit"></i>
                          </button>
                          {apt.status !== 'En attente' && (
                            <button 
                              onClick={() => updateStatus(apt.id, 'En attente')}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              Réinitialiser
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal d'édition */}
        {editingApt && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/50 transform transition-all">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Modifier le rendez-vous</h3>
              <p className="text-sm text-gray-500 mb-4">Patient: {editingApt.name}</p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input 
                  type="date" 
                  value={editForm.date} 
                  onChange={e => setEditForm({...editForm, date: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Heure / Créneau</label>
                <input 
                  type="text" 
                  placeholder="Ex: 14:00"
                  value={editForm.timeSlot} 
                  onChange={e => setEditForm({...editForm, timeSlot: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setEditingApt(null)}
                  className="px-5 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={saveEdit}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white rounded-xl font-medium shadow-md transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const rootEl = document.getElementById('doctor-root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <DoctorDashboard />
    </StrictMode>
  );
}
