/**
 * Demonstration host, in a neutral domain: processing an online
 * order. The page plays the host role: it owns the objects, fills
 * the toolbox, answers the drop / action / attach delegates with its
 * own data, and reads the XML back. The component knows none of it.
 */

import '../src/index.ts';

import type {
  CollaborationMembre,
  DropGenre,
  DropResult,
  ReferencedObject,
  ToolGroup
} from '../src/index.ts';

import type { UrbanBpmnElement } from '../src/index.ts';

import orderProcessXml from '../test/fixtures/order-process.bpmn?raw';
import autreOutilXml from '../test/fixtures/bpmn-io-complex.bpmn?raw';

interface ObjetHote extends ReferencedObject {
  genre: DropGenre;
  groupe: string;
  description: string;
}

// the host space of the demonstration
const OBJETS: ObjetHote[] = [
  { cle: 'ROL-CLIENT', nom: 'Client', type: 'role', genre: 'couloir', groupe: 'Rôles', description: 'Rôle : la personne qui passe la commande.' },
  { cle: 'ROL-VENTES', nom: 'Service des ventes', type: 'role', genre: 'couloir', groupe: 'Rôles', description: 'Rôle : l\'équipe qui vérifie et traite les commandes.' },
  { cle: 'OBJ-COMMANDE', nom: 'Commande', type: 'objet-metier', genre: 'objet-donnees', groupe: 'Objets métier', description: 'Objet métier : la commande et ses lignes.' },
  { cle: 'OBJ-FACTURE', nom: 'Facture', type: 'objet-metier', genre: 'objet-donnees', groupe: 'Objets métier', description: 'Objet métier : la facture émise après expédition.' },
  { cle: 'APP-BOUTIQUE', nom: 'Boutique en ligne', type: 'application', genre: 'participant', groupe: 'Applications', description: 'Application : le site marchand qui enregistre les commandes.' },
  { cle: 'COL-VENTE-EN-LIGNE', nom: 'Vente en ligne', type: 'collaboration', genre: 'collaboration', groupe: 'Collaborations', description: 'Collaboration : la vente en ligne et ses participants.' }
];

const ICONE = (couleur: string) =>
  `<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="6" fill="${ couleur }"/></svg>`;

const COULEURS: Record<string, string> = {
  'Rôles': '#0b6e6a',
  'Objets métier': '#8a5a00',
  'Applications': '#1a4f8a',
  'Collaborations': '#6b3fa0'
};

const editeur = document.getElementById('editeur') as UrbanBpmnElement;
const statut = document.getElementById('statut')!;
const panneauXml = document.getElementById('panneau-xml')!;

function dire(message: string): void {
  statut.textContent = message;
}

// ---------------------------------------------------------------------------
// delegates: the host answers with its own data
// ---------------------------------------------------------------------------

function toolbox(): ToolGroup[] {
  const groupes = new Map<string, ToolGroup>();

  for (const objet of OBJETS) {
    if (!groupes.has(objet.groupe)) {
      groupes.set(objet.groupe, { id: objet.groupe, libelle: objet.groupe, outils: [] });
    }

    groupes.get(objet.groupe)!.outils.push({
      cle: objet.cle,
      libelle: objet.nom,
      icone: ICONE(COULEURS[objet.groupe] || '#666'),
      description: objet.description
    });
  }

  return [ ...groupes.values() ];
}

function drop(cle: string): DropResult {
  const objet = OBJETS.find((candidat) => candidat.cle === cle);

  if (!objet) {
    throw new Error(`objet inconnu côté hôte : ${ cle }`);
  }

  const result: DropResult = {
    nom: objet.nom,
    type: objet.type,
    genre: objet.genre
  };

  if (objet.genre === 'collaboration') {
    result.membres = OBJETS
      .filter((membre) => membre.genre === 'couloir' || membre.genre === 'participant')
      .map((membre): CollaborationMembre => ({
        cle: membre.cle,
        nom: membre.nom,
        type: membre.type,
        genre: 'participant'
      }));
  }

  if (objet.cle === 'OBJ-FACTURE') {
    result.avertissement = {
      message: 'La facture est en cours de révision côté hôte.',
      action: { id: 'ouvrir', libelle: 'Ouvrir dans l\'hôte' }
    };
  }

  return result;
}

function action(cle: string, actionId: string): void {
  dire(`L'hôte reçoit l'action « ${ actionId } » pour ${ cle }.`);
}

// the fake host picker for « Rattacher… »
function attach(): Promise<ReferencedObject | null> {
  const dialogue = document.getElementById('selecteur-hote') as HTMLDialogElement;
  const liste = document.getElementById('selecteur-liste')!;
  const annuler = document.getElementById('selecteur-annuler')!;

  liste.innerHTML = '';

  return new Promise((resolve) => {
    const fermer = (choix: ReferencedObject | null) => {
      dialogue.close();
      resolve(choix);
    };

    for (const objet of OBJETS) {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'objet';
      bouton.textContent = `${ objet.nom } — ${ objet.cle }`;
      bouton.addEventListener('click', () =>
        fermer({ cle: objet.cle, nom: objet.nom, type: objet.type }), { once: true });
      liste.appendChild(bouton);
    }

    annuler.addEventListener('click', () => fermer(null), { once: true });

    dialogue.showModal();
  });
}

editeur.delegates = { toolbox, drop, action, attach };

// ---------------------------------------------------------------------------
// host controls
// ---------------------------------------------------------------------------

async function rafraichirXml(): Promise<void> {
  if (!document.body.classList.contains('xml-visible')) {
    return;
  }

  const { xml } = await editeur.save();

  panneauXml.textContent = xml;
}

async function chargerExemple(): Promise<void> {
  await editeur.loadXml(orderProcessXml, {
    references: OBJETS.map(({ cle, nom, type }) => ({ cle, nom, type }))
  });

  dire('Processus d\'exemple chargé.');
  void rafraichirXml();
}

document.getElementById('charger-exemple')!.addEventListener('click', () => {
  void chargerExemple();
});

document.getElementById('charger-import')!.addEventListener('click', async () => {
  const { warnings } = await editeur.loadXml(autreOutilXml);

  dire(warnings.length
    ? `Fichier importé avec ${ warnings.length } avertissement(s).`
    : 'Fichier d\'un autre outil importé sans perte.');
  void rafraichirXml();
});

document.getElementById('lecture-seule')!.addEventListener('change', (event) => {
  editeur.readOnly = (event.target as HTMLInputElement).checked;
});

document.getElementById('palette')!.addEventListener('change', (event) => {
  editeur.palette = (event.target as HTMLSelectElement).value as 'atelier' | 'complete';
});

document.getElementById('voir-xml')!.addEventListener('click', () => {
  document.body.classList.toggle('xml-visible');
  void rafraichirXml();
});

document.getElementById('telecharger-svg')!.addEventListener('click', async () => {
  const svg = await editeur.exportSvg();
  const blob = new Blob([ svg ], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  const lien = document.createElement('a');
  lien.href = url;
  lien.download = 'processus.svg';
  lien.click();

  URL.revokeObjectURL(url);
});

// the displayed XML follows every modification
editeur.addEventListener('changed', () => {
  void rafraichirXml();
});

editeur.addEventListener('selection', ((event: CustomEvent) => {
  const { elementId, cle } = (event.detail || {}) as { elementId?: string, cle?: string };

  if (elementId) {
    dire(cle ? `${ elementId } — rattaché à ${ cle }` : elementId);
  } else {
    dire('');
  }
}) as EventListener);

void chargerExemple();
