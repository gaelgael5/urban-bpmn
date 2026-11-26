import { describe, it, expect } from 'vitest';

import { BpmnModdle } from 'bpmn-moddle';

import orderProcessXml from '../fixtures/order-process.bpmn?raw';

describe('bpmn-moddle round trip', () => {

  it('reads the sample process and writes it back as valid BPMN 2.0 XML', async () => {
    const moddle = new BpmnModdle();

    // read
    const { rootElement: definitions, warnings } = await moddle.fromXML(orderProcessXml);

    expect(warnings).toEqual([]);

    const process = definitions.rootElements.find((element) => element.$type === 'bpmn:Process');

    expect(process).toBeTruthy();
    expect(process.flowElements).toHaveLength(11);

    // write
    const { xml } = await moddle.toXML(definitions, { format: true });

    expect(xml).toContain('bpmn:definitions');
    expect(xml).toContain('bpmndi:BPMNDiagram');

    // the exported XML parses again without warnings
    const reread = await moddle.fromXML(xml);

    expect(reread.warnings).toEqual([]);

    const rereadProcess = reread.rootElement.rootElements.find((element) => element.$type === 'bpmn:Process');

    expect(rereadProcess.flowElements).toHaveLength(11);
  });

});
