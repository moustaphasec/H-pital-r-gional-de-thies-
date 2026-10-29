import { GoogleGenerativeAI } from '@google/generative-ai';
import { escapeHtml } from './firebase';

const metaEnv = (import.meta as any).env || {};
const rawKey: string = (metaEnv.VITE_GEMINI_API_KEY || '').trim();
// Les clés Google AI Studio valides commencent par "AIza"
const hasValidGeminiKey = rawKey.startsWith('AIza') && rawKey.length >= 30;
const genAI = hasValidGeminiKey ? new GoogleGenerativeAI(rawKey) : null;

export function formatMarkdownToSafeHtml(markdownText: string): string {
  const safe = escapeHtml(markdownText);
  return safe
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4 style="margin:10px 0 4px;font-weight:700;">$1</h4>')
    .replace(/^## (.+)$/gm, '<h4 style="margin:12px 0 6px;font-weight:700;">$1</h4>')
    .replace(/^- (.+)$/gm, '• $1')
    .replace(/\n/g, '<br>');
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

interface TriageRule {
  keywords: string[];
  specialtyId: string;
  specialtyLabel: string;
  advice: string;
}

const TRIAGE_RULES: TriageRule[] = [
  {
    keywords: ['coeur', 'cardiaque', 'palpitation', 'tension', 'hypertension', 'hta', 'essoufflement', 'pouls'],
    specialtyId: 'Cardiologie',
    specialtyLabel: 'Cardiologie & HTA',
    advice: 'Vos symptômes relèvent d’un bilan cardiovasculaire (prise de tension artérielle, ECG ou avis cardiologique).'
  },
  {
    keywords: ['rein', 'renale', 'dialyse', 'urine', 'urinaire', 'oedeme', 'gonflement des pieds'],
    specialtyId: 'Néphrologie',
    specialtyLabel: 'Néphrologie & Dialyse',
    advice: 'L’Hôpital Régional de Thiès dispose d’un centre de référence en Néphrologie équipé de 23 postes d’hémodialyse.'
  },
  {
    keywords: ['grossesse', 'enceinte', 'accouchement', 'maternite', 'gyneco', 'regles', 'prenatal', 'echographie obstetricale'],
    specialtyId: 'Gynécologie',
    specialtyLabel: 'Gynécologie & Maternité',
    advice: 'Notre service de Gynécologie-Obstétrique assure le suivi prénatal, les échographies et les urgences maternité 24h/24.'
  },
  {
    keywords: ['enfant', 'bebe', 'nourrisson', 'pediatre', 'pediatrie', 'vaccin', 'vaccination'],
    specialtyId: 'Pédiatrie',
    specialtyLabel: 'Pédiatrie & Néonatologie',
    advice: 'Pour la santé des nourrissons et des enfants (fièvre, croissance, vaccination), orientez-vous vers la Pédiatrie.'
  },
  {
    keywords: ['oeil', 'yeux', 'vue', 'vision', 'flou', 'cataracte', 'glaucome', 'lunettes', 'ophtalmo'],
    specialtyId: 'Ophtalmologie',
    specialtyLabel: 'Ophtalmologie',
    advice: 'Une consultation ophtalmologique permettra d’examiner votre acuité visuelle et le fond d’œil.'
  },
  {
    keywords: ['dent', 'dentaire', 'carie', 'gencive', 'rage de dent', 'machoire', 'oreille', 'gorge', 'nez', 'angine', 'sinusite', 'bourdonnement', 'orl'],
    specialtyId: 'ORL & Odontologie',
    specialtyLabel: 'ORL & Soins Dentaires',
    advice: 'Nos spécialistes en ORL et Chirurgie Dentaire prennent en charge les affections bucco-dentaires, de l’oreille, du nez et de la gorge.'
  },
  {
    keywords: ['os', 'fracture', 'entorse', 'genou', 'articulation', 'rhumatisme', 'dos', 'lombaire', 'chirurgie', 'operation', 'hernie', 'appendicite'],
    specialtyId: 'Chirurgie',
    specialtyLabel: 'Chirurgie & Orthopédie',
    advice: 'Notre pôle chirurgical et orthopédique (6 salles d’opération modernes) évalue les traumatismes, douleurs articulaires et actes chirurgicaux.'
  },
  {
    keywords: ['peau', 'bouton', 'demangeaison', 'allergie', 'eczema', 'tache', 'dermato', 'eruption'],
    specialtyId: 'Dermatologie',
    specialtyLabel: 'Dermatologie',
    advice: 'Une consultation en Dermatologie permettra d’identifier précisément l’affection cutanée et d’adapter le traitement.'
  },
  {
    keywords: ['ventre', 'estomac', 'digestion', 'ulcere', 'gastrite', 'diarrhee', 'constipation', 'foie', 'hepatite', 'jaunisse'],
    specialtyId: 'Gastro-entérologie',
    specialtyLabel: 'Gastro-entérologie & Hépatologie',
    advice: 'Nos gastro-entérologues et hépatologues assurent le diagnostic des douleurs abdominales et troubles digestifs.'
  },
  {
    keywords: ['diabete', 'sucre', 'glycemie', 'thyroide', 'drepanocytose', 'fievre', 'palu', 'paludisme', 'fatigue', 'infection', 'toux'],
    specialtyId: 'Médecine interne',
    specialtyLabel: 'Médecine Interne & Diabétologie',
    advice: 'Le service de Médecine Interne assure le suivi global des pathologies infectieuses, du diabète et de la drépanocytose.'
  },
  {
    keywords: ['stress', 'anxiete', 'angoisse', 'insomnie', 'depression', 'psychiatre', 'psychologue', 'mental'],
    specialtyId: 'Santé Mentale',
    specialtyLabel: 'Psychiatrie & Santé Mentale',
    advice: 'Notre équipe de Santé Mentale offre une écoute confidentielle et bienveillante sur rendez-vous.'
  }
];

function localPatientAssistant(question: string): string {
  const q = normalizeText(question);

  // 1. Détection d'urgence vitale immédiate
  const emergencyKeywords = [
    'douleur poitrine', 'douleur thoracique', 'etouffe', 'respire mal', 'difficulte a respirer',
    'perte de connaissance', 'evanoui', 'inconscient', 'hemorragie', 'saignement abondant',
    'paralysie', 'avc', 'convulsion', 'accident grave', 'brulure grave', 'urgence vitale', 'empoisonnement'
  ];
  if (emergencyKeywords.some(k => q.includes(k))) {
    return `🚨 <strong>URGENCE MÉDICALE DÉTECTÉE</strong><br><br>` +
      `Ces signes nécessitent une prise en charge <strong>immédiate</strong>. Ne prenez pas un rendez-vous classique :<br>` +
      `• Rendez-vous immédiatement aux <strong>Urgences 24h/24 & 7j/7</strong> de l'Hôpital Régional de Thiès (Avenue Caen).<br>` +
      `• Appelez nos Urgences : <a href="tel:+221339521090" style="color:#38bdf8;font-weight:700;text-decoration:underline;">+221 33 952 10 90</a> ou le SAMU au <a href="tel:1515" style="color:#38bdf8;font-weight:700;text-decoration:underline;">1515</a>.`;
  }

  // 2. Orientation par symptômes / spécialité
  for (const rule of TRIAGE_RULES) {
    if (rule.keywords.some(k => q.includes(k))) {
      const link = `appointment.html?specialty=${encodeURIComponent(rule.specialtyId)}`;
      return `🩺 <strong>Orientation conseillée : ${escapeHtml(rule.specialtyLabel)}</strong><br><br>` +
        `${escapeHtml(rule.advice)}<br><br>` +
        `👉 <a href="${link}" style="color:#38bdf8;font-weight:700;text-decoration:underline;">Réserver un créneau en ${escapeHtml(rule.specialtyId)}</a><br>` +
        `<small style="opacity:0.8;">Information d'orientation — seul un médecin peut établir un diagnostic médical.</small>`;
    }
  }

  // 3. Questions sur la prise de rendez-vous
  if (q.includes('rendez-vous') || q.includes('rdv') || q.includes('reserver') || q.includes('consultation')) {
    if (q.includes('suivre') || q.includes('code') || q.includes('annuler') || q.includes('statut') || q.includes('verifier')) {
      return `🔍 <strong>Suivi ou annulation de rendez-vous :</strong><br>` +
        `Munissez-vous de votre code (ex: <code>RDV-XXXXX</code>) et rendez-vous sur la page <a href="suivi.html" style="color:#38bdf8;font-weight:700;text-decoration:underline;">Suivre mon RDV</a>. Vous pourrez y vérifier la confirmation du médecin ou annuler gratuitement.`;
    }
    return `📅 <strong>Prendre rendez-vous en 1 minute :</strong><br>` +
      `1. Choisissez la spécialité médicale<br>` +
      `2. Sélectionnez la date et l'heure disponible<br>` +
      `3. Indiquez votre nom et votre numéro de téléphone (l'email est <em>optionnel</em>).<br><br>` +
      `👉 <a href="appointment.html" style="color:#38bdf8;font-weight:700;text-decoration:underline;">Ouvrir le formulaire de rendez-vous</a>`;
  }

  // 4. Suivi / Code RDV
  if (q.includes('suivi') || q.includes('suivre') || q.includes('annuler') || q.includes('rdv-')) {
    return `🔍 Vous pouvez vérifier l'état de votre demande ou l'annuler à tout moment grâce à votre code de suivi sur <a href="suivi.html" style="color:#38bdf8;font-weight:700;text-decoration:underline;">la page Suivi RDV</a>.`;
  }

  // 5. Horaires
  if (q.includes('horaire') || q.includes('heure') || q.includes('ouvert') || q.includes('ferme') || q.includes('samedi') || q.includes('dimanche')) {
    return `🕒 <strong>Horaires de l'Hôpital Régional de Thiès :</strong><br>` +
      `• <strong>Consultations :</strong> Lundi au Vendredi (08h00 – 18h00) & Samedi (08h00 – 12h00)<br>` +
      `• <strong>Urgences, Maternité & Garde :</strong> Ouverts <strong>24h/24 et 7j/7</strong> (y compris dimanches et jours fériés).`;
  }

  // 6. Adresse / Contact / Téléphone
  if (q.includes('adresse') || q.includes('ou se trouve') || q.includes('localisation') || q.includes('telephone') || q.includes('numero') || q.includes('contact') || q.includes('appeler')) {
    return `📍 <strong>Coordonnées de l'Hôpital :</strong><br>` +
      `• <strong>Adresse :</strong> Avenue Caen, Route de Dakar, Thiès, Sénégal<br>` +
      `• <strong>Standard / Urgences :</strong> <a href="tel:+221339521090" style="color:#38bdf8;font-weight:700;text-decoration:underline;">+221 33 952 10 90</a> / +221 33 952 10 91<br>` +
      `• <strong>Email :</strong> contact@hopital-regional-thies.sn`;
  }

  // 7. Tarifs, CMU, Mutuelle, Assurance, Documents
  if (q.includes('cmu') || q.includes('mutuelle') || q.includes('assurance') || q.includes('sesame') || q.includes('tarif') || q.includes('prix') || q.includes('payer') || q.includes('document') || q.includes('dossier') || q.includes('papier')) {
    return `🪪 <strong>Documents & Couverture Maladie :</strong><br>` +
      `L'établissement accepte les prises en charge <strong>CMU</strong>, mutuelles de santé, imputations budgétaires, assurances agréées et le <strong>Plan Sésame</strong>.<br><br>` +
      `<strong>À apporter le jour du RDV :</strong> Pièce d'identité (CNI), carnet de santé, carte mutuelle/CMU et vos anciens résultats d'examens.`;
  }

  // 8. Laboratoire / Imagerie / Scanner / Radio
  if (q.includes('scanner') || q.includes('radio') || q.includes('echographie') || q.includes('imagerie') || q.includes('analyse') || q.includes('laboratoire') || q.includes('prise de sang')) {
    return `🔬 <strong>Imagerie Médicale & Laboratoire :</strong><br>` +
      `L'hôpital dispose d'un plateau technique complet (Scanner, Radiologie, Échographie, Mammographie et Laboratoire d'analyses biologiques).<br>` +
      `👉 <a href="appointment.html?specialty=Autre" style="color:#38bdf8;font-weight:700;text-decoration:underline;">Demander un rendez-vous bilan / imagerie</a>`;
  }

  // 9. Salutations (Français & Wolof)
  if (/^(bonjour|bonsoir|salut|salam|assalam|nanga def|hello|coucou|merci|dieuredieuf|jerejef)\b/.test(q)) {
    if (q.includes('merci') || q.includes('dieuredieuf') || q.includes('jerejef')) {
      return `Avec grand plaisir ! Toute l'équipe de l'Hôpital Régional El Hadji Ahmadou Sakhir Ndiéguène de Thiès vous souhaite une excellente santé. N'hésitez pas si vous avez d'autres questions.`;
    }
    return `Bonjour et bienvenue (<em>Dalal ak Jàmm</em>) à l'<strong>Hôpital Régional de Thiès</strong> ! 👋<br><br>` +
      `Décrivez-moi vos symptômes pour savoir quel spécialiste consulter, ou demandez-moi nos horaires, nos services ou comment <a href="appointment.html" style="color:#38bdf8;font-weight:700;text-decoration:underline;">prendre rendez-vous</a>.`;
  }

  // 10. Réponse par défaut guidée
  return `Je suis l'assistant médical de l'<strong>Hôpital Régional de Thiès</strong>. Je peux vous aider à :<br>` +
    `• 🩺 <strong>Vous orienter</strong> si vous me décrivez vos symptômes (ex: <em>maux de tête, tension, enfant qui chauffe, mal aux yeux...</em>)<br>` +
    `• 📅 <a href="appointment.html" style="color:#38bdf8;font-weight:700;text-decoration:underline;">Prendre un rendez-vous en ligne</a><br>` +
    `• 🔍 <a href="suivi.html" style="color:#38bdf8;font-weight:700;text-decoration:underline;">Suivre un rendez-vous existant</a><br>` +
    `• 📞 Contacter les Urgences 24h/24 au <a href="tel:+221339521090" style="color:#38bdf8;font-weight:700;text-decoration:underline;">+221 33 952 10 90</a>.`;
}

export async function askMedicalAssistant(question: string): Promise<string> {
  if (genAI && typeof navigator !== 'undefined' && navigator.onLine) {
    const prompt = `Tu es l'assistant médical virtuel officiel de l'Hôpital Régional El Hadji Ahmadou Sakhir Ndiéguène de Thiès (Sénégal, Avenue Caen, Tél Urgences 24/7: +221 33 952 10 90, Consultations Lun-Ven 8h-18h et Sam 8h-12h).
Ton rôle : accueillir chaleureusement le patient, l'orienter vers le bon service de l'hôpital (Cardiologie, Néphrologie/Dialyse, Gynécologie-Maternité, Pédiatrie, Médecine interne, Chirurgie/Orthopédie, Ophtalmologie, ORL & Odontologie, Dermatologie, Gastro-entérologie, Santé Mentale, Urgences) et rappeler qu'un médecin posera le diagnostic définitif. Réponds en français clair et concis (maximum 110 mots).
Question du patient : ${question}`;

    for (const modelName of ['gemini-2.0-flash', 'gemini-1.5-flash']) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text && text.trim()) {
          return formatMarkdownToSafeHtml(text.trim());
        }
      } catch (err) {
        console.warn(`Fallback assistant local activé (${modelName}):`, err);
      }
    }
  }

  return localPatientAssistant(question);
}

function localDoctorCopilot(apt: {
  name?: string;
  specialty?: string;
  date?: string;
  timeSlot?: string;
  message?: string;
}): string {
  const msg = (apt.message || '').trim();
  const q = normalizeText(msg);
  const spec = apt.specialty || 'Médecine générale';

  // Évaluation des drapeaux rouges cliniques
  const redFlags: string[] = [];
  if (/douleur.*(poitrine|thorac)|oppression|essouffl|dyspnee/.test(q)) redFlags.push('Signes cardio-respiratoires à évaluer en priorité (ECG + SpO2 + TA)');
  if (/fievre|chauff|frisson|39|40/.test(q)) redFlags.push('Syndrome fébrile signalé (contrôle T°, goutte épaisse / TDR paludisme selon contexte)');
  if (/saign|hemorrag|sang/.test(q)) redFlags.push('Saignement mentionné (évaluer l’abondance et le retentissement hémodynamique)');
  if (/intense|aigu|insupportable|brutal|depuis ce matin/.test(q)) redFlags.push('Symptomatologie d’installation aiguë ou d’intensité élevée');
  if (/enceinte|grossesse/.test(q)) redFlags.push('Patiente enceinte / contexte obstétrical à prendre en compte pour toute prescription');
  if (/diabet|tension|hta|dialyse|asthme|drepanocyt/.test(q)) redFlags.push('Terrain chronique / comorbidité mentionné dans le motif');

  const priorityBadge = redFlags.length > 0
    ? '🟠 Priorité clinique : Vigilance recommandée (signes d’appel détectés)'
    : '🟢 Priorité clinique : Consultation programmée standard';

  // Questions ciblées selon la spécialité
  const specQuestionsMap: Record<string, string[]> = {
    'Cardiologie': [
      'Ancienneté, irradiation et facteurs déclenchants (effort vs repos) des symptômes ?',
      'Antécédents personnels/familiaux d’HTA, diabète, tabagisme ou cardiopathie et observance du traitement actuel ?',
      'Présence de dyspnée d’effort, orthopnée, palpitations, vertiges ou œdèmes des membres inférieurs ?'
    ],
    'Néphrologie': [
      'Évolution récente de la diurèse, aspect des urines (hématurie, mousse) et prise de poids / œdèmes ?',
      'Antécédents d’HTA, diabète, infections urinaires répétées ou prise récente d’AINS / phytothérapie néphrotoxique ?',
      'Derniers résultats de créatininémie, DFG, ionogramme sanguin et protéinurie ?'
    ],
    'Gynécologie': [
      'Date des dernières règles (DDR), terme gestationnel éventuel et antécédents gynéco-obstétricaux (G/P) ?',
      'Caractère des douleurs pelviennes, leucorrhées ou métrorragies éventuelles ?',
      'Suivi prénatal à jour (échographies, bilan biologique, prophylaxie martiale/TPI) ?'
    ],
    'Pédiatrie': [
      'Âge exact, poids actuel, statut vaccinal (PEV) et qualité de l’hydratation / alimentation de l’enfant ?',
      'Courbe thermique, signes associés (vomissements, diarrhée, toux, léthargie) ?',
      'Traitements déjà administrés à domicile et posologies ?'
    ],
    'Chirurgie': [
      'Mécanisme lésionnel ou mode d’installation de la douleur, impotence fonctionnelle associée ?',
      'Antécédents chirurgicaux, allergies médicamenteuses et traitements anticoagulants/antiagrégants ?',
      'Imagerie récente disponible (radiographie, échographie, scanner) ?'
    ],
    'Ophtalmologie': [
      'Baisse d’acuité visuelle brutale ou progressive, uni- ou bilatérale ?',
      'Douleur oculaire, rougeur, photophobie, corps flottants ou antécédent de glaucome/diabète ?',
      'Correction optique actuelle ou traumatisme oculaire récent ?'
    ]
  };

  const questions = specQuestionsMap[spec] || [
    'Mode de début, durée d’évolution et intensité des symptômes (EVA 0–10) ?',
    'Antécédents médicaux/chirurgicaux, terrain (HTA, diabète, drépanocytose, allergies) et traitements en cours ?',
    'Examens biologiques ou d’imagerie déjà réalisés avant la consultation ?'
  ];

  const motifSection = msg
    ? `Motif déclaré par le patient : **"${msg}"**`
    : `Aucun détail symptomatique n'a été saisi par le patient lors de la prise de rendez-vous en ligne. Prévoir un interrogatoire d'orientation complet dès l'accueil.`;

  const redFlagsSection = redFlags.length > 0
    ? `\n\n### Points de vigilance identifiés\n` + redFlags.map(r => `- ${r}`).join('\n')
    : '';

  return `## Synthèse Pré-Consultation (${spec})\n` +
    `**${priorityBadge}**\n\n` +
    `${motifSection}` +
    `${redFlagsSection}\n\n` +
    `### Questions d'anamnèse suggérées\n` +
    questions.map(item => `- ${item}`).join('\n') +
    `\n\n### Constantes & Préparation à l'accueil infirmier\n` +
    `- Prise systématique des constantes : TA, FC, T°, SpO2, poids/taille (et glycémie capillaire selon terrain).\n` +
    `- Vérifier le carnet de santé, les ordonnances en cours et les bilans antérieurs.\n\n` +
    `*Note : Synthèse générée par l'assistant d'aide à la décision clinique. L'examen clinique et la décision médicale relèvent exclusivement du praticien.*`;
}

export async function analyzePatientForDoctor(apt: {
  name?: string;
  specialty?: string;
  date?: string;
  timeSlot?: string;
  message?: string;
}): Promise<string> {
  if (genAI && typeof navigator !== 'undefined' && navigator.onLine) {
    const prompt = `Tu es un assistant médical d'aide à la préparation de consultation pour un médecin spécialiste en "${apt.specialty}" à l'Hôpital Régional de Thiès (Sénégal).
Patient : ${apt.name || 'Non renseigné'}
Date prévue : ${apt.date || '-'} ${apt.timeSlot ? 'à ' + apt.timeSlot : ''}
Motif / Symptômes décrits : "${apt.message || 'Aucun détail renseigné par le patient'}"

Rédige en français structuré (titres ## / ### et listes à puces) :
1. Niveau de vigilance clinique estimé
2. Pistes syndromiques ou points d'attention (adaptés au contexte épidémiologique sénégalais si pertinent)
3. 3 à 4 questions clés d'anamnèse à poser en consultation
4. Constantes / examens de première intention à préparer
Termine par une courte mention rappelant que le médecin garde l'entière responsabilité diagnostique.`;

    for (const modelName of ['gemini-2.0-flash', 'gemini-1.5-flash']) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text && text.trim()) {
          return formatMarkdownToSafeHtml(text.trim());
        }
      } catch (err) {
        console.warn(`Fallback IA Copilot local activé (${modelName}):`, err);
      }
    }
  }

  return formatMarkdownToSafeHtml(localDoctorCopilot(apt));
}
