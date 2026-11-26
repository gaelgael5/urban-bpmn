import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { UrbanBpmnEditor } from '../../src/index.ts';

import orderProcessXml from '../fixtures/order-process.bpmn?raw';

// a process created with the full palette: inclusive gateway
const INCLUSIVE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  id="Definitions_inclusif"
                  targetNamespace="https://github.com/gaelgael5/urban-bpmn/schema/1.0">
  <bpmn:process id="Process_inclusif" isExecutable="false">
    <bpmn:inclusiveGateway id="Gateway_inclusif" name="Options" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_inclusif">
    <bpmndi:BPMNPlane id="BPMNPlane_inclusif" bpmnElement="Process_inclusif">
      <bpmndi:BPMNShape id="Gateway_inclusif_di" bpmnElement="Gateway_inclusif">
        <dc:Bounds x="200" y="100" width="50" height="50" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;

const ATELIER_CREATE_ENTRIES = [
  'create.start-event',
  'create.intermediate-message-event',
  'create.intermediate-timer-event',
  'create.end-event',
  'create.exclusive-gateway',
  'create.parallel-gateway',
  'create.task',
  'create.user-task',
  'create.service-task',
  'create.manual-task',
  'create.subprocess-expanded',
  'create.participant-expanded',
  'create.data-object',
  'create.data-store',
  'create.text-annotation'
];

function makeContainer() {
  const container = document.createElement('div');
  container.style.width = '900px';
  container.style.height = '600px';
  document.body.appendChild(container);

  return container;
}

function paletteActions(container) {
  return [ ...container.querySelectorAll('.djs-palette .entry') ]
    .map((entry) => entry.dataset.action);
}

describe('palette d\'atelier', () => {

  let container, editor;

  beforeEach(() => {
    container = makeContainer();
    editor = new UrbanBpmnEditor({ container });
  });

  afterEach(() => {
    editor.destroy();
    container.remove();
  });

  // critère 1
  it('seuls les éléments de l\'atelier sont proposés à la création', async () => {
    await editor.load(orderProcessXml);

    const actions = paletteActions(container);
    const creations = actions.filter((action) => action.startsWith('create.'));

    expect(creations.sort()).toEqual([ ...ATELIER_CREATE_ENTRIES ].sort());

    // les outils de navigation et de connexion restent là
    for (const tool of [ 'hand-tool', 'lasso-tool', 'space-tool', 'global-connect-tool' ]) {
      expect(actions).toContain(tool);
    }
  });

  // critère 3
  it('un processus avec une passerelle inclusive s\'ouvre sans erreur ni perte', async () => {
    const { warnings } = await editor.load(INCLUSIVE_XML);

    expect(warnings).toEqual([]);

    const gateway = editor.getDiagram().get('elementRegistry').get('Gateway_inclusif');

    expect(gateway).toBeTruthy();
    expect(container.querySelector('[data-element-id="Gateway_inclusif"]')).toBeTruthy();

    // l'élément hors palette reste modifiable
    editor.getDiagram().get('modeling').updateProperties(gateway, { name: 'Choix multiples' });

    const { xml } = await editor.save();

    expect(xml).toContain('bpmn:inclusiveGateway');
    expect(xml).toContain('Choix multiples');
  });

  // critère 2
  it('nom et documentation saisis dans le panneau se retrouvent dans le XML', async () => {
    await editor.load(orderProcessXml);

    const diagram = editor.getDiagram();
    const task = diagram.get('elementRegistry').get('Task_review');

    diagram.get('selection').select(task);

    const nameInput = container.querySelector('.ub-prop-nom');
    const docInput = container.querySelector('.ub-prop-documentation');

    expect(nameInput.value).toBe('Vérifier la commande');

    nameInput.value = 'Contrôler la commande';
    nameInput.dispatchEvent(new Event('change'));

    docInput.value = 'Contrôle réalisé par le gestionnaire.';
    docInput.dispatchEvent(new Event('change'));

    const { xml } = await editor.save();

    expect(xml).toContain('name="Contrôler la commande"');
    expect(xml).toContain('<bpmn:documentation>Contrôle réalisé par le gestionnaire.</bpmn:documentation>');
  });

  it('le panneau change le type d\'une tâche', async () => {
    await editor.load(orderProcessXml);

    const diagram = editor.getDiagram();
    const task = diagram.get('elementRegistry').get('Task_review');

    diagram.get('selection').select(task);

    const select = container.querySelector('.ub-prop-type-tache');

    expect(select.value).toBe('bpmn:UserTask');

    select.value = 'bpmn:ServiceTask';
    select.dispatchEvent(new Event('change'));

    const replaced = diagram.get('elementRegistry').get('Task_review');

    expect(replaced.businessObject.$type).toBe('bpmn:ServiceTask');

    const { xml } = await editor.save();

    expect(xml).toContain('bpmn:serviceTask');
  });

  it('sans sélection, le panneau affiche un message vide', async () => {
    await editor.load(orderProcessXml);

    expect(container.querySelector('.ub-proprietes-vide')).toBeTruthy();
  });
});

describe('palette complète', () => {

  let container, editor;

  beforeEach(() => {
    container = makeContainer();
    editor = new UrbanBpmnEditor({ container, palette: 'complete' });
  });

  afterEach(() => {
    editor.destroy();
    container.remove();
  });

  it('la palette de bpmn-js est proposée telle quelle', async () => {
    await editor.load(orderProcessXml);

    const actions = paletteActions(container);

    // entrée bpmn-js absente de l'atelier
    expect(actions).toContain('create.group');

    // entrées propres à l'atelier absentes
    expect(actions).not.toContain('create.user-task');
    expect(actions).not.toContain('create.parallel-gateway');
  });
});
