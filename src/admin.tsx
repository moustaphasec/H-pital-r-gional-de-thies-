import React, { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { signInWithPopup } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc, query, orderBy, where } from 'firebase/firestore';
import { auth, db, googleAuthProvider } from './lib/firebase';
import { User } from 'firebase/auth';

function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingApt, setEditingApt] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ date: '', timeSlot: '' });
  const [activeTab, setActiveTab] = useState<string>('tous');
  const [searchTerm, setSearchTerm] = useState('');

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
    } catch (error: any) {
      console.error('Error logging in:', error);
      alert('Erreur de connexion : ' + (error.message || 'Vérifiez votre configuration Firebase ou vos bloqueurs de pop-up.'));
    }
  };

  const logout = () => auth.signOut();

  const fetchAppointments = async (u: User) => {
    try {
      const q = query(collection(db, 'appointments'), where('clinicId', '==', localStorage.getItem('healthsaas_clinic_id') || 'thies'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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

  // --- Filtrage par onglets ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getStartOfWeek = () => {
    const d = new Date(today);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d;
  };

  const getEndOfWeek = () => {
    const start = getStartOfWeek();
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
  };

  const filterByTab = (list: any[]) => {
    let filtered = list;

    switch (activeTab) {
      case 'aujourd-hui': {
        const todayStr = today.toISOString().split('T')[0];
        filtered = list.filter(a => a.date === todayStr);
        break;
      }
      case 'cette-semaine': {
        const startWeek = getStartOfWeek();
        const endWeek = getEndOfWeek();
        filtered = list.filter(a => {
          const d = new Date(a.date);
          return d >= startWeek && d <= endWeek;
        });
        break;
      }
      case 'a-venir': {
        filtered = list.filter(a => {
          const d = new Date(a.date);
          return d >= today && (a.status === 'En attente' || a.status === 'Confirmé');
        });
        break;
      }
      case 'passes': {
        filtered = list.filter(a => {
          const d = new Date(a.date);
          return d < today;
        });
        break;
      }
      case 'en-attente':
        filtered = list.filter(a => a.status === 'En attente');
        break;
      case 'confirmes':
        filtered = list.filter(a => a.status === 'Confirmé');
        break;
      case 'annules':
        filtered = list.filter(a => a.status === 'Annulé');
        break;
      default:
        break;
    }

    // Filtre de recherche textuelle
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        (a.name && a.name.toLowerCase().includes(term)) ||
        (a.phone && a.phone.includes(term)) ||
        (a.email && a.email.toLowerCase().includes(term)) ||
        (a.specialty && a.specialty.toLowerCase().includes(term)) ||
        (a.trackingCode && a.trackingCode.toLowerCase().includes(term))
      );
    }

    return filtered;
  };

  const filteredAppointments = filterByTab(appointments);

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white/70 backdrop-blur-xl p-10 rounded-3xl shadow-2xl w-full max-w-md text-center border border-white/50">
          <h1 className="text-3xl font-bold text-slate-800 mb-6 font-['Outfit']">Administration</h1>
          <p className="text-slate-600 mb-8">Connectez-vous pour gérer les demandes de rendez-vous de l'hôpital.</p>
          <button 
            onClick={login}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
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
  const cancelledApts = appointments.filter(a => a.status === 'Annulé').length;

  const tabs = [
    { id: 'tous', label: 'Tous', icon: 'fa-list', count: totalApts },
    { id: 'aujourd-hui', label: "Aujourd'hui", icon: 'fa-calendar-day', count: null },
    { id: 'cette-semaine', label: 'Cette semaine', icon: 'fa-calendar-week', count: null },
    { id: 'a-venir', label: 'À venir', icon: 'fa-arrow-right', count: null },
    { id: 'passes', label: 'Passés', icon: 'fa-history', count: null },
    { id: 'en-attente', label: 'En attente', icon: 'fa-hourglass-half', count: pendingApts },
    { id: 'confirmes', label: 'Confirmés', icon: 'fa-check-circle', count: confirmedApts },
    { id: 'annules', label: 'Annulés', icon: 'fa-times-circle', count: cancelledApts },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-sans text-slate-800 pb-12">
      <header className="bg-white/60 backdrop-blur-lg shadow-sm border-b border-white/50 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800 font-['Outfit']">Tableau de Bord Administrateur</h1>
          <div className="flex items-center gap-4">
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
        
        {/* Hero Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-cyan-500 rounded-3xl shadow-xl overflow-hidden p-8 flex items-center justify-between text-white border border-white/20">
          <div className="z-10 max-w-lg">
            <h2 className="text-3xl font-bold font-['Outfit'] mb-2">Bienvenue sur votre espace !</h2>
            <p className="text-blue-100">Gérez les consultations et prenez soin de vos patients avec efficacité. Voici le résumé de votre activité.</p>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-30 pointer-events-none" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1538108149393-fbbd81895907?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80")', backgroundSize: 'cover', backgroundPosition: 'center', maskImage: 'linear-gradient(to right, transparent, black)' }}></div>
          <i className="fas fa-stethoscope text-6xl text-white/20 absolute right-12 bottom-[-10px] transform rotate-12 z-0"></i>
        </div>

        {/* Cartes de Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/50 flex items-center gap-4 transition-transform hover:-translate-y-1">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl shadow-inner">
              <i className="fas fa-folder-open"></i>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Total</p>
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
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/50 flex items-center gap-4 transition-transform hover:-translate-y-1">
            <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 text-2xl shadow-inner">
              <i className="fas fa-times-circle"></i>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Annulés</p>
              <p className="text-3xl font-bold text-slate-800">{cancelledApts}</p>
            </div>
          </div>
        </div>

        {/* Barre de recherche + Onglets */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
          
          {/* Barre de recherche */}
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input 
                type="text"
                placeholder="Rechercher un patient, téléphone, spécialité ou code de suivi..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Onglets de filtrage */}
          <div className="flex flex-wrap gap-1 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <i className={`fas ${tab.icon}`}></i>
                {tab.label}
                {tab.count !== null && (
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.id ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tableau */}
          {filteredAppointments.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center">
              <i className="fas fa-inbox text-6xl text-slate-200 mb-4"></i>
              <h2 className="text-2xl font-bold text-slate-700 font-['Outfit'] mb-2">Aucun résultat</h2>
              <p className="text-slate-500">Aucun rendez-vous ne correspond à ce filtre.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Spécialité</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code suivi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAppointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-100 to-cyan-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200 shadow-sm">
                            {(apt.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900">{apt.name || 'Inconnu'}</div>
                            <div className="text-sm text-slate-500">{apt.createdAt ? new Date(apt.createdAt).toLocaleDateString() : '-'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{apt.phone || '-'}</div>
                        <div className="text-sm text-gray-500">{apt.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{apt.date || '-'}</div>
                        <div className="text-sm text-gray-500">{apt.timeSlot ? `Heure: ${apt.timeSlot}` : ''}</div>
                        <div className="text-sm text-gray-500">{apt.specialty || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">{apt.trackingCode || '-'}</span>
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
                            apt.status === 'Terminé' ? 'bg-gray-100 text-gray-800' :
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
                        {apt.status === 'Confirmé' && (
                          <button 
                            onClick={() => updateStatus(apt.id, 'Terminé')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Terminer
                          </button>
                        )}
                        <div className="mt-2 flex gap-3">
                          <button 
                            onClick={() => { setEditingApt(apt); setEditForm({ date: apt.date, timeSlot: apt.timeSlot || '' }); }}
                            className="text-blue-600 hover:text-blue-900 font-bold"
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
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-xl font-medium shadow-md transition-colors"
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

const rootEl = document.getElementById('admin-root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <AdminDashboard />
    </StrictMode>
  );
}
