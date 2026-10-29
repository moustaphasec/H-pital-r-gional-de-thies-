const config = {
  specialties: [
    {
      id: "nephrologie",
      bookingId: "Néphrologie",
      name: "Néphrologie et Dialyse",
      icon: "kidney",
      description: "Prise en charge spécialisée des affections rénales et centre d'hémodialyse équipé de 23 postes modernes."
    },
    {
      id: "cardiologie",
      bookingId: "Cardiologie",
      name: "Cardiologie",
      icon: "heartbeat",
      description: "Diagnostic et suivi des maladies cardiovasculaires, hypertension artérielle, ECG et échocardiographie."
    },
    {
      id: "medecine-interne",
      bookingId: "Médecine interne",
      name: "Médecine interne",
      icon: "stethoscope",
      description: "Prise en charge globale des pathologies complexes, maladies systémiques et suivi de la drépanocytose."
    },
    {
      id: "gynecologie",
      bookingId: "Gynécologie",
      name: "Gynécologie et Obstétrique",
      icon: "baby",
      description: "Suivi de grossesse, maternité sécurisée 24h/24, échographie obstétricale et soins gynécologiques."
    },
    {
      id: "pediatrie",
      bookingId: "Pédiatrie",
      name: "Pédiatrie",
      icon: "child",
      description: "Consultations, vaccinations, néonatologie et urgences pédiatriques de la naissance à l'adolescence."
    },
    {
      id: "chirurgie-generale",
      bookingId: "Chirurgie",
      name: "Chirurgie générale",
      icon: "procedures",
      description: "Interventions chirurgicales programmées et d'urgence au sein de six salles d'opération équipées."
    },
    {
      id: "chirurgie-orthopedique",
      bookingId: "Chirurgie",
      name: "Chirurgie orthopédique",
      icon: "bone",
      description: "Traumatologie, fractures, prothèses et chirurgie réparatrice de l'appareil locomoteur."
    },
    {
      id: "urgences",
      bookingId: "Urgences",
      name: "Médecine d'urgence",
      icon: "ambulance",
      description: "Service réhabilité de 30 lits ouvert 24h/24 et 7j/7 pour toutes les urgences médico-chirurgicales."
    },
    {
      id: "infectieuse",
      bookingId: "Médecine interne",
      name: "Médecine infectieuse",
      icon: "virus",
      description: "Diagnostic, prévention et traitement des pathologies infectieuses et tropicales."
    },
    {
      id: "endocrinologie",
      bookingId: "Médecine interne",
      name: "Endocrinologie & Diabète",
      icon: "tint",
      description: "Suivi personnalisé du diabète, des troubles thyroïdiens et des maladies métaboliques."
    },
    {
      id: "gastro",
      bookingId: "Gastro-entérologie",
      name: "Gastro-entérologie",
      icon: "stomach",
      description: "Exploration fonctionnelle digestive, endoscopie et traitement des affections gastro-intestinales."
    },
    {
      id: "hepatologie",
      bookingId: "Gastro-entérologie",
      name: "Hépatologie",
      icon: "liver",
      description: "Dépistage et prise en charge spécialisée des hépatites et des maladies chroniques du foie."
    },
    {
      id: "rhumatologie",
      bookingId: "Chirurgie",
      name: "Rhumatologie",
      icon: "crutch",
      description: "Prise en charge des douleurs articulaires, de l'arthrose et des rhumatismes inflammatoires."
    },
    {
      id: "urologie",
      bookingId: "Chirurgie",
      name: "Urologie",
      icon: "kidneys",
      description: "Diagnostic et chirurgie des affections de l'appareil urinaire masculin et féminin."
    },
    {
      id: "ophtalmologie",
      bookingId: "Ophtalmologie",
      name: "Ophtalmologie",
      icon: "eye",
      description: "Bilan visuel complet, dépistage du glaucome, chirurgie de la cataracte et soins oculaires."
    },
    {
      id: "orl",
      bookingId: "ORL & Odontologie",
      name: "Oto-rhino-laryngologie (ORL)",
      icon: "ear",
      description: "Soins médicaux et chirurgicaux des affections de l'oreille, du nez, des sinus et de la gorge."
    },
    {
      id: "odontologie",
      bookingId: "ORL & Odontologie",
      name: "Odontologie & Soins Dentaires",
      icon: "tooth",
      description: "Chirurgie dentaire, soins conservateurs, détartrage, prothèses et urgences bucco-dentaires."
    },
    {
      id: "dermatologie",
      bookingId: "Dermatologie",
      name: "Dermatologie",
      icon: "allergies",
      description: "Consultations spécialisées pour les maladies de la peau, des ongles, du cuir chevelu et les allergies."
    },
    {
      id: "psychiatrie",
      bookingId: "Santé Mentale",
      name: "Psychiatrie et santé mentale",
      icon: "brain",
      description: "Écoute bienveillante, suivi psychiatrique et soutien psychologique en toute confidentialité."
    },
    {
      id: "travail",
      bookingId: "Autre",
      name: "Médecine du travail",
      icon: "briefcase-medical",
      description: "Visites médicales d'aptitude, prévention des risques professionnels et bilans de santé."
    }
  ]
};
if (typeof window !== "undefined") { window.config = config; }
export default config;
