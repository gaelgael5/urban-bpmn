/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The component facade: loads a standard BPMN 2.0 XML, renders it
 * through bpmn-js, reports selections and modifications, applies the
 * up-to-date names of the referenced host objects, and hands a
 * standard BPMN 2.0 XML back (references included, as `urban:cle` /
 * `urban:type` extension attributes).
 *
 * Same conventions as the `UrbanArchimateEditor` facade of
 * urban-archimate: `container` / `delegates` / `readOnly` options,
 * `load` / `save` methods, `on` / `off` listeners, `changed` /
 * `selection` / `import.done` events.
 */

import Modeler from 'bpmn-js/lib/Modeler';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';

import urbanModdle from '../moddle/urban.json';

import AtelierPaletteModule from '../palette/AtelierPaletteModule.ts';

import { PropertyPanel } from '../properties/PropertyPanel.ts';

import { Toolbox, type ArmedTool } from '../toolbox/Toolbox.ts';

import type {
  Avertissement,
  CollaborationMembre,
  Delegates,
  DropResult,
  EditorOptions,
  LoadOptions,
  PaletteChoice,
  ReferencedObject,
  SaveResult
} from '../contract/types.ts';

type Listener = (payload: unknown) => void;

interface Point {
  x: number;
  y: number;
}

/**
 * A new process: what an empty (or missing) XML loads — one process
 * with one start event, ready to edit.
 */
export const INITIAL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  id="Definitions_nouveau"
                  targetNamespace="https://github.com/gaelgael5/urban-bpmn/schema/1.0">
  <bpmn:process id="Process_nouveau" isExecutable="false">
    <bpmn:startEvent id="StartEvent_nouveau" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_nouveau">
    <bpmndi:BPMNPlane id="BPMNPlane_nouveau" bpmnElement="Process_nouveau">
      <bpmndi:BPMNShape id="StartEvent_nouveau_di" bpmnElement="StartEvent_nouveau">
        <dc:Bounds x="179" y="159" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;

export class UrbanBpmnEditor {

  private _viewer: any;
  private _container: HTMLElement;
  private _delegates: Delegates;
  private _readOnly: boolean;
  private _palette: PaletteChoice;

  private _references = new Map<string, ReferencedObject>();
  private _listeners = new Map<string, Set<Listener>>();
  private _importing = false;
  private _banner: HTMLElement | null = null;
  private _canvasHost: HTMLElement;
  private _panel: PropertyPanel | null = null;
  private _toolbox: Toolbox | null = null;
  private _toolboxHost: HTMLElement | null = null;
  private _armedTool: ArmedTool | null = null;
  private _placing = false;

  constructor(options: EditorOptions) {
    this._container = options.container;
    this._delegates = options.delegates || {};
    this._readOnly = !!options.readOnly;
    this._palette = options.palette || 'atelier';

    // layout: [ canvas | property panel ] inside the host container
    this._container.classList.add('ub-editeur');
    this._container.style.display = 'flex';

    if (!this._readOnly) {
      this._toolboxHost = document.createElement('div');
      this._toolboxHost.className = 'ub-toolbox-colonne';
      this._toolboxHost.style.cssText = [
        'flex: 0 0 200px',
        'box-sizing: border-box',
        'padding: 10px',
        'border-right: 1px solid #ddd',
        'overflow: auto',
        'font: 13px/1.4 system-ui, sans-serif',
        'display: none'
      ].join(';');
      this._container.appendChild(this._toolboxHost);

      this._toolbox = new Toolbox({
        container: this._toolboxHost,
        onArm: (tool) => {
          this._armedTool = tool;
        }
      });
    }

    this._canvasHost = document.createElement('div');
    this._canvasHost.className = 'ub-canvas';
    this._canvasHost.style.cssText = 'flex: 1 1 auto; min-width: 0; height: 100%; position: relative';
    this._container.appendChild(this._canvasHost);

    if (!this._readOnly) {
      this._canvasHost.addEventListener('click', (event) => {
        void this._onCanvasClick(event);
      });
    }

    const ViewerClass: any = this._readOnly ? NavigatedViewer : Modeler;

    this._viewer = new ViewerClass({
      container: this._canvasHost,
      additionalModules:
        !this._readOnly && this._palette === 'atelier'
          ? [ AtelierPaletteModule ]
          : [],
      moddleExtensions: { urban: urbanModdle }
    });

    if (!this._readOnly) {
      this._panel = new PropertyPanel({
        parent: this._container,
        getViewer: () => this._viewer
      });
    }

    const eventBus = this._viewer.get('eventBus');

    // one modification = one command = one 'changed' event; nothing
    // is emitted while an import applies the reference names
    eventBus.on('commandStack.changed', () => {
      if (!this._importing) {
        this._emit('changed', { scope: 'model' });
      }
    });

    if (this._readOnly) {

      // the viewer has no selection service: report plain clicks
      eventBus.on('element.click', (event: any) => {
        const element = event.element;

        if (!element || element === this._viewer.get('canvas').getRootElement()) {
          this._emitSelectionCleared();
        } else {
          this._emitSelection(element);
        }
      });
    } else {
      eventBus.on('selection.changed', (event: any) => {
        const selected = event.newSelection && event.newSelection[0];

        this._panel?.setElement(selected || null);

        if (selected) {
          this._emitSelection(selected);
        } else {
          this._emitSelectionCleared();
        }
      });

      eventBus.on('element.changed', (event: any) => {
        this._panel?.refresh(event.element);
      });
    }
  }

  /** The host delegates (toolbox, drop, action, attach). */
  get delegates(): Delegates {
    return this._delegates;
  }

  set delegates(delegates: Delegates) {
    this._delegates = delegates || {};

    void this._refreshToolbox();
  }

  get readOnly(): boolean {
    return this._readOnly;
  }

  /** Palette choice (`'atelier'` by default). */
  get palette(): PaletteChoice {
    return this._palette;
  }

  /** The underlying bpmn-js instance (escape hatch). */
  getDiagram(): any {
    return this._viewer;
  }

  /**
   * The referenced host objects as currently known: the keys found in
   * the process, with the names being displayed.
   */
  get references(): ReferencedObject[] {
    const seen = new Map<string, ReferencedObject>();

    for (const element of this._viewer.get('elementRegistry').getAll()) {
      const bo = element.businessObject;
      const cle = bo && bo.get && bo.get('urban:cle');

      if (cle && !seen.has(cle)) {
        seen.set(cle, {
          cle,
          nom: bo.name || '',
          type: bo.get('urban:type') || undefined
        });
      }
    }

    return [ ...seen.values() ];
  }

  /**
   * Loads a BPMN 2.0 XML. An empty (or missing) XML loads a new
   * process with a start event. An invalid XML is refused with the
   * bpmn-moddle message; import warnings are returned and emitted
   * through `import.done`.
   */
  async load(xml?: string | null, options: LoadOptions = {}): Promise<{ warnings: unknown[] }> {
    this._references = new Map(
      (options.references || []).map((ref) => [ ref.cle, ref ])
    );

    const effective = xml && xml.trim() ? xml : INITIAL_XML;

    this._importing = true;

    try {
      const { warnings } = await this._viewer.importXML(effective);

      this._applyReferences();
      this._viewer.get('canvas').zoom('fit-viewport');

      this._emit('import.done', { warnings });

      await this._refreshToolbox();

      return { warnings };
    } finally {
      this._importing = false;
    }
  }

  /** The current process as standard BPMN 2.0 XML, diagram included. */
  async save(): Promise<SaveResult> {
    const { xml } = await this._viewer.saveXML({ format: true });

    if (!xml) {
      throw new Error('bpmn-js n\'a rendu aucun XML');
    }

    return { xml };
  }

  /** The current diagram as an SVG image. */
  async exportSvg(): Promise<string> {
    const { svg } = await this._viewer.saveSVG();

    if (!svg) {
      throw new Error('bpmn-js n\'a rendu aucun SVG');
    }

    return svg;
  }

  /**
   * Drops a host tool: calls the drop delegate once with the key,
   * then creates the BPMN element the host asked for, attached to the
   * key. Shows the warning returned by the host, if any.
   */
  async drop(cle: string, position?: Point): Promise<void> {
    if (this._readOnly) {
      throw new Error('lecture seule : pose impossible');
    }

    const drop = this._delegates.drop;

    if (!drop) {
      throw new Error('délégué de pose non fourni');
    }

    const result = await drop(cle);

    await this._place(cle, result, position || this._viewportCenter());

    if (result.avertissement) {
      this._showAvertissement(cle, result.avertissement);
    }
  }

  on(event: string, listener: Listener): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }

    this._listeners.get(event)!.add(listener);
  }

  off(event: string, listener: Listener): void {
    this._listeners.get(event)?.delete(listener);
  }

  destroy(): void {
    this._banner?.remove();
    this._banner = null;
    this._listeners.clear();
    this._panel?.destroy();
    this._panel = null;
    this._toolbox?.destroy();
    this._toolbox = null;
    this._toolboxHost?.remove();
    this._toolboxHost = null;
    this._viewer.destroy();
    this._canvasHost.remove();
  }

  // -------------------------------------------------------------------------
  // internals
  // -------------------------------------------------------------------------

  /**
   * Applies the up-to-date names of the referenced objects: an
   * element attached to a key displays the name the host passed, even
   * when the XML carries an older one. Applied at import, outside the
   * command stack: no 'changed' event, and the next save naturally
   * carries the new names.
   */
  private _applyReferences(): void {
    if (!this._references.size) {
      return;
    }

    const eventBus = this._viewer.get('eventBus');

    for (const element of this._viewer.get('elementRegistry').getAll()) {
      const bo = element.businessObject;
      const cle = bo && bo.get && bo.get('urban:cle');

      if (!cle) {
        continue;
      }

      const ref = this._references.get(cle);

      if (!ref || bo.name === ref.nom) {
        continue;
      }

      bo.name = ref.nom;

      eventBus.fire('element.changed', { element });

      if (element.label) {
        eventBus.fire('element.changed', { element: element.label });
      }
    }
  }

  private async _place(cle: string, result: DropResult, position: Point): Promise<void> {
    switch (result.genre) {

      case 'participant':

        // a host object placed as a pool is a black box: no process,
        // it can be detailed later
        this._createParticipant(
          { cle, nom: result.nom, type: result.type },
          position,
          { boiteNoire: true }
        );
        break;

      case 'collaboration':
        await this._poseCollaboration(cle, result, position);
        break;

      case 'couloir':
        this._createLane(cle, result, position);
        break;

      case 'objet-donnees':
        this._createFlowShape('bpmn:DataObjectReference', cle, result, position);
        break;

      case 'stockage-donnees':
        this._createFlowShape('bpmn:DataStoreReference', cle, result, position);
        break;

      default:
        throw new Error(`genre d'élément inconnu : ${ result.genre }`);
    }
  }

  /**
   * Attaches the diagram's collaboration to the key (one per file —
   * replacing an existing attachment asks for confirmation), after
   * proposing the host's member list: already-placed members are
   * skipped, checked ones are created as if dropped one by one.
   */
  private async _poseCollaboration(
    cle: string,
    result: DropResult,
    position: Point
  ): Promise<void> {
    const canvas = this._viewer.get('canvas');

    // replacement of an existing attachment: ask first
    const rootBo = canvas.getRootElement().businessObject;

    if (rootBo && rootBo.$type === 'bpmn:Collaboration') {
      const existing = rootBo.get('urban:cle');

      if (existing && existing !== cle) {
        const ok = await this._confirm(
          `La collaboration est déjà rattachée à « ${ existing } ». ` +
          `Remplacer par « ${ cle } » ?`
        );

        if (!ok) {
          return;
        }
      }
    }

    // members not placed yet, chosen by the person
    const candidats = (result.membres || []).filter(
      (membre) => membre.genre !== 'collaboration' && !this._hasKey(membre.cle)
    );

    let retenus: CollaborationMembre[] = [];

    if (candidats.length) {
      const choix = await this._chooseMembres(candidats);

      if (choix === null) {
        return;
      }

      retenus = choix;
    }

    let pos = { ...position };

    for (const membre of retenus) {
      await this._place(
        membre.cle,
        { nom: membre.nom, type: membre.type, genre: membre.genre },
        pos
      );

      pos = { x: pos.x, y: pos.y + 200 };
    }

    // attach the collaboration itself
    const newRootBo = this._viewer.get('canvas').getRootElement().businessObject;

    if (!newRootBo || newRootBo.$type !== 'bpmn:Collaboration') {
      throw new Error('aucune collaboration dans le diagramme : posez d\'abord un participant');
    }

    newRootBo.set('urban:cle', cle);

    if (result.type) {
      newRootBo.set('urban:type', result.type);
    }

    this._emit('changed', { scope: 'model' });
  }

  private _createParticipant(
    ref: ReferencedObject,
    position: Point,
    options: { boiteNoire?: boolean } = {}
  ): any {
    const bpmnFactory = this._viewer.get('bpmnFactory');
    const elementFactory = this._viewer.get('elementFactory');
    const modeling = this._viewer.get('modeling');
    const canvas = this._viewer.get('canvas');

    if (options.boiteNoire &&
        canvas.getRootElement().businessObject.$type === 'bpmn:Process') {

      // the first participant created on a process diagram absorbs the
      // existing process (bpmn-js wrap behavior); give that process its
      // own pool first, so the host pool stays a black box
      const wrapper = elementFactory.createParticipantShape({});

      modeling.createShape(wrapper, this._viewportCenter(), canvas.getRootElement());
    }

    const bo = bpmnFactory.create('bpmn:Participant', { name: ref.nom });

    if (ref.cle) {
      bo.set('urban:cle', ref.cle);
    }

    if (ref.type) {
      bo.set('urban:type', ref.type);
    }

    const shape = elementFactory.createParticipantShape({
      businessObject: bo,
      isExpanded: !options.boiteNoire
    });

    return modeling.createShape(shape, position, canvas.getRootElement());
  }

  private _createLane(cle: string, result: DropResult, position: Point): void {
    const modeling = this._viewer.get('modeling');
    const eventBus = this._viewer.get('eventBus');

    // dropped into a participant; without one, a participant is created
    let participant = this._firstParticipant();

    if (!participant) {
      participant = this._createParticipant({ cle: '', nom: '' }, position);
    }

    const lane = modeling.addLane(participant, 'bottom');

    // host-driven data, set outside the command stack: the drop stays
    // a single modification (one command, one 'changed' event)
    const bo = lane.businessObject;
    bo.name = result.nom;
    bo.set('urban:cle', cle);

    if (result.type) {
      bo.set('urban:type', result.type);
    }

    eventBus.fire('element.changed', { element: lane });
  }

  private _createFlowShape(
    type: string,
    cle: string,
    result: DropResult,
    position: Point
  ): void {
    const bpmnFactory = this._viewer.get('bpmnFactory');
    const elementFactory = this._viewer.get('elementFactory');
    const modeling = this._viewer.get('modeling');
    const canvas = this._viewer.get('canvas');

    const bo = bpmnFactory.create(type, { name: result.nom });
    bo.set('urban:cle', cle);

    if (result.type) {
      bo.set('urban:type', result.type);
    }

    const root = canvas.getRootElement();
    const parent = root.businessObject &&
      root.businessObject.$type === 'bpmn:Collaboration'
      ? this._firstParticipant()
      : root;

    if (!parent) {
      throw new Error('aucun participant pour accueillir l\'objet');
    }

    const shape = elementFactory.createShape({ type, businessObject: bo });

    modeling.createShape(shape, position, parent);
  }

  private _firstParticipant(): any {
    return this._viewer.get('elementRegistry').filter(
      (element: any) =>
        element.businessObject &&
        element.businessObject.$type === 'bpmn:Participant' &&
        !element.labelTarget
    )[0] || null;
  }

  private _hasKey(cle: string): boolean {
    return this._viewer.get('elementRegistry').getAll().some((element: any) => {
      const bo = element.businessObject;

      return bo && bo.get && bo.get('urban:cle') === cle;
    });
  }

  /** Fills the toolbox from the host delegate; hides it without one. */
  private async _refreshToolbox(): Promise<void> {
    if (!this._toolbox || !this._toolboxHost) {
      return;
    }

    const toolbox = this._delegates.toolbox;

    if (!toolbox) {
      this._toolboxHost.style.display = 'none';
      return;
    }

    try {
      const groups = await toolbox({ palette: this._palette });

      this._toolbox.setGroups(groups || []);
      this._toolboxHost.style.display = '';
    } catch (error: any) {
      this._toolboxHost.style.display = '';
      this._toolbox.showError(String(error?.message || error));
    }
  }

  /** Places the armed tool where the diagram was clicked. */
  private async _onCanvasClick(event: MouseEvent): Promise<void> {
    const armed = this._armedTool;

    if (!armed || !armed.cle || this._placing) {
      return;
    }

    // only clicks on the diagram surface, not on the bpmn-js palette
    if (!(event.target instanceof Element) ||
        !event.target.closest('.djs-container') ||
        event.target.closest('.djs-palette')) {
      return;
    }

    this._placing = true;
    this._toolbox?.setBusy(true);

    try {
      await this.drop(armed.cle, this._positionFromEvent(event));
      this._toolbox?.setBusy(false);
    } catch (error: any) {

      // host error: nothing is placed, the message is displayed
      this._toolbox?.setBusy(false);
      this._toolbox?.showError(String(error?.message || error));
    } finally {
      this._placing = false;
      this._toolbox?.disarm();
      this._armedTool = null;
    }
  }

  private _positionFromEvent(event: MouseEvent): Point {
    const canvas = this._viewer.get('canvas');
    const rect = this._canvasHost.getBoundingClientRect();
    const viewbox = canvas.viewbox();

    return {
      x: viewbox.x + (event.clientX - rect.left) / viewbox.scale,
      y: viewbox.y + (event.clientY - rect.top) / viewbox.scale
    };
  }

  /** Non-blocking in-component confirmation dialog. */
  private _confirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const { root, close } = this._openDialog();

      const text = document.createElement('p');
      text.className = 'ub-dialogue-message';
      text.style.margin = '0 0 10px';
      text.textContent = message;
      root.appendChild(text);

      const buttons = document.createElement('div');
      buttons.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end';

      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'ub-dialogue-annuler';
      cancel.textContent = 'Annuler';
      cancel.addEventListener('click', () => {
        close();
        resolve(false);
      }, { once: true });

      const confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.className = 'ub-dialogue-confirmer';
      confirm.textContent = 'Remplacer';
      confirm.addEventListener('click', () => {
        close();
        resolve(true);
      }, { once: true });

      buttons.appendChild(cancel);
      buttons.appendChild(confirm);
      root.appendChild(buttons);
    });
  }

  /** Member picker for a collaboration drop; null when cancelled. */
  private _chooseMembres(
    membres: CollaborationMembre[]
  ): Promise<CollaborationMembre[] | null> {
    return new Promise((resolve) => {
      const { root, close } = this._openDialog();

      const title = document.createElement('p');
      title.style.margin = '0 0 10px';
      title.textContent = 'Membres à poser :';
      root.appendChild(title);

      const boxes: [ HTMLInputElement, CollaborationMembre ][] = [];

      for (const membre of membres) {
        const line = document.createElement('label');
        line.className = 'ub-membre';
        line.style.cssText = 'display: flex; gap: 6px; align-items: center; margin-bottom: 6px';

        const box = document.createElement('input');
        box.type = 'checkbox';
        box.checked = true;
        box.dataset.cle = membre.cle;

        const label = document.createElement('span');
        label.textContent = membre.nom;

        line.appendChild(box);
        line.appendChild(label);
        root.appendChild(line);

        boxes.push([ box, membre ]);
      }

      const buttons = document.createElement('div');
      buttons.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px';

      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'ub-membres-annuler';
      cancel.textContent = 'Annuler';
      cancel.addEventListener('click', () => {
        close();
        resolve(null);
      }, { once: true });

      const place = document.createElement('button');
      place.type = 'button';
      place.className = 'ub-membres-poser';
      place.textContent = 'Poser';
      place.addEventListener('click', () => {
        close();
        resolve(boxes.filter(([ box ]) => box.checked).map(([ , membre ]) => membre));
      }, { once: true });

      buttons.appendChild(cancel);
      buttons.appendChild(place);
      root.appendChild(buttons);
    });
  }

  private _openDialog(): { root: HTMLElement, close: () => void } {
    const veil = document.createElement('div');
    veil.className = 'ub-dialogue-voile';
    veil.style.cssText = [
      'position: absolute',
      'inset: 0',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'background: rgba(0, 0, 0, 0.25)',
      'z-index: 20'
    ].join(';');

    const root = document.createElement('div');
    root.className = 'ub-dialogue';
    root.style.cssText = [
      'background: #fff',
      'border-radius: 6px',
      'padding: 14px',
      'max-width: 360px',
      'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25)',
      'font: 13px/1.4 system-ui, sans-serif'
    ].join(';');

    veil.appendChild(root);

    if (!this._container.style.position) {
      this._container.style.position = 'relative';
    }

    this._container.appendChild(veil);

    return { root, close: () => veil.remove() };
  }

  private _viewportCenter(): Point {
    const viewbox = this._viewer.get('canvas').viewbox();

    return {
      x: viewbox.x + viewbox.width / 2,
      y: viewbox.y + viewbox.height / 2
    };
  }

  private _showAvertissement(cle: string, avertissement: Avertissement): void {
    this._banner?.remove();

    const banner = document.createElement('div');
    banner.className = 'ub-avertissement';
    banner.setAttribute('role', 'alert');
    banner.style.cssText = [
      'position: absolute',
      'top: 8px',
      'left: 50%',
      'transform: translateX(-50%)',
      'max-width: 80%',
      'display: flex',
      'gap: 8px',
      'align-items: center',
      'padding: 6px 10px',
      'border: 1px solid #e0b000',
      'border-radius: 4px',
      'background: #fff8e1',
      'color: #5f4b00',
      'font: 13px/1.4 system-ui, sans-serif',
      'z-index: 10'
    ].join(';');

    const message = document.createElement('span');
    message.className = 'ub-avertissement-message';
    message.textContent = avertissement.message;
    banner.appendChild(message);

    if (avertissement.action) {
      const { id, libelle } = avertissement.action;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ub-avertissement-action';
      button.textContent = libelle;

      button.addEventListener('click', () => {
        banner.remove();

        if (this._banner === banner) {
          this._banner = null;
        }

        this._delegates.action?.(cle, id);
      }, { once: true });

      banner.appendChild(button);
    }

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'ub-avertissement-fermer';
    close.setAttribute('aria-label', 'Fermer');
    close.textContent = '✕';

    close.addEventListener('click', () => {
      banner.remove();

      if (this._banner === banner) {
        this._banner = null;
      }
    }, { once: true });

    banner.appendChild(close);

    if (!this._container.style.position) {
      this._container.style.position = 'relative';
    }

    this._container.appendChild(banner);
    this._banner = banner;
  }

  private _emitSelection(element: any): void {
    const bo = element.businessObject;

    this._emit('selection', {
      cle: (bo && bo.get && bo.get('urban:cle')) || undefined,
      elementId: element.id,
      type: bo ? bo.$type : null
    });
  }

  private _emitSelectionCleared(): void {
    this._emit('selection', { cle: undefined, elementId: undefined, type: null });
  }

  private _emit(event: string, payload: unknown): void {
    for (const listener of this._listeners.get(event) || []) {
      listener(payload);
    }
  }
}
