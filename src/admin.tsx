import React, { StrictMode, useEffect, useState, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { signInWithPopup, User } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import {
  auth,
  db,
  googleAuthProvider,
  getClinicId,
  reserveBookedSlot,
  releaseBookedSlot,
  formatWhatsAppUrl
} from './lib/firebase';
import { BOOKING_SPECIALTIES, normalizeSpecialtyMatch } from './lib/specialties';
import {
  playUrgentAppointmentAlert,
  unlockAudioOnUserGesture,
  exportAppointmentsToCsv
} from './lib/alerts';
import './index.css';

function parseLocalDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setHours(0, 0, 0, 0);
  return d;
}

function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingApt, setEditingApt] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ date: '', timeSlot: '' });

  const [activeTab, setActiveTab] = useState<string>('cette-semaine');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const isInitialAptLoad = useRef(true);
  const isInitialMsgLoad = useRef(true);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((prev) => (prev === msg ? null : prev)), 4000);
  };

  useEffect(() => {
    let unsubApts: (() => void) | undefined;
    let unsubMsgs: (() => void) | undefined;

    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);

      if (u) {
        isInitialAptLoad.current = true;
        isInitialMsgLoad.current = true;
        const clinicId = getClinicId();

        // 1. Écoute temps réel des rendez-vous
        const qApts = query(collection(db, 'appointments'), where('clinicId', '==', clinicId));
        unsubApts = onSnapshot(
          qApts,
          (snapshot) => {
            if (!isInitialAptLoad.current) {
              const added = snapshot.docChanges().filter((c) => c.type === 'added');
              if (added.length > 0 && soundEnabledRef.current) {
                const first = added[0].doc.data();
                playUrgentAppointmentAlert(
                  `Nouveau rendez-vous enregistré en ${first.specialty || 'consultation'}.`
                );
                showToast(`🔔 Nouveau rendez-vous reçu (${first.specialty || 'Hôpital'}) !`);
              }
            }

            const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            data.sort((a: any, b: any) => {
              if (!a.createdAt) return 1;
              if (!b.createdAt) return -1;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            setAppointments(data);
            isInitialAptLoad.current = false;
          },
          (error) => console.error('Error listening to appointments:', error)
        );

        // 2. Écoute temps réel des messages de contact
        const qMsgs = query(collection(db, 'contact_messages'), where('clinicId', '==', clinicId));
        unsubMsgs = onSnapshot(
          qMsgs,
          (snapshot) => {
            if (!isInitialMsgLoad.current) {
              const hasNew = snapshot.docChanges().some((c) => c.type === 'added');
              if (hasNew && soundEnabledRef.current) {
                playUrgentAppointmentAlert('Nouveau message de contact reçu.');
                showToast('📬 Nouveau message citoyen reçu !');
              }
            }

            const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            msgs.sort((a: any, b: any) => {
              if (!a.createdAt) return 1;
              if (!b.createdAt) return -1;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            setContactMessages(msgs);
            isInitialMsgLoad.current = false;
          },
          (error) => console.warn('Info écoute contact_messages:', error)
        );
      } else {
        if (unsubApts) unsubApts();
        if (unsubMsgs) unsubMsgs();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubApts) unsubApts();
      if (unsubMsgs) unsubMsgs();
    };
  }, []);

  const login = async () => {
    unlockAudioOnUserGesture();
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error: any) {
      console.error('Error logging in:', error);
      alert('Erreur de connexion : ' + (error.message || 'Vérifiez vos bloqueurs de pop-up.'));
    }
  };

  const logout = () => auth.signOut();

  const updateStatus = async (apt: any, newStatus: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'appointments', apt.id), { status: newStatus });

      if (newStatus === 'Annulé') {
        await releaseBookedSlot({
          clinicId: apt.clinicId,
          specialty: apt.specialty,
          date: apt.date,
          timeSlot: apt.timeSlot,
          appointmentId: apt.id
        });
      } else if (apt.status === 'Annulé' && (newStatus === 'Confirmé' || newStatus === 'En attente')) {
        await reserveBookedSlot({
          clinicId: apt.clinicId || getClinicId(),
          specialty: apt.specialty,
          date: apt.date,
          timeSlot: apt.timeSlot,
          appointmentId: apt.id
        });
      }

      setAppointments((prev) => prev.map((a) => (a.id === apt.id ? { ...a, status: newStatus } : a)));
      showToast(`Statut mis à jour : ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const saveEdit = async () => {
    if (!editingApt || !user) return;
    try {
      const oldDate = editingApt.date;
      const oldTime = editingApt.timeSlot;
      await updateDoc(doc(db, 'appointments', editingApt.id), {
        date: editForm.date,
        timeSlot: editForm.timeSlot
      });

      if (oldDate !== editForm.date || oldTime !== editForm.timeSlot) {
        await releaseBookedSlot({
          clinicId: editingApt.clinicId,
          specialty: editingApt.specialty,
          date: oldDate,
          timeSlot: oldTime,
          appointmentId: editingApt.id
        });
        if (editingApt.status !== 'Annulé' && editForm.date && editForm.timeSlot) {
          await reserveBookedSlot({
            clinicId: editingApt.clinicId || getClinicId(),
            specialty: editingApt.specialty,
            date: editForm.date,
            timeSlot: editForm.timeSlot,
            appointmentId: editingApt.id
          });
        }
      }

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === editingApt.id ? { ...a, date: editForm.date, timeSlot: editForm.timeSlot } : a
        )
      );
      setEditingApt(null);
      showToast('Rendez-vous reprogrammé avec succès.');
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert("Une erreur s'est produite lors de la sauvegarde.");
    }
  };

  const markMessageHandled = async (msgId: string, currentStatus?: string) => {
    const nextStatus = currentStatus === 'Traité' ? 'Nouveau' : 'Traité';
    try {
      await updateDoc(doc(db, 'contact_messages', msgId), { status: nextStatus });
      setContactMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, status: nextStatus } : m)));
    } catch (err) {
      console.error('Error updating contact message:', err);
    }
  };

  const deleteContactMessage = async (msgId: string) => {
    if (!confirm('Supprimer définitivement ce message ?')) return;
    try {
      await deleteDoc(doc(db, 'contact_messages', msgId));
      setContactMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      console.error('Error deleting contact message:', err);
    }
  };

  const buildWhatsAppLinkForApt = (apt: any) => {
    const code = apt.trackingCode || apt.id;
    const statusLabel = apt.status === 'Annulé' ? 'ANNULÉ' : 'CONFIRMÉ';
    const msg =
      `Bonjour ${apt.name}, ici l'Administration de l'Hôpital Régional de Thiès.\n` +
      `Votre rendez-vous en ${apt.specialty} (Code: ${code}) prévu le ${apt.date}${apt.timeSlot ? ' à ' + apt.timeSlot : ''} est *${statusLabel}*.`;
    return formatWhatsAppUrl(apt.phone, msg);
  };

  const tabCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const diffToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + diffToSunday);

    let aujourdhui = 0;
    let cetteSemaine = 0;
    let aVenir = 0;
    let archives = 0;

    appointments.forEach((apt) => {
      const d = parseLocalDate(apt.date);
      if (!d) return;
      if (d.getTime() === today.getTime()) aujourdhui++;
      if (d < today) archives++;
      else if (d >= today && d <= endOfWeek) cetteSemaine++;
      else if (d > endOfWeek) aVenir++;
    });

    const unreadMessages = contactMessages.filter((m) => m.status !== 'Traité').length;
    return { aujourdhui, cetteSemaine, aVenir, archives, unreadMessages };
  }, [appointments, contactMessages]);

  const displayedApts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const diffToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + diffToSunday);

    const q = searchTerm.trim().toLowerCase();

    return appointments.filter((apt) => {
      const d = parseLocalDate(apt.date);
      if (!d) return false;
      if (activeTab === 'aujourdhui' && d.getTime() !== today.getTime()) return false;
      if (activeTab === 'archives' && !(d < today)) return false;
      if (activeTab === 'cette-semaine' && !(d >= today && d <= endOfWeek)) return false;
      if (activeTab === 'a-venir' && !(d > endOfWeek)) return false;

      if (specialtyFilter !== 'ALL' && !normalizeSpecialtyMatch(apt.specialty, specialtyFilter)) {
        return false;
      }
      if (statusFilter !== 'ALL' && (apt.status || 'En attente') !== statusFilter) {
        return false;
      }
      if (q) {
        const hay = `${apt.name || ''} ${apt.phone || ''} ${apt.specialty || ''} ${apt.trackingCode || apt.id || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [appointments, activeTab, searchTerm, specialtyFilter, statusFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-10 space-y-6">
        <div className="h-16 bg-slate-200 animate-pulse rounded-2xl w-full max-w-7xl mx-auto"></div>
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-slate-200 animate-pulse rounded-2xl"></div>
          ))}
        </div>
        <div className="max-w-7xl mx-auto h-96 bg-slate-200 animate-pulse rounded-2xl"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md text-center border border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-3xl mx-auto mb-5">
            <i className="fas fa-hospital-user"></i>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">Direction & Administration</h1>
          <p className="text-slate-600 text-sm mb-8">
            Connectez-vous pour superviser l'ensemble des services, les rendez-vous et les demandes citoyennes.
          </p>
          <button
            onClick={login}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 mb-5 cursor-pointer"
          >
            <i className="fab fa-google"></i> Se connecter avec Google
          </button>
          <a href="index.html" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 font-medium">
            <i className="fas fa-arrow-left"></i> Retour au site public
          </a>
        </div>
      </div>
    );
  }

  const totalApts = appointments.length;
  const pendingApts = appointments.filter((a) => (a.status || 'En attente') === 'En attente').length;
  const confirmedApts = appointments.filter((a) => a.status === 'Confirmé').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/60 text-slate-800 pb-14">
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium no-print">
          {toastMsg}
        </div>
      )}

      <header className="bg-white/85 backdrop-blur-lg shadow-sm border-b border-slate-200/80 sticky top-0 z-20 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <a
              href="index.html"
              className="text-xs sm:text-sm font-medium text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <i className="fas fa-arrow-left"></i> Accueil
            </a>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800">Tableau de Bord Administration</h1>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => {
                unlockAudioOnUserGesture();
                setSoundEnabled(true);
                playUrgentAppointmentAlert('Alerte sonore administration opérationnelle.');
              }}
              className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold px-3 py-1.5 rounded-full border border-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fas fa-bell text-amber-600"></i> Tester Alerte
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-slate-100 text-slate-500 border-slate-300'
              }`}
            >
              <i className={`fas ${soundEnabled ? 'fa-volume-up' : 'fa-volume-mute'} mr-1`}></i>
              {soundEnabled ? 'Son ON' : 'Muet'}
            </button>

            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full hidden lg:inline">
              {user.email}
            </span>

            <button
              onClick={logout}
              className="text-xs sm:text-sm text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 cursor-pointer"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Bandeau Direction */}
        <div className="relative bg-gradient-to-r from-blue-700 to-cyan-600 rounded-3xl shadow-lg overflow-hidden p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white no-print">
          <div className="z-10 max-w-xl">
            <span className="inline-block text-xs uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full font-semibold mb-2">
              Supervision Globale • Hôpital Régional de Thiès
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold mb-1">Centre de Pilotage Hospitalier</h2>
            <p className="text-blue-100 text-sm">
              Vue consolidée de toutes les spécialités médicales et des messages reçus du public.
            </p>
          </div>
          <div className="z-10 flex flex-wrap gap-2">
            <button
              onClick={() => exportAppointmentsToCsv(displayedApts, 'administration-rdv-thies')}
              className="bg-white/15 hover:bg-white/25 backdrop-blur px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border border-white/30 cursor-pointer"
            >
              <i className="fas fa-file-csv"></i> Exporter CSV
            </button>
            <button
              onClick={() => window.print()}
              className="bg-white text-blue-800 hover:bg-blue-50 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow cursor-pointer"
            >
              <i className="fas fa-print"></i> Imprimer
            </button>
          </div>
        </div>

        {/* Cartes KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 no-print">
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-lg shrink-0">
              <i className="fas fa-calendar-day"></i>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Aujourd'hui</p>
              <p className="text-2xl font-bold text-slate-800">{tabCounts.aujourdhui}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-lg shrink-0">
              <i className="fas fa-hourglass-half"></i>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">En attente</p>
              <p className="text-2xl font-bold text-slate-800">{pendingApts}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg shrink-0">
              <i className="fas fa-check-circle"></i>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Confirmés</p>
              <p className="text-2xl font-bold text-slate-800">{confirmedApts}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-lg shrink-0">
              <i className="fas fa-folder-open"></i>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total RDV</p>
              <p className="text-2xl font-bold text-slate-800">{totalApts}</p>
            </div>
          </div>

          <div className="col-span-2 lg:col-span-1 bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-lg shrink-0">
              <i className="fas fa-envelope-open-text"></i>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Messages Public</p>
              <p className="text-2xl font-bold text-slate-800">{contactMessages.length}</p>
            </div>
          </div>
        </div>

        {/* Onglets + Filtres + Données */}
        <div className="bg-white rounded-3xl shadow-md border border-slate-200/70 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 space-y-4 bg-slate-50/60 no-print">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'aujourdhui', label: "Aujourd'hui", count: tabCounts.aujourdhui, icon: 'fa-calendar-day' },
                { id: 'cette-semaine', label: 'Cette semaine', count: tabCounts.cetteSemaine, icon: 'fa-calendar-week' },
                { id: 'a-venir', label: 'À venir', count: tabCounts.aVenir, icon: 'fa-calendar-plus' },
                { id: 'archives', label: 'Archives', count: tabCounts.archives, icon: 'fa-archive' },
                { id: 'messages', label: 'Messages Contact', count: tabCounts.unreadMessages, icon: 'fa-inbox' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === t.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <i className={`fas ${t.icon}`}></i>
                  <span>{t.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      activeTab === t.id ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {activeTab !== 'messages' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Nom, téléphone ou code RDV-..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <select
                  value={specialtyFilter}
                  onChange={(e) => setSpecialtyFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">Toutes les spécialités</option>
                  {BOOKING_SPECIALTIES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="En attente">En attente</option>
                  <option value="Confirmé">Confirmé</option>
                  <option value="Terminé">Terminé</option>
                  <option value="Annulé">Annulé</option>
                </select>
              </div>
            )}
          </div>

          {activeTab === 'messages' ? (
            contactMessages.length === 0 ? (
              <div className="p-16 text-center text-slate-500">
                <i className="fas fa-inbox text-4xl text-slate-300 mb-3 block"></i>
                Aucun message de contact reçu pour le moment.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {contactMessages.map((m) => {
                  const waReply = formatWhatsAppUrl(
                    m.phone,
                    `Bonjour ${m.name}, suite à votre message adressé à l'Hôpital Régional de Thiès (${m.subject || 'Contact'}) : `
                  );
                  return (
                    <div key={m.id} className="p-5 sm:p-6 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row justify-between gap-4">
                      <div className="space-y-1.5 max-w-3xl">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-bold text-slate-900">{m.name || 'Visiteur'}</span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
                            {m.subject || 'Information'}
                          </span>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                              m.status === 'Traité' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {m.status || 'Nouveau'}
                          </span>
                          <span className="text-xs text-slate-400">
                            {m.createdAt ? new Date(m.createdAt).toLocaleString('fr-FR') : ''}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 flex flex-wrap gap-4">
                          {m.phone && (
                            <a href={`tel:${m.phone}`} className="hover:underline font-medium">
                              <i className="fas fa-phone text-blue-600 mr-1"></i> {m.phone}
                            </a>
                          )}
                          {m.email && (
                            <a href={`mailto:${m.email}`} className="hover:underline">
                              <i className="fas fa-envelope text-blue-600 mr-1"></i> {m.email}
                            </a>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100 whitespace-pre-line">
                          {m.message}
                        </p>
                      </div>

                      <div className="flex sm:flex-col gap-2 shrink-0 justify-end sm:justify-start">
                        <button
                          onClick={() => markMessageHandled(m.id, m.status)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                            m.status === 'Traité'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          <i className="fas fa-check mr-1"></i>
                          {m.status === 'Traité' ? 'Rouvrir' : 'Marquer traité'}
                        </button>
                        {waReply && (
                          <a
                            href={waReply}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 border border-green-200 text-center"
                          >
                            <i className="fab fa-whatsapp mr-1"></i> Répondre
                          </a>
                        )}
                        <button
                          onClick={() => deleteContactMessage(m.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <i className="fas fa-trash-alt mr-1"></i> Supprimer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : displayedApts.length === 0 ? (
            <div className="p-12 sm:p-16 text-center flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-3xl mb-4">
                <i className="fas fa-calendar-check"></i>
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-1">Aucune demande dans cette section</h3>
              <p className="text-slate-500 text-sm">Modifiez l'onglet ou les critères de filtrage.</p>
            </div>
          ) : (
            <>
              {/* VUE MOBILE EN CARTES */}
              <div className="md:hidden divide-y divide-slate-100">
                {displayedApts.map((apt) => {
                  const waLink = buildWhatsAppLinkForApt(apt);
                  return (
                    <div key={apt.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900">{apt.name}</div>
                          <div className="text-xs font-semibold text-blue-600">{apt.specialty}</div>
                          <div className="text-[11px] font-mono text-slate-400">{apt.trackingCode || apt.id}</div>
                        </div>
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                            apt.status === 'Confirmé'
                              ? 'bg-emerald-100 text-emerald-800'
                              : apt.status === 'Terminé'
                              ? 'bg-teal-100 text-teal-800'
                              : apt.status === 'Annulé'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {apt.status || 'En attente'}
                        </span>
                      </div>

                      <div className="text-sm bg-slate-50 rounded-xl p-3 space-y-1">
                        <div className="font-semibold text-slate-800">
                          <i className="far fa-calendar-alt mr-1.5 text-blue-600"></i>
                          {apt.date} {apt.timeSlot ? `à ${apt.timeSlot}` : ''}
                        </div>
                        <div>
                          <i className="fas fa-phone mr-1.5 text-emerald-600"></i>
                          <a href={`tel:${apt.phone}`} className="underline font-medium">
                            {apt.phone}
                          </a>
                        </div>
                        {apt.message && <div className="text-xs text-slate-600 pt-1">{apt.message}</div>}
                      </div>

                      <div className="flex flex-wrap gap-2 no-print">
                        {(apt.status || 'En attente') === 'En attente' && (
                          <>
                            <button
                              onClick={() => updateStatus(apt, 'Confirmé')}
                              className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-xs font-semibold"
                            >
                              Confirmer
                            </button>
                            <button
                              onClick={() => updateStatus(apt, 'Annulé')}
                              className="bg-rose-100 text-rose-700 py-2 px-3 rounded-lg text-xs font-semibold"
                            >
                              Annuler
                            </button>
                          </>
                        )}
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-50 text-green-700 border border-green-200 py-1.5 px-3 rounded-lg text-xs font-bold"
                          >
                            <i className="fab fa-whatsapp mr-1"></i> WhatsApp
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setEditingApt(apt);
                            setEditForm({ date: apt.date, timeSlot: apt.timeSlot || '' });
                          }}
                          className="bg-slate-100 text-slate-700 py-1.5 px-3 rounded-lg text-xs font-semibold"
                        >
                          <i className="fas fa-edit mr-1"></i> Éditer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* VUE BUREAU EN TABLEAU */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-100/70">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Patient</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Contact</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Date & Service</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Motif</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Statut</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedApts.map((apt) => {
                      const waLink = buildWhatsAppLinkForApt(apt);
                      return (
                        <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold border border-blue-200">
                                {(apt.name || '?').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900">{apt.name}</div>
                                <div className="text-[11px] font-mono text-slate-400">{apt.trackingCode || apt.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <a href={`tel:${apt.phone}`} className="text-sm text-slate-900 font-medium hover:underline block">
                              <i className="fas fa-phone text-emerald-600 mr-1 text-xs"></i> {apt.phone}
                            </a>
                            {apt.email && <div className="text-xs text-slate-500">{apt.email}</div>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-slate-900">{apt.date}</div>
                            <div className="text-xs text-blue-700 font-semibold">
                              {apt.timeSlot ? `Heure : ${apt.timeSlot}` : ''}
                            </div>
                            <div className="text-xs text-slate-600">{apt.specialty}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-700 max-w-xs truncate" title={apt.message}>
                              {apt.message || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full ${
                                apt.status === 'Confirmé'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : apt.status === 'Terminé'
                                  ? 'bg-teal-100 text-teal-800'
                                  : apt.status === 'Annulé'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {apt.status || 'En attente'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium no-print">
                            <div className="flex flex-wrap gap-1.5 mb-1.5">
                              {(apt.status || 'En attente') === 'En attente' && (
                                <>
                                  <button
                                    onClick={() => updateStatus(apt, 'Confirmé')}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                                  >
                                    Confirmer
                                  </button>
                                  <button
                                    onClick={() => updateStatus(apt, 'Annulé')}
                                    className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                                  >
                                    Annuler
                                  </button>
                                </>
                              )}
                              {apt.status === 'Confirmé' && (
                                <button
                                  onClick={() => updateStatus(apt, 'Terminé')}
                                  className="bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                  Terminé
                                </button>
                              )}
                              {apt.status && apt.status !== 'En attente' && (
                                <button
                                  onClick={() => updateStatus(apt, 'En attente')}
                                  className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded border border-slate-200 cursor-pointer"
                                >
                                  Réinitialiser
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {waLink && (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-2.5 py-1 rounded-lg text-xs font-bold"
                                >
                                  <i className="fab fa-whatsapp mr-1"></i> WhatsApp
                                </a>
                              )}
                              <button
                                onClick={() => {
                                  setEditingApt(apt);
                                  setEditForm({ date: apt.date, timeSlot: apt.timeSlot || '' });
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer"
                              >
                                <i className="fas fa-edit mr-1"></i> Éditer
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Modal d'édition */}
        {editingApt && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
            <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-md border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Modifier le rendez-vous</h3>
              <p className="text-sm text-slate-500 mb-5">
                Patient : {editingApt.name} ({editingApt.specialty})
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">Créneau horaire</label>
                <select
                  value={editForm.timeSlot}
                  onChange={(e) => setEditForm({ ...editForm, timeSlot: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-white"
                >
                  <option value="">-- Sélectionner une heure --</option>
                  {['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'].map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEditingApt(null)}
                  className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium text-sm cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={saveEdit}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow cursor-pointer"
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
