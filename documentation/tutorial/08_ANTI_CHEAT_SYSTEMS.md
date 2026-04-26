# 08 - Systèmes Anti-Triche et Résilience

Dès que vous introduisez un aspect concurrentiel (marché, notes classées, monnaie), l'énergie créative des étudiants va se tourner vers le hack du système. C'est normal, c'est même le but d'un enseignement lié à la technologie ou à l'entreprenariat. 
Cependant, l'architecture doit empêcher les failles critiques.

## 1. Firestore Rules (La Base)
Tout le système repose sur Firestore. Les règles (`firestore.rules`) sont paranoïaques :
- Aucun étudiant ne peut modifier son `role` en "admin".
- Aucun étudiant ne peut écrire dans la base de VE d'une autre agence.
- Un virement P2P (Paiement) impose une règle transactionnelle (Atomicité) : vérifier que le solde est supérieur au montant du virement. Les "double-spences" sont impossibles au niveau base de données.

## 2. Le Cartel des Évaluations (Collusion)
Lors des évaluations par les pairs (Peer Review), deux agences pourraient s'entendre : *"Je te mets 100/100, tu me mets 100/100".*
**Solution algorithmique :**
- L'application calcule la déviation standard de toutes les notes reçues par un projet.
- Une note d'évaluation donnée par une autre agence est affectée par un poids de confiance dépendant du propre VE de l'évaluateur (Maitrise de l’algorithme de note, voir Manuel 07).
- Le Game Master a un Dashboard d'Audit (Audit des Notes) où l'IA signale les anomalies : "L'agence X a mis un 100 suspect à l'agence Y alors que la moyenne de la classe sur ce livrable est de 45".

## 3. Le Blanchiment de PiXi
Les étudiants pourraient licencier un membre (Unemployed Pool) pour qu'il soit embauché par une agence riche, qu'il prenne un gros salaire, et qu'il le re-transfère en P2P à son ancienne pauvre agence pour l'aider.
**Réponse Pédagogique :**
Laissez-les faire. "It's not a bug, it's a feature". Cela s'appelle de la finance occulte (Dark Finance). Le temps "perdu" à orchestrer ce schéma est du temps d'apprentissage cognitif.
Si cela devient hors de contrôle : lancez une "Black Ops : Audit de Tracfin" sur les agences concernées et supprimez 50% de leurs avoirs via une amende admin.

## 4. Exploitation du Front-End (Client-Side Hacking)
Rappel de sécurité de base en Single Page Application (React) : L'UI n'est que de la peinture. 
Même si un étudiant ouvre les devtools du navigateur pour modifier l'état Redux/Context (ex: s'ajouter 10,000 PiXi sur le rendu visuel), la validation de paiement réelle vers Firebase sera rejetée car la base de données vérifiera le vrai solde avant de transférer. Tout ce passe sur l'authorisation des *Rules* Firestore via le "Single Source Of Truth".
