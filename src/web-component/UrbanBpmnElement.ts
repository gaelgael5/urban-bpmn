/**
 * `<urban-bpmn>` : the component as a custom element, usable without
 * any framework and from React.
 *
 * - styles are isolated from the host page (shadow DOM);
 * - the theme follows the host through CSS variables (`--ub-*`), which
 *   pierce the shadow boundary: `--ub-police` (font), `--ub-texte`,
 *   `--ub-fond`, `--ub-bordure`, `--ub-accent`;
 * - same contract as the `UrbanBpmnEditor` facade: `delegates`,
 *   `loadXml`, `save`, `exportSvg`, `attach` / `detach`, `drop`, and
 *   the `changed` / `selection` / `import-done` events (CustomEvent,
 *   payload in `detail`).
 */

import diagramCss from 'bpmn-js/dist/assets/diagram-js.css?inline';
import bpmnCss from 'bpmn-js/dist/assets/bpmn-js.css?inline';
import bpmnFontCss from 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css?inline';

import type {
  Delegates,
  LoadOptions,
  PaletteChoice,
  ReferencedObject,
  SaveResult
} from '../contract/types.ts';

import { UrbanBpmnEditor } from '../editor/UrbanBpmnEditor.ts';

const COMPONENT_CSS = `
:host {
  display: block;
  width: 100%;
  height: 100%;
  font-family: var(--ub-police, system-ui, sans-serif);
  color: var(--ub-texte, #333);
  background: var(--ub-fond, #fff);
}

.ub-racine {
  width: 100%;
  height: 100%;
}
`;

export class UrbanBpmnElement extends HTMLElement {

  static get observedAttributes(): string[] {
    return [ 'read-only', 'palette' ];
  }

  private _editor: UrbanBpmnEditor | null = null;
  private _root: HTMLElement | null = null;
  private _delegates: Delegates = {};
  private _lastXml: string | null = null;
  private _lastOptions: LoadOptions = {};

  connectedCallback(): void {
    if (this.shadowRoot) {
      return;
    }

    const shadow = this.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = [ diagramCss, bpmnCss, bpmnFontCss, COMPONENT_CSS ].join('\n');
    shadow.appendChild(style);

    this._root = document.createElement('div');
    this._root.className = 'ub-racine';
    shadow.appendChild(this._root);

    this._createEditor();
  }

  disconnectedCallback(): void {
    this._editor?.destroy();
    this._editor = null;
  }

  attributeChangedCallback(): void {
    if (!this.shadowRoot || !this._editor) {
      return;
    }

    // the mode and the palette shape the editing surface: rebuild
    this._createEditor();

    if (this._lastXml !== null) {
      this.loadXml(this._lastXml, this._lastOptions).catch((error) =>
        this._dispatch('error', { message: String(error.message || error) }));
    }
  }

  /** The host delegates (toolbox, drop, action, attach). */
  get delegates(): Delegates {
    return this._delegates;
  }

  set delegates(delegates: Delegates) {
    this._delegates = delegates || {};

    if (this._editor) {
      this._editor.delegates = this._delegates;
    }
  }

  get readOnly(): boolean {
    return this.hasAttribute('read-only');
  }

  set readOnly(value: boolean) {
    if (value) {
      this.setAttribute('read-only', '');
    } else {
      this.removeAttribute('read-only');
    }
  }

  get palette(): PaletteChoice {
    return this.getAttribute('palette') === 'complete' ? 'complete' : 'atelier';
  }

  set palette(value: PaletteChoice) {
    this.setAttribute('palette', value);
  }

  /** The underlying editor facade. */
  get editor(): UrbanBpmnEditor | null {
    return this._editor;
  }

  /** The referenced host objects as currently known. */
  get references(): ReferencedObject[] {
    return this._editor ? this._editor.references : [];
  }

  /** Loads a BPMN 2.0 XML (empty: a new process with a start event). */
  async loadXml(xml?: string | null, options: LoadOptions = {}): Promise<{ warnings: unknown[] }> {
    if (!this._editor) {
      throw new Error('composant non attaché au document');
    }

    this._lastXml = xml ?? '';
    this._lastOptions = options;

    return this._editor.load(xml, options);
  }

  /** The current process as standard BPMN 2.0 XML. */
  async save(): Promise<SaveResult> {
    return this._requireEditor().save();
  }

  /** The current diagram as an SVG image. */
  async exportSvg(): Promise<string> {
    return this._requireEditor().exportSvg();
  }

  /** Drops a host tool (see the drop delegate). */
  async drop(cle: string, position?: { x: number, y: number }): Promise<void> {
    return this._requireEditor().drop(cle, position);
  }

  /** Attaches an element (null: the diagram root) to a host object. */
  async attach(elementId: string | null = null): Promise<ReferencedObject | null> {
    return this._requireEditor().attach(elementId);
  }

  /** Removes the reference of an element (null: the diagram root). */
  detach(elementId: string | null = null): void {
    this._requireEditor().detach(elementId);
  }

  private _requireEditor(): UrbanBpmnEditor {
    if (!this._editor) {
      throw new Error('composant non attaché au document');
    }

    return this._editor;
  }

  private _createEditor(): void {
    this._editor?.destroy();

    if (!this._root) {
      return;
    }

    this._root.innerHTML = '';

    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    this._root.appendChild(container);

    this._editor = new UrbanBpmnEditor({
      container,
      delegates: this._delegates,
      readOnly: this.readOnly,
      palette: this.palette
    });

    this._editor.on('changed', (detail) => this._dispatch('changed', detail));
    this._editor.on('selection', (detail) => this._dispatch('selection', detail));
    this._editor.on('import.done', (detail) => this._dispatch('import-done', detail));
  }

  private _dispatch(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
  }
}

/** Registers `<urban-bpmn>` (idempotent). */
export function register(): void {
  if (typeof customElements !== 'undefined' &&
      !customElements.get('urban-bpmn')) {
    customElements.define('urban-bpmn', UrbanBpmnElement);
  }
}
