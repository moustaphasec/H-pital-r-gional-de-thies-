let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function unlockAudioOnUserGesture(): void {
  getAudioContext();
}

export function playUrgentAppointmentAlert(spokenMessage = 'Attention, nouveau rendez-vous médical enregistré.'): void {
  // 1. Synthèse d'une alarme sonore médicale universelle (compatible iPhone/iOS Safari, Android et PC hors-ligne)
  try {
    const ctx = getAudioContext();
    if (ctx) {
      const now = ctx.currentTime;
      const notes = [880, 1174.66, 880, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.18);
        gain.gain.setValueAtTime(0.001, now + idx * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.32, now + idx * 0.18 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.18);
        osc.stop(now + idx * 0.18 + 0.17);
      });
    }
  } catch (e) {
    console.warn('WebAudio fallback error:', e);
  }

  // 2. Lecture du fichier sonore notification.ogg en complément
  try {
    const audio = new Audio('/notification.ogg');
    audio.volume = 0.9;
    audio.play().catch(() => {});
  } catch {
    // Ignore
  }

  // 3. Annonce vocale en français (Web Speech API native hors-ligne)
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && spokenMessage) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(spokenMessage);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  } catch {
    // Ignore
  }
}

export function exportAppointmentsToCsv(appointments: any[], filenamePrefix = 'rendez-vous-hopital-thies'): void {
  const headers = ['Code Suivi', 'Patient', 'Téléphone', 'Email', 'Spécialité', 'Date', 'Heure', 'Statut', 'Motif', 'Créé le'];
  const escapeCsv = (val: any) => {
    const s = String(val ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = appointments.map(a => [
    a.trackingCode || a.id,
    a.name,
    a.phone,
    a.email || '',
    a.specialty,
    a.date,
    a.timeSlot || '',
    a.status || 'En attente',
    (a.message || '').replace(/\r?\n/g, ' '),
    a.createdAt ? new Date(a.createdAt).toLocaleString('fr-FR') : ''
  ].map(escapeCsv).join(';'));

  // BOM UTF-8 pour ouverture directe avec accents parfaits dans Microsoft Excel (séparateur ';')
  const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `${filenamePrefix}-${today}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
