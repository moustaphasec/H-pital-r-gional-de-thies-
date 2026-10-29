# Hôpital Régional El Hadji Ahmadou Sakhir Ndiéguène de Thiès — Plateforme Officielle

Plateforme numérique hospitalière complète (**Mobile-First**, **PWA Hors-Ligne**, **Temps Réel**) conçue pour l'**Hôpital Régional El Hadji Ahmadou Sakhir Ndiéguène de Thiès** (Sénégal).

## Fonctionnalités Clés

### 1. Portail Patient & Prise de Rendez-vous Intelligente
- **Réservation en 3 étapes (< 1 minute)** : choix parmi 13 pôles de consultation, filtrage automatique des dimanches, horaires du samedi matin (`08h00 - 11h00`), masquage des heures déjà écoulées aujourd'hui et **anti-double réservation** en temps réel (`booked_slots`).
- **Adapté aux réalités locales** : adresse e-mail **100 % optionnelle**, validation des numéros sénégalais (`70`, `75`, `76`, `77`, `78`, `33`) et internationaux, génération immédiate d'un **Code de Suivi unique (`RDV-XXXXXX`)**, bouton de copie en 1 clic et **reçu imprimable / PDF**.
- **Suivi de dossier (`suivi.html`)** : recherche par code `RDV-...`, mémorisation locale sur le téléphone du patient (consultable même hors-ligne), annulation avec libération automatique du créneau.
- **Assistant Médical IA Hybride** : orientation symptomatique en français (avec reconnaissance d'expressions courantes au Sénégal), détection immédiate des urgences vitales (`+221 33 952 10 90` / SAMU `1515`), fonctionnel **en ligne (Google Gemini)** comme **100 % hors-ligne (moteur clinique embarqué)**.

### 2. Espace Médecin (`doctor.html`) & Espace Administration (`admin.html`)
- **Cloisonnement strict par spécialité** : chaque praticien ne voit que les patients de son propre service.
- **Alarme Sonore & Vocale Temps Réel** : double carillon haute priorité (Web Audio API compatible iOS/Android/PC) + sonnerie + **annonce vocale en français** dès l'arrivée d'un nouveau rendez-vous, avec bouton de test/activation sonore.
- **IA Copilot Clinique** : pré-analyse instantanée du motif de consultation (niveau d'urgence, constantes à préparer, questions d'anamnèse ciblées).
- **Outils de gestion** : onglet *Aujourd'hui*, recherche instantanée, filtres par statut et spécialité, **relance/confirmation WhatsApp en 1 clic**, **export CSV (Excel)**, impression de la feuille de vacation et gestion des **Messages Contact**.

### 3. Performance PWA Hors-Ligne & Sécurité (Conformité CDP Sénégal)
- **Progressive Web App (Workbox + Firestore IndexedDB)** : chargement quasi instantané, cache hors-ligne complet (CSS Tailwind compilé localement sans CDN bloquant, icônes, audio `notification.ogg`, pages HTML) et synchronisation automatique au retour de la connexion 3G/4G/Wi-Fi.
- **Sécurité des données de santé** : aucune donnée personnelle exposée publiquement ; les créneaux occupés sont vérifiés via une collection anonymisée `booked_slots`, et les règles `firestore.rules` valident strictement les schémas d'écriture.

---

## Démarrage Rapide en Local

### Prérequis
- **Node.js** 18+ et `npm`

### Installation & Lancement
```bash
npm install
npm run dev
```
L'application est accessible sur `http://localhost:3000`.

### Vérification TypeScript & Build de Production
```bash
npm run lint
npm run build
```

---

## Déploiement des Règles de Sécurité Firebase
Copiez le contenu du fichier [`firestore.rules`](./firestore.rules) dans **Firebase Console > Firestore Database > Règles**, puis cliquez sur **Publier**.
