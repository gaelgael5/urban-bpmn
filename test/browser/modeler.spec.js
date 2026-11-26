import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createModeler, importXml, exportXml } from '../../src/index.ts';

import orderProcessXml from '../fixtures/order-process.bpmn?raw';

const SHAPE_IDS = [
  'StartEvent_received',
  'Task_review',
  'Gateway_valid',
  'Task_ship',
  'EndEvent_shipped',
  'EndEvent_rejected'
];

const FLOW_IDS = [
  'Flow_review',
  'Flow_decide',
  'Flow_ship',
  'Flow_done',
  'Flow_reject'
];

describe('bpmn-js modeler', () => {

  let container, modeler;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '900px';
    container.style.height = '600px';

    document.body.appendChild(container);

    modeler = createModeler({ container });
  });

  afterEach(() => {
    modeler.destroy();
    container.remove();
  });

  it('loads and renders the sample BPMN 2.0 process', async () => {
    const { warnings } = await importXml(modeler, orderProcessXml);

    expect(warnings).toEqual([]);

    // every model element is registered and rendered as SVG in the container
    const elementRegistry = modeler.get('elementRegistry');

    for (const id of [ ...SHAPE_IDS, ...FLOW_IDS ]) {
      expect(elementRegistry.get(id), id).toBeTruthy();
      expect(container.querySelector(`[data-element-id="${ id }"]`), id).toBeTruthy();
    }
  });

  it('re-exports the process as valid BPMN 2.0 XML, diagram included', async () => {
    await importXml(modeler, orderProcessXml);

    const xml = await exportXml(modeler);

    expect(xml).toContain('bpmn:definitions');
    expect(xml).toContain('bpmndi:BPMNDiagram');

    // the exported XML loads again, without warnings and with every element
    const secondContainer = document.createElement('div');
    document.body.appendChild(secondContainer);

    const secondModeler = createModeler({ container: secondContainer });

    try {
      const { warnings } = await importXml(secondModeler, xml);

      expect(warnings).toEqual([]);

      const elementRegistry = secondModeler.get('elementRegistry');

      for (const id of [ ...SHAPE_IDS, ...FLOW_IDS ]) {
        expect(elementRegistry.get(id), id).toBeTruthy();
      }
    } finally {
      secondModeler.destroy();
      secondContainer.remove();
    }
  });

});
