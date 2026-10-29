export interface SpecialtyItem {
  id: string;
  name: string;
  shortName: string;
  icon: string; // FontAwesome class (without 'fas ')
  description: string;
  aliases?: string[];
}

export const BOOKING_SPECIALTIES: SpecialtyItem[] = [
  {
    id: 'Cardiologie',
    name: 'Cardiologie & HTA',
    shortName: 'Cardiologie',
    icon: 'fa-heartbeat',
    description: 'Maladies cardiovasculaires, hypertension artérielle, ECG et échographie cardiaque.',
    aliases: ['cardiologie']
  },
  {
    id: 'Néphrologie',
    name: 'Néphrologie & Dialyse',
    shortName: 'Néphrologie',
    icon: 'fa-tint',
    description: 'Prise en charge des affections rénales et centre d’hémodialyse équipé de 23 postes.',
    aliases: ['nephrologie', 'néphrologie et dialyse']
  },
  {
    id: 'Gynécologie',
    name: 'Gynécologie & Maternité',
    shortName: 'Gynécologie',
    icon: 'fa-baby',
    description: 'Suivi de grossesse, échographie obstétricale, accouchement et santé de la femme.',
    aliases: ['gynecologie', 'gynécologie et obstétrique', 'maternite', 'maternité']
  },
  {
    id: 'Pédiatrie',
    name: 'Pédiatrie & Néonatologie',
    shortName: 'Pédiatrie',
    icon: 'fa-child',
    description: 'Consultations, vaccinations et urgences pédiatriques du nouveau-né à l’adolescent.',
    aliases: ['pediatrie']
  },
  {
    id: 'Médecine interne',
    name: 'Médecine Interne & Diabétologie',
    shortName: 'Médecine interne',
    icon: 'fa-stethoscope',
    description: 'Pathologies générales, diabète, endocrinologie, drépanocytose et maladies infectieuses.',
    aliases: ['medecine-interne', 'endocrinologie', 'infectieuse']
  },
  {
    id: 'Chirurgie',
    name: 'Chirurgie Générale & Orthopédie',
    shortName: 'Chirurgie',
    icon: 'fa-bone',
    description: 'Chirurgie viscérale, traumatologie, orthopédie, rhumatologie et urologie (6 blocs opératoires).',
    aliases: ['chirurgie-generale', 'chirurgie-orthopedique', 'rhumatologie', 'urologie']
  },
  {
    id: 'Ophtalmologie',
    name: 'Ophtalmologie',
    shortName: 'Ophtalmologie',
    icon: 'fa-eye',
    description: 'Troubles de la vision, cataracte, glaucome, fond d’œil et chirurgie oculaire.',
    aliases: ['ophtalmologie']
  },
  {
    id: 'ORL & Odontologie',
    name: 'ORL & Soins Dentaires',
    shortName: 'ORL / Dentaire',
    icon: 'fa-tooth',
    description: 'Oto-rhino-laryngologie (oreilles, nez, gorge) et chirurgie dentaire / odontologie.',
    aliases: ['orl', 'odontologie', 'oto-rhino-laryngologie (orl)']
  },
  {
    id: 'Dermatologie',
    name: 'Dermatologie',
    shortName: 'Dermatologie',
    icon: 'fa-allergies',
    description: 'Maladies de la peau, allergies cutanées, infections dermatologiques et suivi spécialisé.',
    aliases: ['dermatologie']
  },
  {
    id: 'Gastro-entérologie',
    name: 'Gastro-entérologie & Hépatologie',
    shortName: 'Gastro-entérologie',
    icon: 'fa-notes-medical',
    description: 'Troubles digestifs, estomac, foie, endoscopie digestive et suivi hépatique.',
    aliases: ['gastro', 'hepatologie', 'hépatologie']
  },
  {
    id: 'Santé Mentale',
    name: 'Psychiatrie & Santé Mentale',
    shortName: 'Santé Mentale',
    icon: 'fa-brain',
    description: 'Accompagnement psychiatrique, psychologique, gestion du stress et troubles du sommeil.',
    aliases: ['psychiatrie', 'psychiatrie et santé mentale']
  },
  {
    id: 'Urgences',
    name: 'Urgences & Orientation',
    shortName: 'Urgences',
    icon: 'fa-ambulance',
    description: 'Accueil d’urgence 24h/24 et 7j/7 (30 lits médicalisés) et consultations rapides.',
    aliases: ['urgences', "médecine d'urgence"]
  },
  {
    id: 'Autre',
    name: 'Autre Spécialité / Bilan',
    shortName: 'Autre',
    icon: 'fa-briefcase-medical',
    description: 'Imagerie médicale, laboratoire, médecine du travail, rééducation ou orientation générale.',
    aliases: ['autre', 'travail']
  }
];

export function normalizeSpecialtyMatch(aptSpecialty?: string, doctorSpecialty?: string): boolean {
  if (!doctorSpecialty) return true;
  if (!aptSpecialty) return false;
  const a = aptSpecialty.trim().toLowerCase();
  const d = doctorSpecialty.trim().toLowerCase();
  if (a === d) return true;

  const found = BOOKING_SPECIALTIES.find(
    s => s.id.toLowerCase() === d || s.shortName.toLowerCase() === d
  );
  if (found) {
    if (found.name.toLowerCase() === a || found.shortName.toLowerCase() === a) return true;
    if (found.aliases?.some(alias => alias.toLowerCase() === a)) return true;
  }
  return false;
}

export function resolveSpecialtyFromQuery(rawParam: string | null): string | null {
  if (!rawParam) return null;
  const q = rawParam.trim().toLowerCase();
  for (const spec of BOOKING_SPECIALTIES) {
    if (
      spec.id.toLowerCase() === q ||
      spec.name.toLowerCase() === q ||
      spec.shortName.toLowerCase() === q ||
      spec.aliases?.some(a => a.toLowerCase() === q)
    ) {
      return spec.id;
    }
  }
  // Partial match
  const partial = BOOKING_SPECIALTIES.find(
    s =>
      s.id.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      q.includes(s.id.toLowerCase())
  );
  return partial ? partial.id : null;
}
