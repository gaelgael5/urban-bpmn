/**
 * urban-bpmn — BPMN 2.0 process editor built on bpmn-js (bpmn.io).
 *
 * Public entry: the component contract (types), the editor facade,
 * and the low-level bpmn-js helpers of the foundation.
 */

import BpmnModeler from 'bpmn-js/lib/Modeler';

export * from './contract/types.ts';

export { UrbanBpmnEditor, INITIAL_XML } from './editor/UrbanBpmnEditor.ts';

export { referenceOf } from './references/reference.ts';
export type { Reference } from './references/reference.ts';

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
