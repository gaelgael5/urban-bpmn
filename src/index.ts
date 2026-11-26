/**
 * urban-bpmn — BPMN 2.0 process editor built on bpmn-js (bpmn.io).
 *
 * Foundation entry point: it exposes the up-to-date bpmn-js modeler and the
 * two helpers covering the round trip the backlog requires — load a standard
 * BPMN 2.0 XML (diagram interchange included), render it, export it back.
 * The full component contract (delegates, host toolbox, references) comes
 * with the next backlog items.
 */

import BpmnModeler from 'bpmn-js/lib/Modeler';

export { BpmnModeler };

export interface CreateModelerOptions {

  /** DOM element the modeler renders into. */
  container: HTMLElement;

  /** Additional bpmn-js options, passed through as-is. */
  [key: string]: unknown;
}

export interface ImportResult {

  /** Non-fatal problems reported by bpmn-js during the import. */
  warnings: unknown[];
}

/**
 * Create a bpmn-js modeler bound to a container element.
 */
export function createModeler(options: CreateModelerOptions): BpmnModeler {
  return new BpmnModeler(options);
}

/**
 * Load a BPMN 2.0 XML document (with its `bpmndi` diagram) into the modeler.
 */
export async function importXml(modeler: BpmnModeler, xml: string): Promise<ImportResult> {
  const { warnings } = await modeler.importXML(xml);

  return { warnings };
}

/**
 * Export the current process as standard BPMN 2.0 XML, diagram included.
 */
export async function exportXml(modeler: BpmnModeler, options: { format?: boolean } = {}): Promise<string> {
  const { xml } = await modeler.saveXML({ format: true, ...options });

  if (!xml) {
    throw new Error('bpmn-js returned no XML');
  }

  return xml;
}
