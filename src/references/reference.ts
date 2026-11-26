/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The reference extension: attaches a BPMN element to a host object.
 *
 * It travels inside `bpmn:extensionElements`, as an
 * `<urban:reference cle="…" type="…" />` element under the namespace
 * `https://github.com/gaelgael5/urban-bpmn/schema/1.0` — a BPMN tool
 * that does not know the extension ignores it without breaking the
 * file. One reference at most per element.
 */

import type { ObjectKey } from '../contract/types.ts';

export interface Reference {

  /** Functional key of the host object. */
  cle: ObjectKey;

  /** Host space type slug. */
  type?: string;
}

const REFERENCE_TYPE = 'urban:Reference';

/** The reference carried by a business object, if any. */
export function referenceOf(bo: any): Reference | null {
  const values = (bo && bo.extensionElements && bo.extensionElements.values) || [];
  const found = values.find((value: any) => value.$type === REFERENCE_TYPE);

  return found
    ? { cle: found.cle, type: found.type || undefined }
    : null;
}

/**
 * Sets the reference on a business object in place — for elements
 * being built, before they enter the command stack.
 */
export function setReferenceOn(bo: any, ref: Reference, factory: any): void {
  const extensionElements =
    bo.extensionElements || factory.create('bpmn:ExtensionElements', { values: [] });

  extensionElements.$parent = bo;
  extensionElements.values = (extensionElements.values || []).filter(
    (value: any) => value.$type !== REFERENCE_TYPE
  );

  const reference = factory.create(REFERENCE_TYPE, {
    cle: ref.cle,
    ...(ref.type ? { type: ref.type } : {})
  });

  reference.$parent = extensionElements;
  extensionElements.values.push(reference);

  bo.extensionElements = extensionElements;
}

/**
 * A fresh `bpmn:ExtensionElements` carrying `ref` in place of any
 * current reference — ready for `modeling.updateProperties`. With a
 * null `ref`, the reference is removed; the result is `undefined`
 * when nothing else remains.
 */
export function extensionWith(bo: any, ref: Reference | null, factory: any): any {
  const kept = ((bo.extensionElements && bo.extensionElements.values) || []).filter(
    (value: any) => value.$type !== REFERENCE_TYPE
  );

  const values = [ ...kept ];

  if (ref) {
    values.push(factory.create(REFERENCE_TYPE, {
      cle: ref.cle,
      ...(ref.type ? { type: ref.type } : {})
    }));
  }

  if (!values.length) {
    return undefined;
  }

  const extensionElements = factory.create('bpmn:ExtensionElements', { values });

  for (const value of values) {
    value.$parent = extensionElements;
  }

  return extensionElements;
}
