import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { BpmnModdle } from 'bpmn-moddle';

import { UrbanBpmnEditor, referenceOf } from '../../src/index.ts';

// a process with a free (unattached) data object
const DATAOBJECT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  id="Definitions_donnees"
                  targetNamespace="https://github.com/gaelgael5/urban-bpmn/schema/1.0">
  <bpmn:process id="Process_donnees" isExecutable="false">
    <bpmn:dataObjectReference id="Data_commande" name="Commande" dataObjectRef="DataObject_commande" />
    <bpmn:dataObject id="DataObject_commande" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_donnees">
    <bpmndi:BPMNPlane id="BPMNPlane_donnees" bpmnElement="Process_donnees">
      <bpmndi:BPMNShape id="Data_commande_di" bpmnElement="Data_commande">
        <dc:Bounds x="200" y="100" width="36" height="50" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;

// a collaboration without any reference yet
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

describe('rattachement à un objet de l\'hôte', () => {

  let container, editor;

  beforeEach(() => {
    container = makeContainer();
  });

  afterEach(() => {
    editor.destroy();
    container.remove();
  });

  // critère 1
  it('rattacher un objet de données via le panneau : référence visible, exportée, relue', async () => {
    const attach = vi.fn(() => ({ cle: 'OBJ-COMMANDE', nom: 'Commande', type: 'dataset' }));

    editor = new UrbanBpmnEditor({ container, delegates: { attach } });

    await editor.load(DATAOBJECT_XML);

    const diagram = editor.getDiagram();
    const data = diagram.get('elementRegistry').get('Data_commande');

    diagram.get('selection').select(data);

    // le bouton Rattacher… appelle le délégué, l'hôte rend l'objet
    container.querySelector('.ub-prop-rattacher').click();

    await vi.waitFor(() => {
      if (!referenceOf(data.businessObject)) {
        throw new Error('pas encore rattaché');
      }
    });

    expect(attach).toHaveBeenCalledTimes(1);
    expect(attach).toHaveBeenCalledWith({
      elementId: 'Data_commande',
      type: 'bpmn:DataObjectReference',
      cle: undefined
    });

    // la référence apparaît dans le panneau
    expect(container.querySelector('.ub-prop-reference').textContent)
      .toBe('OBJ-COMMANDE (dataset)');

    // un indicateur discret marque l'élément
    expect(container.querySelector('.ub-indicateur-reference')).toBeTruthy();

    // dans le XML
    const { xml } = await editor.save();

    expect(xml).toContain('<urban:reference cle="OBJ-COMMANDE" type="dataset"');

    // et après rechargement
    await editor.load(xml);

    expect(editor.references).toEqual([
      { cle: 'OBJ-COMMANDE', nom: 'Commande', type: 'dataset' }
    ]);
  });

  it('retirer une référence la supprime du XML', async () => {
    const attach = vi.fn(() => ({ cle: 'OBJ-COMMANDE', nom: 'Commande', type: 'dataset' }));

    editor = new UrbanBpmnEditor({ container, delegates: { attach } });

    await editor.load(DATAOBJECT_XML);
    await editor.attach('Data_commande');

    editor.detach('Data_commande');

    const { xml } = await editor.save();

    expect(xml).not.toContain('urban:reference');
    expect(editor.references).toEqual([]);
  });

  // critère 2
  it('la collaboration rattachée est relue ; une seconde référence est refusée', async () => {
    const attach = vi.fn(() => ({ cle: 'COL-VENTE-EN-LIGNE', nom: 'Vente en ligne' }));

    editor = new UrbanBpmnEditor({ container, delegates: { attach } });

    await editor.load(POOL_XML);

    // sans sélection, le panneau propose de rattacher le diagramme
    container.querySelector('.ub-prop-rattacher').click();

    await vi.waitFor(() => {
      const root = editor.getDiagram().get('canvas').getRootElement();

      if (!referenceOf(root.businessObject)) {
        throw new Error('pas encore rattaché');
      }
    });

    expect(attach).toHaveBeenCalledWith({
      elementId: 'Collaboration_pool',
      type: 'bpmn:Collaboration',
      cle: undefined
    });

    // relecture après rechargement
    const { xml } = await editor.save();

    await editor.load(xml);

    const root = editor.getDiagram().get('canvas').getRootElement();

    expect(referenceOf(root.businessObject)).toEqual({
      cle: 'COL-VENTE-EN-LIGNE',
      type: undefined
    });

    // une seconde référence est refusée
    await expect(editor.attach(null)).rejects.toThrow(/déjà rattachée/);
    expect(attach).toHaveBeenCalledTimes(1);
  });

  // critère 3
  it('le XML produit reste du BPMN 2.0 valide, extension ignorée par un outil tiers', async () => {
    editor = new UrbanBpmnEditor({
      container,
      delegates: { attach: () => ({ cle: 'OBJ-COMMANDE', nom: 'Commande', type: 'dataset' }) }
    });

    await editor.load(DATAOBJECT_XML);
    await editor.attach('Data_commande');

    const { xml } = await editor.save();

    // un outil qui ne connaît pas l'extension lit et réécrit sans casser
    const moddle = new BpmnModdle();
    const { rootElement } = await moddle.fromXML(xml);

    const process = rootElement.rootElements.find(
      (element) => element.$type === 'bpmn:Process'
    );

    expect(process.flowElements.some((element) => element.id === 'Data_commande')).toBe(true);

    const rewritten = await moddle.toXML(rootElement, { format: true });

    expect(rewritten.xml).toContain('Data_commande');
  });

  // critère 4 : le composant n'appelle aucun service, l'hôte fournit tout
  it('sans délégué de rattachement, le rattachement est indisponible', async () => {
    editor = new UrbanBpmnEditor({ container });

    await editor.load(DATAOBJECT_XML);

    await expect(editor.attach('Data_commande')).rejects.toThrow(/délégué/);

    // et le panneau ne propose pas le bouton
    const diagram = editor.getDiagram();

    diagram.get('selection').select(diagram.get('elementRegistry').get('Data_commande'));

    expect(container.querySelector('.ub-prop-rattacher')).toBeFalsy();
  });
});
