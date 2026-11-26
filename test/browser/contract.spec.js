import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { BpmnModdle } from 'bpmn-moddle';

import { UrbanBpmnEditor, referenceOf } from '../../src/index.ts';

import orderProcessXml from '../fixtures/order-process.bpmn?raw';
import bpmnIoComplexXml from '../fixtures/bpmn-io-complex.bpmn?raw';

// a process whose XML carries a reference (urban:cle) with an outdated name
const ATTACHED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:urban="https://github.com/gaelgael5/urban-bpmn/schema/1.0"
                  id="Definitions_attache"
                  targetNamespace="https://github.com/gaelgael5/urban-bpmn/schema/1.0">
  <bpmn:process id="Process_attache" isExecutable="false">
    <bpmn:task id="Task_boutique" name="Ancien nom">
      <bpmn:extensionElements>
        <urban:reference cle="APP-BOUTIQUE" type="application" />
      </bpmn:extensionElements>
    </bpmn:task>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_attache">
    <bpmndi:BPMNPlane id="BPMNPlane_attache" bpmnElement="Process_attache">
      <bpmndi:BPMNShape id="Task_boutique_di" bpmnElement="Task_boutique">
        <dc:Bounds x="100" y="100" width="100" height="80" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;

/**
 * Snapshot of a BPMN XML for equivalence checks: every element id with
 * its type, plus the drawing (bounds per shape, waypoints per edge).
 */
async function snapshotOf(xml) {
  const moddle = new BpmnModdle();
  const { rootElement } = await moddle.fromXML(xml);

  const types = new Map();
  const drawing = new Map();
  const visited = new Set();

  (function walk(element) {
    if (!element || typeof element !== 'object' || visited.has(element)) {
      return;
    }

    visited.add(element);

    if (element.$type && element.id) {
      types.set(element.id, element.$type);

      if (element.$type === 'bpmndi:BPMNShape' && element.bounds) {
        const { x, y, width, height } = element.bounds;
        drawing.set(element.id, `${ x },${ y },${ width },${ height }`);
      }

      if (element.$type === 'bpmndi:BPMNEdge' && element.waypoint) {
        drawing.set(element.id, element.waypoint.map((p) => `${ p.x },${ p.y }`).join(' '));
      }
    }

    for (const key of Object.keys(element)) {
      if (key.startsWith('$')) {
        continue;
      }

      const value = element[key];
      const children = Array.isArray(value) ? value : [ value ];

      for (const child of children) {

        // follow containment only, not references
        if (child && child.$type && child.$parent === element) {
          walk(child);
        }
      }
    }
  })(rootElement);

  return { types, drawing };
}

describe('contrat du composant', () => {

  let container, editor;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '900px';
    container.style.height = '600px';
    document.body.appendChild(container);

    editor = new UrbanBpmnEditor({ container });
  });

  afterEach(() => {
    editor.destroy();
    container.remove();
  });

  // critère 1
  it('charger puis rendre sans modification donne un XML équivalent', async () => {
    await editor.load(orderProcessXml);

    const { xml } = await editor.save();

    const before = await snapshotOf(orderProcessXml);
    const after = await snapshotOf(xml);

    expect(Object.fromEntries(after.types)).toEqual(Object.fromEntries(before.types));
    expect(Object.fromEntries(after.drawing)).toEqual(Object.fromEntries(before.drawing));
  });

  // critère 2
  it('un XML de la démo bpmn.io se charge et se rend sans perte', async () => {
    await editor.load(bpmnIoComplexXml);

    // rendu effectif
    expect(container.querySelectorAll('.djs-shape').length).toBeGreaterThan(50);

    const { xml } = await editor.save();

    const before = await snapshotOf(bpmnIoComplexXml);
    const after = await snapshotOf(xml);

    expect(after.types.size).toBe(before.types.size);
    expect(Object.fromEntries(after.types)).toEqual(Object.fromEntries(before.types));
    expect(Object.fromEntries(after.drawing)).toEqual(Object.fromEntries(before.drawing));
  });

  // critère 3
  it('un élément rattaché affiche et exporte le nom à jour fourni par l\'hôte', async () => {
    await editor.load(ATTACHED_XML, {
      references: [
        { cle: 'APP-BOUTIQUE', nom: 'Boutique en ligne', type: 'application' }
      ]
    });

    const task = editor.getDiagram().get('elementRegistry').get('Task_boutique');

    // le nom affiché est celui de l'hôte, pas celui du XML
    expect(task.businessObject.name).toBe('Boutique en ligne');
    expect(container.textContent).toContain('Boutique en ligne');

    // la liste des objets référencés porte le nom à jour
    expect(editor.references).toEqual([
      { cle: 'APP-BOUTIQUE', nom: 'Boutique en ligne', type: 'application' }
    ]);

    // le XML rendu porte le nouveau nom, référence conservée
    const { xml } = await editor.save();

    expect(xml).toContain('Boutique en ligne');
    expect(xml).not.toContain('Ancien nom');
    expect(xml).toContain('<urban:reference cle="APP-BOUTIQUE"');
  });

  // critère 4
  it('poser un outil appelle le délégué de pose une fois, avec la clé', async () => {
    const drop = vi.fn(() => ({
      nom: 'Commandes',
      type: 'dataset',
      genre: 'stockage-donnees',
      avertissement: {
        message: 'Objet archivé',
        action: { id: 'ouvrir', libelle: 'Ouvrir' }
      }
    }));
    const action = vi.fn();

    editor.delegates = { drop, action };

    await editor.load(orderProcessXml);
    await editor.drop('DS-COMMANDES');

    expect(drop).toHaveBeenCalledTimes(1);
    expect(drop).toHaveBeenCalledWith('DS-COMMANDES');

    // l'élément créé est rattaché à la clé
    const created = editor.getDiagram().get('elementRegistry').filter(
      (element) => referenceOf(element.businessObject)?.cle === 'DS-COMMANDES'
    );

    expect(created.length).toBeGreaterThan(0);
    expect(created[0].businessObject.$type).toBe('bpmn:DataStoreReference');

    // l'avertissement est affiché ; son action appelle le délégué une fois
    const button = container.querySelector('.ub-avertissement-action');

    expect(container.querySelector('.ub-avertissement-message').textContent)
      .toBe('Objet archivé');
    expect(button).toBeTruthy();

    button.click();
    button.click();

    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith('DS-COMMANDES', 'ouvrir');
  });

  // critère 5
  it('chaque modification émet exactement un événement changed', async () => {
    await editor.load(orderProcessXml);

    const changed = vi.fn();
    editor.on('changed', changed);

    const diagram = editor.getDiagram();
    const registry = diagram.get('elementRegistry');

    diagram.get('modeling').updateProperties(registry.get('Task_review'), {
      name: 'Vérifier et valider'
    });

    expect(changed).toHaveBeenCalledTimes(1);

    editor.delegates = {
      drop: () => ({ nom: 'Commande', type: 'dataset', genre: 'objet-donnees' })
    };

    await editor.drop('OBJ-COMMANDE');

    expect(changed).toHaveBeenCalledTimes(2);
  });

  it('le chargement n\'émet pas d\'événement changed', async () => {
    const changed = vi.fn();
    editor.on('changed', changed);

    await editor.load(ATTACHED_XML, {
      references: [ { cle: 'APP-BOUTIQUE', nom: 'Boutique en ligne' } ]
    });

    expect(changed).not.toHaveBeenCalled();
  });

  // sélection
  it('sélectionner un élément émet un événement avec id, type et clé', async () => {
    await editor.load(ATTACHED_XML, {
      references: [ { cle: 'APP-BOUTIQUE', nom: 'Boutique en ligne' } ]
    });

    const selection = vi.fn();
    editor.on('selection', selection);

    const diagram = editor.getDiagram();
    const task = diagram.get('elementRegistry').get('Task_boutique');

    diagram.get('selection').select(task);

    expect(selection).toHaveBeenCalledTimes(1);
    expect(selection).toHaveBeenCalledWith({
      cle: 'APP-BOUTIQUE',
      elementId: 'Task_boutique',
      type: 'bpmn:Task'
    });

    diagram.get('selection').select(null);

    expect(selection).toHaveBeenLastCalledWith({
      cle: undefined,
      elementId: undefined,
      type: null
    });
  });

  // entrées
  it('un XML vide charge un processus neuf avec un événement de début', async () => {
    await editor.load();

    const starts = editor.getDiagram().get('elementRegistry').filter(
      (element) => element.businessObject &&
        element.businessObject.$type === 'bpmn:StartEvent'
    );

    expect(starts).toHaveLength(1);
  });

  // erreurs
  it('un XML invalide est refusé avec le message de bpmn-moddle', async () => {
    await expect(editor.load('<bpmn:definitions>')).rejects.toThrow();
  });

  it('les avertissements d\'import sont transmis à l\'hôte', async () => {
    const importDone = vi.fn();
    editor.on('import.done', importDone);

    const { warnings } = await editor.load(orderProcessXml);

    expect(warnings).toEqual([]);
    expect(importDone).toHaveBeenCalledTimes(1);
    expect(importDone).toHaveBeenCalledWith({ warnings: [] });
  });
});

describe('contrat du composant — lecture seule', () => {

  let container, editor;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '900px';
    container.style.height = '600px';
    document.body.appendChild(container);

    editor = new UrbanBpmnEditor({ container, readOnly: true });
  });

  afterEach(() => {
    editor.destroy();
    container.remove();
  });

  // critère 5 (suite)
  it('en lecture seule, aucune modification possible, aucun événement émis', async () => {
    const changed = vi.fn();
    editor.on('changed', changed);

    await editor.load(orderProcessXml, {
      references: [ { cle: 'APP-X', nom: 'X' } ]
    });

    // pas de service de modélisation
    expect(editor.getDiagram().get('modeling', false)).toBeFalsy();

    // la pose est refusée avant d'appeler le délégué
    const drop = vi.fn();
    editor.delegates = { drop };

    await expect(editor.drop('OBJ-1')).rejects.toThrow(/lecture seule/);
    expect(drop).not.toHaveBeenCalled();

    expect(changed).not.toHaveBeenCalled();
  });

  it('en lecture seule, le diagramme se rend et s\'exporte', async () => {
    await editor.load(orderProcessXml);

    expect(container.querySelectorAll('.djs-shape').length).toBeGreaterThan(0);

    const svg = await editor.exportSvg();
    const { xml } = await editor.save();

    expect(svg).toContain('<svg');
    expect(xml).toContain('bpmn:definitions');
  });
});
