/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Minimal property panel for the selected element: name,
 * documentation (free text), and — for a task — its type. The
 * technical bpmn-js properties stay hidden: this panel is all the
 * workshop palette shows.
 */

import { referenceOf } from '../references/reference.ts';

/** The four everyday task types proposed by the panel. */
const TASK_TYPES: [ string, string ][] = [
  [ 'bpmn:Task', 'Tâche' ],
  [ 'bpmn:UserTask', 'Tâche utilisateur' ],
  [ 'bpmn:ServiceTask', 'Tâche service' ],
  [ 'bpmn:ManualTask', 'Tâche manuelle' ]
];

const TASK_TYPE_SET = new Set(TASK_TYPES.map(([ type ]) => type));

/** Every BPMN activity kind the type selector applies to. */
const ALL_TASK_KINDS = new Set([
  ...TASK_TYPE_SET,
  'bpmn:ScriptTask',
  'bpmn:BusinessRuleTask',
  'bpmn:SendTask',
  'bpmn:ReceiveTask',
  'bpmn:CallActivity'
]);

export interface PropertyPanelOptions {

  /** Element the panel root is appended to. */
  parent: HTMLElement;

  /** The bpmn-js instance (services are read lazily). */
  getViewer: () => any;

  /** Whether the host provided the attach delegate. */
  canAttach: () => boolean;

  /** Attaches an element (null: the diagram root) to a host object. */
  onAttach: (elementId: string | null) => Promise<unknown>;

  /** Removes the reference of an element (null: the diagram root). */
  onDetach: (elementId: string | null) => void;
}

export class PropertyPanel {

  private _root: HTMLElement;
  private _getViewer: () => any;
  private _element: any = null;
  private _canAttach: PropertyPanelOptions['canAttach'];
  private _onAttach: PropertyPanelOptions['onAttach'];
  private _onDetach: PropertyPanelOptions['onDetach'];

  constructor(options: PropertyPanelOptions) {
    this._getViewer = options.getViewer;
    this._canAttach = options.canAttach;
    this._onAttach = options.onAttach;
    this._onDetach = options.onDetach;

    this._root = document.createElement('div');
    this._root.className = 'ub-proprietes';
    this._root.style.cssText = [
      'flex: 0 0 240px',
      'box-sizing: border-box',
      'padding: 12px',
      'border-left: 1px solid #ddd',
      'overflow: auto',
      'font: 13px/1.4 system-ui, sans-serif',
      'color: #333'
    ].join(';');

    options.parent.appendChild(this._root);

    this._renderEmpty();
  }

  /** Shows the properties of `element`, or the placeholder for null. */
  setElement(element: any): void {
    this._element = element;
    this._render();
  }

  /** Re-reads the values of the current element (external change). */
  refresh(changed: any): void {
    if (this._element && changed && changed.id === this._element.id) {
      this._render();
    }
  }

  destroy(): void {
    this._root.remove();
  }

  // -------------------------------------------------------------------------
  // internals
  // -------------------------------------------------------------------------

  private _render(): void {
    const element = this._element;
    const bo = element && element.businessObject;

    if (!bo || element.labelTarget) {
      this._renderEmpty();
      return;
    }

    this._root.innerHTML = '';

    this._root.appendChild(this._title(bo.$type));

    // name
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'ub-prop-nom';
    nameInput.value = bo.name || '';
    nameInput.addEventListener('change', () => {
      this._modeling().updateProperties(element, {
        name: nameInput.value || undefined
      });
    });

    this._root.appendChild(this._field('Nom', nameInput));

    // documentation
    const docInput = document.createElement('textarea');
    docInput.className = 'ub-prop-documentation';
    docInput.rows = 5;
    docInput.value = documentationOf(bo);
    docInput.addEventListener('change', () => {
      const text = docInput.value.trim();
      const documentation = text
        ? [ this._viewer().get('bpmnFactory').create('bpmn:Documentation', { text }) ]
        : [];

      this._modeling().updateProperties(element, { documentation });
    });

    this._root.appendChild(this._field('Documentation', docInput));

    // task type
    if (ALL_TASK_KINDS.has(bo.$type)) {
      const select = document.createElement('select');
      select.className = 'ub-prop-type-tache';

      const options: [ string, string ][] = TASK_TYPE_SET.has(bo.$type)
        ? TASK_TYPES
        : [ ...TASK_TYPES, [ bo.$type, bo.$type.replace(/^bpmn:/, '') ] ];

      for (const [ value, label ] of options) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.selected = value === bo.$type;
        select.appendChild(option);
      }

      select.addEventListener('change', () => {
        const replaced = this._viewer().get('bpmnReplace').replaceElement(
          element,
          { type: select.value }
        );

        this._viewer().get('selection').select(replaced);
      });

      this._root.appendChild(this._field('Type de tâche', select));
    }

    this._renderReference(element.id, bo);
  }

  private _renderEmpty(): void {
    this._root.innerHTML = '';

    const empty = document.createElement('p');
    empty.className = 'ub-proprietes-vide';
    empty.style.color = '#888';
    empty.textContent = 'Aucun élément sélectionné.';

    this._root.appendChild(empty);

    // the diagram itself (collaboration, or the process it details)
    const root = this._rootElement();

    if (root && root.businessObject) {
      this._root.appendChild(this._title('Diagramme'));
      this._renderReference(null, root.businessObject);
    }
  }

  /** The reference block: current key, attach and detach buttons. */
  private _renderReference(elementId: string | null, bo: any): void {
    const ref = referenceOf(bo);

    const block = document.createElement('div');
    block.className = 'ub-prop-reference-bloc';
    block.style.cssText = 'margin-top: 10px; border-top: 1px solid #eee; padding-top: 8px';

    const caption = document.createElement('span');
    caption.style.cssText = 'display: block; margin-bottom: 3px; color: #666';
    caption.textContent = 'Référence';
    block.appendChild(caption);

    const value = document.createElement('div');
    value.className = 'ub-prop-reference';
    value.style.marginBottom = '6px';
    value.textContent = ref
      ? ref.cle + (ref.type ? ` (${ ref.type })` : '')
      : '—';
    block.appendChild(value);

    const error = document.createElement('div');
    error.className = 'ub-prop-erreur';
    error.style.cssText = 'color: #b00020; margin-bottom: 6px; display: none';

    const buttons = document.createElement('div');
    buttons.style.cssText = 'display: flex; gap: 6px';

    if (this._canAttach()) {
      const attach = document.createElement('button');
      attach.type = 'button';
      attach.className = 'ub-prop-rattacher';
      attach.textContent = 'Rattacher…';
      attach.addEventListener('click', () => {
        attach.disabled = true;
        error.style.display = 'none';

        this._onAttach(elementId)
          .then(() => this._render())
          .catch((raised) => {
            attach.disabled = false;
            error.textContent = String(raised?.message || raised);
            error.style.display = '';
          });
      });

      buttons.appendChild(attach);
    }

    if (ref) {
      const detach = document.createElement('button');
      detach.type = 'button';
      detach.className = 'ub-prop-retirer';
      detach.textContent = 'Retirer';
      detach.addEventListener('click', () => {
        try {
          this._onDetach(elementId);
          this._render();
        } catch (raised: any) {
          error.textContent = String(raised?.message || raised);
          error.style.display = '';
        }
      });

      buttons.appendChild(detach);
    }

    block.appendChild(error);
    block.appendChild(buttons);
    this._root.appendChild(block);
  }

  private _rootElement(): any {
    try {
      return this._viewer().get('canvas').getRootElement();
    } catch {
      return null;
    }
  }

  private _title(type: string): HTMLElement {
    const title = document.createElement('div');
    title.className = 'ub-proprietes-type';
    title.style.cssText = 'font-weight: 600; margin-bottom: 8px';
    title.textContent = type.replace(/^bpmn:/, '');

    return title;
  }

  private _field(label: string, control: HTMLElement): HTMLElement {
    const field = document.createElement('label');
    field.style.cssText = 'display: block; margin-bottom: 10px';

    const caption = document.createElement('span');
    caption.style.cssText = 'display: block; margin-bottom: 3px; color: #666';
    caption.textContent = label;

    control.style.width = '100%';
    control.style.boxSizing = 'border-box';

    field.appendChild(caption);
    field.appendChild(control);

    return field;
  }

  private _viewer(): any {
    return this._getViewer();
  }

  private _modeling(): any {
    return this._viewer().get('modeling');
  }
}

function documentationOf(bo: any): string {
  const documentation = bo.documentation && bo.documentation[0];

  return (documentation && documentation.text) || '';
}
