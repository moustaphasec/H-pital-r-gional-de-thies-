import React, { StrictMode, useEffect, useState, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { signInWithPopup, User } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, query, where } from 'firebase/firestore';
import {
  auth,
  db,
  googleAuthProvider,
  EMAILJS_CONFIG,
  getClinicId,
  reserveBookedSlot,
  releaseBookedSlot,
  formatWhatsAppUrl
} from './lib/firebase';
import { BOOKING_SPECIALTIES, normalizeSpecialtyMatch } from './lib/specialties';
import { analyzePatientForDoctor } from './lib/medical-ai';
import {
  playUrgentAppointmentAlert,
  unlockAudioOnUserGesture,
  exportAppointmentsToCsv
} from './lib/alerts';
import emailjs from '@emailjs/browser';
import './index.css';

function parseLocalDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setHours(0, 0, 0, 0);
  return d;
}

function DoctorDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingApt, setEditingApt] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ date: '', timeSlot: '' });

  const savedSpec = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('hr_doctor_specialty') || '' : '';
  const [mySpecialty, setMySpecialty] = useState<string>(savedSpec);
  const [hasSelectedSpecialty, setHasSelectedSpecialty] = useState<boolean>(Boolean(savedSpec));

  const [aiModalApt, setAiModalApt] = useState<any | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<string>('cette-semaine');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const isInitialLoad = useRef(true);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(prev => (prev === msg ? null : prev)), 4000);
  };

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | undefined;
    isInitialLoad.current = true;

    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);

      if (u && hasSelectedSpecialty && mySpecialty) {
        const q = query(
          collection(db, 'appointments'),
          where('clinicId', '==', getClinicId())
        );
        unsubscribeSnapshot = onSnapshot(
          q,
          (snapshot) => {
            if (!isInitialLoad.current) {
              const hasNewForSpecialty = snapshot.docChanges().some((change) => {
                if (change.type === 'added') {
                  const item = change.doc.data();
                  return normalizeSpecialtyMatch(item.specialty, mySpecialty);
                }
                return false;
              });
              if (hasNewForSpecialty && soundEnabledRef.current) {
                playUrgentAppointmentAlert(`Nouveau rendez-vous en ${mySpecialty}.`);
                showToast(`🔔 Nouveau rendez-vous reçu en ${mySpecialty} !`);
              }
            }

            const allData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            allData.sort((a: any, b: any) => {
              if (!a.createdAt) return 1;
              if (!b.createdAt) return -1;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            const filtered = allData.filter((item: any) =>
              normalizeSpecialtyMatch(item.specialty, mySpecialty)
            );
            setAppointments(filtered);
            isInitialLoad.current = false;
          },
          (error) => {
            console.error('Error listening to appointments:', error);
          }
        );
      } else {
        if (unsubscribeSnapshot) unsubscribeSnapshot();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [mySpecialty, hasSelectedSpecialty]);

  const login = async () => {
    unlockAudioOnUserGesture();
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error: any) {
      console.error('Error logging in:', error);
      alert('Erreur de connexion : ' + (error.message || 'Vérifiez vos bloqueurs de pop-up ou votre connexion.'));
    }
  };

  const logout = () => {
    sessionStorage.removeItem('hr_doctor_specialty');
    auth.signOut();
  };

  const chooseSpecialty = (specId: string) => {
    unlockAudioOnUserGesture();
    sessionStorage.setItem('hr_doctor_specialty', specId);
    setMySpecialty(specId);
    setHasSelectedSpecialty(true);
  };

  const runAiAnalysis = async (apt: any) => {
    setAiModalApt(apt);
    setAiAnalysis('');
    setIsAiLoading(true);
    try {
      const html = await analyzePatientForDoctor(apt);
      setAiAnalysis(html);
    } catch (err) {
      console.error(err);
      setAiAnalysis('Impossible de générer la synthèse pour le moment.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const sendEmailConfirmation = (apt: any, manual: boolean = false) => {
    if (!apt.email) {
      if (manual) alert("Ce patient n'a pas renseigné d'adresse e-mail. Utilisez le bouton WhatsApp ou Appel direct.");
      return;
    }
    emailjs
      .send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        {
          to_name: apt.name,
          to_email: apt.email,
          email: apt.email,
          recipient: apt.email,
          patient_email: apt.email,
          date: apt.date,
          time: apt.timeSlot || 'À préciser',
          message: apt.message || '',
          specialty: apt.specialty,
          tracking_code: apt.trackingCode || apt.id,
          status: apt.status === 'En attente' ? 'Confirmé' : apt.status,
          reply_to: 'contact@hopital-regional-thies.sn'
        },
        EMAILJS_CONFIG.publicKey
      )
      .then(
        () => {
          if (manual) showToast('✉️ E-mail de confirmation envoyé au patient.');
        },
        (err) => {
          console.error('Erreur EmailJS:', err);
          if (manual) alert("L'envoi d'e-mail a échoué. Privilégiez la notification WhatsApp.");
        }
      );
  };

  const buildWhatsAppLinkForApt = (apt: any) => {
    const code = apt.trackingCode || apt.id;
    const statusLabel = apt.status === 'Annulé' ? 'ANNULÉ' : 'CONFIRMÉ';
    const msg =
      `Bonjour ${apt.name}, ici le service ${apt.specialty} de l'Hôpital Régional de Thiès.\n` +
      `Votre rendez-vous (Code: ${code}) prévu le ${apt.date}${apt.timeSlot ? ' à ' + apt.timeSlot : ''} est *${statusLabel}*.\n` +
      `Merci de vous présenter 15 min à l'avance muni(e) de votre pièce d'identité et carnet de santé.`;
    return formatWhatsAppUrl(apt.phone, msg);
  };

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

      if (newStatus === 'Confirmé' && apt.email && navigator.onLine) {
        sendEmailConfirmation({ ...apt, status: 'Confirmé' }, false);
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert('Erreur lors de la mise à jour : ' + (error.message || ''));
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
      showToast('Créneau du rendez-vous mis à jour.');
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert("Une erreur s'est produite lors de la sauvegarde.");
    }
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

    return { aujourdhui, cetteSemaine, aVenir, archives };
  }, [appointments]);

  const displayedApts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const diffToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + diffToSunday);

    const q = searchTerm.trim().toLowerCase();

    return appointments.filter((apt) => {
      // Filtre onglet temporel
      const d = parseLocalDate(apt.date);
      if (!d) return false;
      if (activeTab === 'aujourdhui' && d.getTime() !== today.getTime()) return false;
      if (activeTab === 'archives' && !(d < today)) return false;
      if (activeTab === 'cette-semaine' && !(d >= today && d <= endOfWeek)) return false;
      if (activeTab === 'a-venir' && !(d > endOfWeek)) return false;

      // Filtre statut
      if (statusFilter !== 'ALL' && (apt.status || 'En attente') !== statusFilter) return false;

      // Filtre recherche
      if (q) {
        const hay = `${apt.name || ''} ${apt.phone || ''} ${apt.trackingCode || apt.id || ''} ${apt.email || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [appointments, activeTab, searchTerm, statusFilter]);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50/40 to-blue-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md text-center border border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto mb-5 shadow-sm">
            <i className="fas fa-user-md"></i>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">Espace Médecin</h1>
          <p className="text-slate-600 text-sm mb-8">
            Portail praticien sécurisé de l'Hôpital Régional El Hadji Ahmadou Sakhir Ndiéguène de Thiès.
          </p>
          <button
            onClick={login}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 cursor-pointer"
          >
            <i className="fab fa-google"></i> Se connecter avec Google
          </button>
          <a
            href="index.html"
            className="inline-flex items-center gap-2 mt-6 text-sm text-slate-500 hover:text-emerald-700 font-medium transition-colors"
          >
            <i className="fas fa-arrow-left"></i> Retour au site public
          </a>
        </div>
      </div>
    );
  }

  if (!hasSelectedSpecialty) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex flex-col items-center justify-center p-4 py-10">
        <div className="bg-white/90 backdrop-blur-xl p-6 md:p-10 rounded-3xl shadow-2xl w-full max-w-3xl text-center border border-slate-100">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-3xl mx-auto mb-4">
            <i className="fas fa-stethoscope"></i>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">Sélectionnez votre Service</h1>
          <p className="text-slate-600 text-sm mb-6">
            Conformément au secret médical, vous aurez uniquement accès aux dossiers et alertes sonores de votre spécialité.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
            {BOOKING_SPECIALTIES.map((spec) => (
              <button
                key={spec.id}
                onClick={() => chooseSpecialty(spec.id)}
                className="p-3.5 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/70 transition-all text-slate-800 font-medium text-sm flex items-center gap-3 cursor-pointer group"
              >
                <span className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <i className={`fas ${spec.icon}`}></i>
                </span>
                <span className="leading-tight">{spec.shortName}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-8 pt-4 border-t border-slate-100">
            <a href="index.html" className="text-sm text-slate-500 hover:text-blue-600 font-medium">
              <i className="fas fa-arrow-left mr-1"></i> Retour au site
            </a>
            <button onClick={logout} className="text-sm text-rose-600 hover:text-rose-700 font-medium cursor-pointer">
              Déconnexion ({user.email})
            </button>
          </div>
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
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium flex items-center gap-3 no-print">
          <span>{toastMsg}</span>
        </div>
      )}

      <header className="bg-white/85 backdrop-blur-lg shadow-sm border-b border-slate-200/80 sticky top-0 z-20 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <a
              href="index.html"
              className="text-xs sm:text-sm font-medium text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <i className="fas fa-arrow-left"></i> Accueil
            </a>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800">Espace Médecin</h1>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => {
                unlockAudioOnUserGesture();
                if (!soundEnabled) {
                  setSoundEnabled(true);
                  playUrgentAppointmentAlert('Alerte sonore activée.');
                } else {
                  playUrgentAppointmentAlert('Test alerte sonore nouveau rendez-vous.');
                }
              }}
              className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold px-3 py-1.5 rounded-full border border-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Tester l'alarme sonore sur cet appareil"
            >
              <i className="fas fa-bell text-amber-600"></i> Tester Alerte
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-300'
              }`}
              title="Activer ou couper la sonnerie automatique"
            >
              <i className={`fas ${soundEnabled ? 'fa-volume-up' : 'fa-volume-mute'} mr-1`}></i>
              {soundEnabled ? 'Son ON' : 'Muet'}
            </button>

            <button
              onClick={() => setHasSelectedSpecialty(false)}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Changer de spécialité"
            >
              <i className="fas fa-stethoscope"></i> {mySpecialty} <span className="opacity-80 font-normal">(Changer)</span>
            </button>

            <span className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full hidden lg:inline">
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
        {/* Bandeau Service */}
        <div className="relative bg-gradient-to-r from-emerald-700 to-teal-600 rounded-3xl shadow-lg overflow-hidden p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white no-print">
          <div className="z-10 max-w-xl">
            <span className="inline-block text-xs uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full font-semibold mb-2">
              Service : {mySpecialty}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold mb-1">Planning & Consultations</h2>
            <p className="text-emerald-50 text-sm">
              Synchronisation temps réel activée — vous recevez une alerte sonore instantanée à chaque nouveau rendez-vous.
            </p>
          </div>
          <div className="z-10 flex flex-wrap gap-2">
            <button
              onClick={() => exportAppointmentsToCsv(displayedApts, `rdv-${mySpecialty.toLowerCase()}`)}
              className="bg-white/15 hover:bg-white/25 backdrop-blur px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border border-white/30 cursor-pointer"
            >
              <i className="fas fa-file-csv"></i> Exporter CSV
            </button>
            <button
              onClick={() => window.print()}
              className="bg-white text-emerald-800 hover:bg-emerald-50 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow cursor-pointer"
            >
              <i className="fas fa-print"></i> Imprimer la liste
            </button>
          </div>
        </div>

        {/* Cartes KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl shrink-0">
              <i className="fas fa-calendar-day"></i>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Aujourd'hui</p>
              <p className="text-2xl font-bold text-slate-800">{tabCounts.aujourdhui}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl shrink-0">
              <i className="fas fa-hourglass-half"></i>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">En attente</p>
              <p className="text-2xl font-bold text-slate-800">{pendingApts}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl shrink-0">
              <i className="fas fa-check-circle"></i>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Confirmés</p>
              <p className="text-2xl font-bold text-slate-800">{confirmedApts}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-xl shrink-0">
              <i className="fas fa-folder-open"></i>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total service</p>
              <p className="text-2xl font-bold text-slate-800">{totalApts}</p>
            </div>
          </div>
        </div>

        {/* Conteneur Principal : Onglets + Filtres + Liste */}
        <div className="bg-white rounded-3xl shadow-md border border-slate-200/70 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 space-y-4 bg-slate-50/60 no-print">
            {/* Onglets temporels */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'aujourdhui', label: "Aujourd'hui", count: tabCounts.aujourdhui, icon: 'fa-calendar-day' },
                { id: 'cette-semaine', label: 'Cette semaine', count: tabCounts.cetteSemaine, icon: 'fa-calendar-week' },
                { id: 'a-venir', label: 'À venir', count: tabCounts.aVenir, icon: 'fa-calendar-plus' },
                { id: 'archives', label: 'Archives', count: tabCounts.archives, icon: 'fa-archive' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === t.id
                      ? 'bg-emerald-600 text-white shadow-sm'
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

            {/* Recherche & Filtre Statut */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un patient, téléphone ou code RDV-..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="En attente">En attente</option>
                <option value="Confirmé">Confirmé</option>
                <option value="Terminé">Terminé</option>
                <option value="Annulé">Annulé</option>
              </select>
            </div>
          </div>

          {displayedApts.length === 0 ? (
            <div className="p-12 sm:p-16 text-center flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center text-3xl mb-4">
                <i className="fas fa-calendar-check"></i>
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-1">Aucun rendez-vous dans cette vue</h3>
              <p className="text-slate-500 text-sm">
                Changez d'onglet ci-dessus ou réinitialisez les filtres de recherche.
              </p>
            </div>
          ) : (
            <>
              {/* VUE MOBILE EN CARTES (ergonomie smartphone optimale) */}
              <div className="md:hidden divide-y divide-slate-100">
                {displayedApts.map((apt) => {
                  const waLink = buildWhatsAppLinkForApt(apt);
                  return (
                    <div key={apt.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-base">{apt.name}</div>
                          <div className="text-xs text-slate-500 font-mono">{apt.trackingCode || apt.id}</div>
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

                      <div className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3 space-y-1">
                        <div className="font-semibold text-emerald-800">
                          <i className="far fa-calendar-alt mr-1.5"></i>
                          {apt.date} {apt.timeSlot ? `à ${apt.timeSlot}` : ''}
                        </div>
                        <div>
                          <i className="fas fa-phone text-emerald-600 mr-1.5"></i>
                          <a href={`tel:${apt.phone}`} className="underline font-medium">
                            {apt.phone || 'Non renseigné'}
                          </a>
                        </div>
                        {apt.message && (
                          <div className="text-xs text-slate-600 pt-1 border-t border-slate-200/70">
                            <strong>Motif :</strong> {apt.message}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 no-print">
                        {(apt.status || 'En attente') === 'En attente' && (
                          <>
                            <button
                              onClick={() => updateStatus(apt, 'Confirmé')}
                              className="flex-1 bg-emerald-600 text-white py-2 px-3 rounded-lg text-xs font-semibold"
                            >
                              <i className="fas fa-check mr-1"></i> Confirmer
                            </button>
                            <button
                              onClick={() => updateStatus(apt, 'Annulé')}
                              className="bg-rose-100 text-rose-700 py-2 px-3 rounded-lg text-xs font-semibold"
                            >
                              Annuler
                            </button>
                          </>
                        )}
                        {apt.status === 'Confirmé' && (
                          <button
                            onClick={() => updateStatus(apt, 'Terminé')}
                            className="bg-teal-600 text-white py-1.5 px-3 rounded-lg text-xs font-semibold"
                          >
                            <i className="fas fa-check-double mr-1"></i> Terminé
                          </button>
                        )}
                        <button
                          onClick={() => runAiAnalysis(apt)}
                          className="bg-purple-50 text-purple-700 border border-purple-200 py-1.5 px-3 rounded-lg text-xs font-bold"
                        >
                          <i className="fas fa-brain mr-1"></i> IA Copilot
                        </button>
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
                          className="bg-blue-50 text-blue-700 border border-blue-200 py-1.5 px-3 rounded-lg text-xs font-bold"
                        >
                          <i className="fas fa-edit"></i> Éditer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* VUE BUREAU EN TABLEAU COMPLET */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-100/70">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Patient & Contact</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Créneau</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Motif / Symptômes</th>
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
                              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold border border-emerald-200">
                                {(apt.name || '?').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900">{apt.name}</div>
                                <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                                  <i className="fas fa-phone text-emerald-600"></i>
                                  <a href={`tel:${apt.phone}`} className="hover:underline font-medium">
                                    {apt.phone || 'Non renseigné'}
                                  </a>
                                </div>
                                {apt.email && (
                                  <div className="text-xs text-slate-500 mt-0.5">{apt.email}</div>
                                )}
                                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                  {apt.trackingCode || apt.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-slate-900">{apt.date}</div>
                            <div className="text-xs font-semibold text-emerald-700">
                              {apt.timeSlot ? `Heure : ${apt.timeSlot}` : 'Heure libre'}
                            </div>
                            <div className="text-xs text-slate-500">{apt.specialty}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-700 max-w-xs line-clamp-2" title={apt.message}>
                              {apt.message || <span className="text-slate-400 italic">Aucun détail saisi</span>}
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
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                                  >
                                    <i className="fas fa-check mr-1"></i> Confirmer
                                  </button>
                                  <button
                                    onClick={() => updateStatus(apt, 'Annulé')}
                                    className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                                  >
                                    <i className="fas fa-times mr-1"></i> Annuler
                                  </button>
                                </>
                              )}
                              {apt.status === 'Confirmé' && (
                                <button
                                  onClick={() => updateStatus(apt, 'Terminé')}
                                  className="bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                  <i className="fas fa-check-double mr-1"></i> Terminé
                                </button>
                              )}
                              {(apt.status === 'Annulé' || apt.status === 'Terminé' || apt.status === 'Confirmé') && (
                                <button
                                  onClick={() => updateStatus(apt, 'En attente')}
                                  className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded border border-slate-200 cursor-pointer"
                                >
                                  Réinitialiser
                                </button>
                              )}
                            </div>

                            <div className="flex items-center flex-wrap gap-1.5">
                              <button
                                onClick={() => runAiAnalysis(apt)}
                                className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <i className="fas fa-brain text-purple-600"></i> IA Copilot
                              </button>
                              {waLink && (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
                                  title="Notifier le patient sur WhatsApp"
                                >
                                  <i className="fab fa-whatsapp"></i> WhatsApp
                                </a>
                              )}
                              <button
                                onClick={() => {
                                  setEditingApt(apt);
                                  setEditForm({ date: apt.date, timeSlot: apt.timeSlot || '' });
                                }}
                                className="text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer"
                              >
                                <i className="fas fa-edit mr-1"></i> Horaire
                              </button>
                              {apt.email && (
                                <button
                                  onClick={() => sendEmailConfirmation(apt, true)}
                                  className="text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                                  title="Envoyer un email au patient"
                                >
                                  <i className="fas fa-envelope"></i>
                                </button>
                              )}
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

        {/* Modal IA Copilot */}
        {aiModalApt && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
            <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl border border-slate-100 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <i className="fas fa-brain text-purple-600"></i> IA Copilot — Aide à la Consultation
                </h3>
                <button
                  onClick={() => setAiModalApt(null)}
                  className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mb-4">
                Patient : <strong>{aiModalApt.name}</strong> • Créneau : {aiModalApt.date} {aiModalApt.timeSlot || ''}
              </p>

              <div className="flex-1 overflow-y-auto bg-slate-50 p-5 rounded-2xl mb-4 border border-slate-200 text-sm leading-relaxed text-slate-800">
                {isAiLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 text-purple-600">
                    <i className="fas fa-spinner fa-spin text-3xl mb-3"></i>
                    <p>Préparation de la synthèse pré-consultation...</p>
                  </div>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: aiAnalysis }} />
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setAiModalApt(null)}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-sm cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal d'édition Date / Heure */}
        {editingApt && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
            <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-md border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Reprogrammer le rendez-vous</h3>
              <p className="text-sm text-slate-500 mb-5">Patient : {editingApt.name}</p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nouvelle date</label>
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
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm shadow cursor-pointer"
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
