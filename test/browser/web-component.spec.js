import { describe, it, expect, afterEach, vi } from 'vitest';

import React from 'react';
import { createRoot } from 'react-dom/client';

import '../../src/index.ts';

import orderProcessXml from '../fixtures/order-process.bpmn?raw';

let cleanup = [];

function makeElement() {
  const element = document.createElement('urban-bpmn');
  element.style.cssText = 'display: block; width: 900px; height: 500px';
  document.body.appendChild(element);

  cleanup.push(() => element.remove());

  return element;
}

afterEach(() => {
  cleanup.forEach((fn) => fn());
  cleanup = [];
});

describe('<urban-bpmn>', () => {

  it('est enregistré par l\'import du module', () => {
    expect(customElements.get('urban-bpmn')).toBeTruthy();
  });

  // critère 2 : page HTML sans framework
  it('affiche un processus et émet les événements, sans framework', async () => {
    const element = makeElement();

    const changed = vi.fn();
    const selection = vi.fn();
    element.addEventListener('changed', changed);
    element.addEventListener('selection', selection);

    await element.loadXml(orderProcessXml);

    // le rendu vit dans le shadow DOM, isolé de la page
    expect(element.shadowRoot.querySelectorAll('.djs-shape').length).toBeGreaterThan(0);
    expect(document.querySelector('.djs-shape')).toBeFalsy();

    const diagram = element.editor.getDiagram();
    const task = diagram.get('elementRegistry').get('Task_review');

    diagram.get('selection').select(task);

    expect(selection).toHaveBeenCalledTimes(1);
    expect(selection.mock.calls[0][0].detail.elementId).toBe('Task_review');

    diagram.get('modeling').updateProperties(task, { name: 'Contrôler' });

    expect(changed).toHaveBeenCalledTimes(1);

    const { xml } = await element.save();

    expect(xml).toContain('Contrôler');
  });

  // critère 3 : depuis React
  it('s\'utilise depuis React de la même façon', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const ref = React.createRef();
    const root = createRoot(host);

    root.render(React.createElement('urban-bpmn', {
      ref,
      style: { display: 'block', width: '900px', height: '500px' }
    }));

    cleanup.push(() => {
      root.unmount();
      host.remove();
    });

    await vi.waitFor(() => {
      if (!ref.current || !ref.current.editor) {
        throw new Error('composant pas encore monté');
      }
    });

    const importDone = vi.fn();
    ref.current.addEventListener('import-done', importDone);

    await ref.current.loadXml(orderProcessXml);

    expect(ref.current.shadowRoot.querySelectorAll('.djs-shape').length).toBeGreaterThan(0);
    expect(importDone).toHaveBeenCalledTimes(1);
  });

  // critère 4 : thème par variables CSS
  it('les variables CSS changent l\'apparence de l\'interface', async () => {
    const element = makeElement();

    element.style.setProperty('--ub-bordure', 'rgb(214, 48, 49)');

    await element.loadXml(orderProcessXml);

    const panel = element.shadowRoot.querySelector('.ub-proprietes');

    expect(getComputedStyle(panel).borderLeftColor).toBe('rgb(214, 48, 49)');
  });

  it('l\'attribut read-only reconstruit l\'éditeur en lecture seule', async () => {
    const element = makeElement();

    await element.loadXml(orderProcessXml);

    expect(element.editor.readOnly).toBe(false);

    element.readOnly = true;

    await vi.waitFor(() => {
      if (!element.editor.readOnly ||
          !element.shadowRoot.querySelector('.djs-shape')) {
        throw new Error('pas encore rechargé');
      }
    });

    // pas de palette ni de panneau en lecture seule
    expect(element.shadowRoot.querySelector('.djs-palette')).toBeFalsy();
    expect(element.shadowRoot.querySelector('.ub-proprietes')).toBeFalsy();
  });
});
