import type { ToolGroup } from '../contract/types.ts';

/** A tool armed for placement. */
export interface ArmedTool {

  /** Always 'host' for urban-bpmn (every tool comes from the host). */
  kind: string;

  /** Tool key (passed to the drop delegate). */
  cle?: string;
}

export interface ToolboxOptions {

  /** Element the toolbox panel is rendered into. */
  container: HTMLElement;

  /** Called when a tool is selected (armed) or cleared (null). */
  onArm: (tool: ArmedTool | null) => void;
}

/**
 * The toolbox panel. Its whole content comes from the host (groups,
 * labels, icons, keys), in the host's order. No catalogue of icons or
 * types is embedded. Same conventions as the urban-archimate toolbox.
 */
export class Toolbox {

  private _container: HTMLElement;
  private _onArm: ToolboxOptions['onArm'];

  private _groups: ToolGroup[] = [];
  private _filter = '';
  private _armed: { element: HTMLElement, tool: ArmedTool } | null = null;

  private _list: HTMLElement;
  private _status: HTMLElement;

  constructor(options: ToolboxOptions) {
    this._container = options.container;
    this._onArm = options.onArm;

    this._container.classList.add('ub-toolbox');

    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'Rechercher un outil…';
    search.className = 'ub-toolbox-recherche';
    search.style.cssText = 'width: 100%; box-sizing: border-box; margin-bottom: 8px';
    search.addEventListener('input', () => {
      this._filter = search.value.trim().toLowerCase();
      this._render();
    });
    this._container.appendChild(search);

    this._list = document.createElement('div');
    this._list.className = 'ub-toolbox-groupes';
    this._container.appendChild(this._list);

    this._status = document.createElement('div');
    this._status.className = 'ub-toolbox-statut';
    this._status.style.cssText = 'margin-top: 8px; font-size: 12px';
    this._container.appendChild(this._status);

    this._render();
  }

  /** Replaces the host groups (after a load or a delegates change). */
  setGroups(groups: ToolGroup[]): void {
    this._groups = groups || [];
    this._render();
  }

  /** Shows the busy indicator while the host answers a drop. */
  setBusy(busy: boolean): void {
    this._status.classList.toggle('ub-toolbox-occupe', busy);
    this._status.textContent = busy ? 'Pose en cours…' : '';
  }

  /** Displays an error message (e.g. from the host). */
  showError(message: string): void {
    this._status.classList.remove('ub-toolbox-occupe');
    this._status.textContent = message;
    this._status.classList.add('ub-toolbox-erreur');
    this._status.style.color = '#b00020';
  }

  clearError(): void {
    this._status.textContent = '';
    this._status.classList.remove('ub-toolbox-erreur');
    this._status.style.color = '';
  }

  /** Clears the armed tool (after a placement or an escape). */
  disarm(): void {
    if (this._armed) {
      this._armed.element.classList.remove('ub-outil-arme');
      this._armed = null;
    }
  }

  destroy(): void {
    this._container.classList.remove('ub-toolbox');
    this._container.innerHTML = '';
  }

  private _arm(element: HTMLElement, tool: ArmedTool): void {
    if (this._armed && this._armed.element === element) {

      // clicking the armed tool again disarms it
      this.disarm();
      this._onArm(null);
      return;
    }

    this.disarm();
    this.clearError();

    element.classList.add('ub-outil-arme');
    element.style.outline = '2px solid var(--ub-accent, #1a73e8)';
    this._armed = { element, tool };
    this._onArm(tool);
  }

  private _render(): void {
    this._list.innerHTML = '';
    this._armed = null;

    for (const group of this._groups) {
      this._renderGroup(
        group.libelle || group.id,
        (group.outils || []).map((outil) => ({
          tool: { kind: 'host', cle: outil.cle } as ArmedTool,
          libelle: outil.libelle,
          icone: outil.icone,
          description: outil.description
        })));
    }
  }

  private _renderGroup(
      libelle: string,
      entries: { tool: ArmedTool, libelle: string, icone?: string, description?: string }[]
  ): void {

    const visible = entries.filter((entry) =>
      !this._filter ||
      entry.libelle.toLowerCase().includes(this._filter) ||
      (entry.description || '').toLowerCase().includes(this._filter));

    if (!visible.length) {
      return;
    }

    const section = document.createElement('div');
    section.className = 'ub-toolbox-groupe';
    section.style.marginBottom = '10px';

    const title = document.createElement('div');
    title.className = 'ub-toolbox-groupe-titre';
    title.style.cssText = 'font-weight: 600; margin-bottom: 4px; color: #555';
    title.textContent = libelle;
    section.appendChild(title);

    for (const entry of visible) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ub-outil';
      button.title = entry.description || entry.libelle;
      button.style.cssText = [
        'display: flex',
        'align-items: center',
        'gap: 6px',
        'width: 100%',
        'padding: 4px 6px',
        'border: 1px solid transparent',
        'background: none',
        'cursor: pointer',
        'text-align: left',
        'font: inherit'
      ].join(';');

      if (entry.tool.cle) {
        button.dataset.cle = entry.tool.cle;
      }
      button.dataset.kind = entry.tool.kind;

      const icon = document.createElement('span');
      icon.className = 'ub-outil-icone';
      icon.style.cssText = 'width: 18px; height: 18px; flex: 0 0 18px';

      if (entry.icone) {
        if (entry.icone.trim().startsWith('<svg')) {
          icon.innerHTML = entry.icone;
        } else {
          const img = document.createElement('img');
          img.src = entry.icone;
          img.alt = '';
          img.style.cssText = 'width: 100%; height: 100%';
          icon.appendChild(img);
        }
      }

      const label = document.createElement('span');
      label.className = 'ub-outil-libelle';
      label.textContent = entry.libelle;

      button.appendChild(icon);
      button.appendChild(label);

      button.addEventListener('click', () => this._arm(button, entry.tool));

      section.appendChild(button);
    }

    this._list.appendChild(section);
  }
}
