import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { UrbanBpmnEditor, referenceOf } from '../../src/index.ts';

import orderProcessXml from '../fixtures/order-process.bpmn?raw';

// a collaboration with one participant already attached to a host key
const COLLABORATION_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:urban="https://github.com/gaelgael5/urban-bpmn/schema/1.0"
                  id="Definitions_collab"
                  targetNamespace="https://github.com/gaelgael5/urban-bpmn/schema/1.0">
  <bpmn:collaboration id="Collaboration_vente">
    <bpmn:participant id="Participant_acheteur" name="Acheteur">
      <bpmn:extensionElements>
        <urban:reference cle="ROL-ACHETEUR" type="role" />
      </bpmn:extensionElements>
    </bpmn:participant>
  </bpmn:collaboration>
  <bpmndi:BPMNDiagram id="BPMNDiagram_collab">
    <bpmndi:BPMNPlane id="BPMNPlane_collab" bpmnElement="Collaboration_vente">
      <bpmndi:BPMNShape id="Participant_acheteur_di" bpmnElement="Participant_acheteur" isHorizontal="true">
        <dc:Bounds x="100" y="60" width="400" height="60" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;

// a collaboration with an expanded participant (process), for lanes
const POOL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  id="Definitions_pool"
                  targetNamespace="https://github.com/gaelgael5/urban-bpmn/schema/1.0">
  <bpmn:collaboration id="Collaboration_pool">
    <bpmn:participant id="Participant_vente" name="Vente" processRef="Process_vente" />
  </bpmn:collaboration>
  <bpmn:process id="Process_vente" isExecutable="false" />
  <bpmndi:BPMNDiagram id="BPMNDiagram_pool">
    <bpmndi:BPMNPlane id="BPMNPlane_pool" bpmnElement="Collaboration_pool">
      <bpmndi:BPMNShape id="Participant_vente_di" bpmnElement="Participant_vente" isHorizontal="true">
        <dc:Bounds x="100" y="60" width="600" height="250" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;

function makeContainer() {
  const container = document.createElement('div');
  container.style.width = '1000px';
  container.style.height = '600px';
  document.body.appendChild(container);

  return container;
}

function elementWithKey(editor, cle) {
  return editor.getDiagram().get('elementRegistry').filter(
    (element) => !element.labelTarget &&
      referenceOf(element.businessObject)?.cle === cle
  )[0];
}

describe('boîte à outils fournie par l\'hôte', () => {

  let container, editor;

  afterEach(() => {
    editor.destroy();
    container.remove();
  });

  beforeEach(() => {
    container = makeContainer();
  });

  // critère 1
  it('les groupes de l\'hôte s\'affichent dans l\'ordre, la recherche filtre', async () => {
    const toolbox = vi.fn(() => [
      {
        id: 'processus',
        libelle: 'Liés au processus',
        outils: [
          { cle: 'ROL-VENDEUR', libelle: 'Vendeur', icone: '<svg viewBox="0 0 10 10"></svg>' },
          { cle: 'ROL-ACHETEUR', libelle: 'Acheteur' }
        ]
      },
      {
        id: 'autres',
        libelle: 'Autres objets',
        outils: [
          { cle: 'DS-COMMANDES', libelle: 'Commandes', icone: 'data:image/svg+xml,<svg/>' }
        ]
      }
    ]);

    editor = new UrbanBpmnEditor({ container, delegates: { toolbox } });

    await editor.load(orderProcessXml);

    expect(toolbox).toHaveBeenCalledWith({ palette: 'atelier' });

    const titles = [ ...container.querySelectorAll('.ub-toolbox-groupe-titre') ]
      .map((title) => title.textContent);

    expect(titles).toEqual([ 'Liés au processus', 'Autres objets' ]);

    const tools = [ ...container.querySelectorAll('.ub-outil') ];

    expect(tools.map((tool) => tool.dataset.cle))
      .toEqual([ 'ROL-VENDEUR', 'ROL-ACHETEUR', 'DS-COMMANDES' ]);
    expect(tools[0].textContent).toContain('Vendeur');
    expect(tools[0].querySelector('.ub-outil-icone svg')).toBeTruthy();
    expect(tools[2].querySelector('.ub-outil-icone img')).toBeTruthy();

    // la recherche filtre
    const search = container.querySelector('.ub-toolbox-recherche');
    search.value = 'vend';
    search.dispatchEvent(new Event('input'));

    const filtered = [ ...container.querySelectorAll('.ub-outil') ];

    expect(filtered.map((tool) => tool.dataset.cle)).toEqual([ 'ROL-VENDEUR' ]);
  });

  // critère 2
  it('poser un participant crée une piscine boîte noire rattachée', async () => {
    editor = new UrbanBpmnEditor({
      container,
      delegates: {
        drop: () => ({ nom: 'Transporteur', type: 'partenaire', genre: 'participant' })
      }
    });

    await editor.load(orderProcessXml);
    await editor.drop('PAR-TRANSPORTEUR');

    const participant = elementWithKey(editor, 'PAR-TRANSPORTEUR');

    expect(participant).toBeTruthy();
    expect(participant.businessObject.$type).toBe('bpmn:Participant');
    expect(participant.businessObject.name).toBe('Transporteur');

    // boîte noire : pas de processus associé
    expect(participant.businessObject.processRef).toBeFalsy();
  });

  // critère 3
  it('poser un rôle dans une piscine crée un couloir rattaché', async () => {
    editor = new UrbanBpmnEditor({
      container,
      delegates: {
        drop: () => ({ nom: 'Vendeur', type: 'role', genre: 'couloir' })
      }
    });

    await editor.load(POOL_XML);
    await editor.drop('ROL-VENDEUR');

    const lane = elementWithKey(editor, 'ROL-VENDEUR');

    expect(lane).toBeTruthy();
    expect(lane.businessObject.$type).toBe('bpmn:Lane');
    expect(lane.businessObject.name).toBe('Vendeur');

    const { xml } = await editor.save();

    expect(xml).toContain('<urban:reference cle="ROL-VENDEUR"');
  });

  it('poser un couloir sans participant crée d\'abord un participant', async () => {
    editor = new UrbanBpmnEditor({
      container,
      delegates: {
        drop: () => ({ nom: 'Vendeur', type: 'role', genre: 'couloir' })
      }
    });

    await editor.load(orderProcessXml);
    await editor.drop('ROL-VENDEUR');

    const lane = elementWithKey(editor, 'ROL-VENDEUR');

    expect(lane).toBeTruthy();
    expect(lane.businessObject.$type).toBe('bpmn:Lane');
  });

  // critère 4
  it('poser une collaboration rattache le diagramme et propose les membres absents', async () => {
    editor = new UrbanBpmnEditor({
      container,
      delegates: {
        drop: () => ({
          nom: 'Vente en ligne',
          type: 'collaboration',
          genre: 'collaboration',
          membres: [
            { cle: 'ROL-ACHETEUR', nom: 'Acheteur', type: 'role', genre: 'participant' },
            { cle: 'ROL-VENDEUR', nom: 'Vendeur', type: 'role', genre: 'participant' }
          ]
        })
      }
    });

    await editor.load(COLLABORATION_XML);

    const pending = editor.drop('COL-VENTE');

    // le dialogue ne propose que le membre non posé
    await vi.waitFor(() => {
      if (!container.querySelector('.ub-dialogue')) {
        throw new Error('dialogue absent');
      }
    });

    const boxes = [ ...container.querySelectorAll('.ub-membre input') ];

    expect(boxes.map((box) => box.dataset.cle)).toEqual([ 'ROL-VENDEUR' ]);
    expect(boxes[0].checked).toBe(true);

    container.querySelector('.ub-membres-poser').click();

    await pending;

    // le membre coché est posé, rattaché
    const vendeur = elementWithKey(editor, 'ROL-VENDEUR');

    expect(vendeur).toBeTruthy();
    expect(vendeur.businessObject.$type).toBe('bpmn:Participant');

    // la collaboration elle-même est rattachée, sans forme nouvelle
    const rootRef = referenceOf(
      editor.getDiagram().get('canvas').getRootElement().businessObject
    );

    expect(rootRef?.cle).toBe('COL-VENTE');

    const { xml } = await editor.save();

    expect(xml).toContain('<urban:reference cle="COL-VENTE"');
  });

  it('reposer une collaboration demande confirmation puis remplace la référence', async () => {
    editor = new UrbanBpmnEditor({
      container,
      delegates: {
        drop: () => ({ nom: 'Autre vente', genre: 'collaboration' })
      }
    });

    await editor.load(COLLABORATION_XML);

    // première pose : rattache sans confirmation (pas encore de clé)
    await editor.drop('COL-VENTE');

    // seconde pose : confirmation demandée
    const pending = editor.drop('COL-REPRISE');

    await vi.waitFor(() => {
      if (!container.querySelector('.ub-dialogue-confirmer')) {
        throw new Error('confirmation absente');
      }
    });

    container.querySelector('.ub-dialogue-confirmer').click();

    await pending;

    const { xml } = await editor.save();

    expect(xml).toContain('<urban:reference cle="COL-REPRISE"');
    expect(xml).not.toContain('COL-VENTE');
  });

  // critères 5 et 6, via le parcours complet boîte → canevas
  it('armer un outil puis cliquer le canevas pose l\'élément ; une erreur de l\'hôte n\'en pose aucun', async () => {
    const drop = vi.fn()
      .mockImplementationOnce(() => ({
        nom: 'Commandes',
        type: 'dataset',
        genre: 'stockage-donnees',
        avertissement: { message: 'Objet archivé', action: { id: 'ouvrir', libelle: 'Ouvrir' } }
      }))
      .mockImplementationOnce(() => {
        throw new Error('objet introuvable côté hôte');
      });
    const action = vi.fn();

    editor = new UrbanBpmnEditor({
      container,
      delegates: {
        toolbox: () => [ {
          id: 'objets',
          outils: [ { cle: 'DS-COMMANDES', libelle: 'Commandes' } ]
        } ],
        drop,
        action
      }
    });

    await editor.load(orderProcessXml);

    const svg = container.querySelector('.ub-canvas svg');

    // 1er passage : pose + avertissement
    container.querySelector('.ub-outil[data-cle="DS-COMMANDES"]').click();
    svg.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 400, clientY: 300 }));

    await vi.waitFor(() => {
      if (!elementWithKey(editor, 'DS-COMMANDES')) {
        throw new Error('pas encore posé');
      }
    });

    expect(drop).toHaveBeenCalledTimes(1);
    expect(drop).toHaveBeenCalledWith('DS-COMMANDES');

    container.querySelector('.ub-avertissement-action').click();
    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith('DS-COMMANDES', 'ouvrir');

    // 2e passage : l'hôte échoue → rien n'est posé, le message s'affiche
    const before = editor.getDiagram().get('elementRegistry').getAll().length;

    container.querySelector('.ub-outil[data-cle="DS-COMMANDES"]').click();
    svg.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 420, clientY: 320 }));

    await vi.waitFor(() => {
      if (!container.querySelector('.ub-toolbox-erreur')) {
        throw new Error('erreur pas encore affichée');
      }
    });

    expect(container.querySelector('.ub-toolbox-statut').textContent)
      .toContain('objet introuvable côté hôte');
    expect(editor.getDiagram().get('elementRegistry').getAll().length).toBe(before);
  });
});
