/**
 * Public contract of the urban-bpmn component.
 *
 * The component receives a standard BPMN 2.0 XML (diagram interchange
 * included) and the list of host objects the process references; it
 * renders and edits the process and hands a standard BPMN 2.0 XML
 * back. The host reads and writes the files and stays the only source
 * of the objects. The component never touches the disk and does not
 * know Ossie-studio: it only knows an XML and delegates.
 *
 * The API names (options, methods, events, delegates) are shared with
 * urban-archimate: `container` / `delegates` / `readOnly`, `load` /
 * `save`, `on` / `off`, the `changed` / `selection` / `import.done`
 * events, the `toolbox` / `drop` delegates, the `cle` / `libelle` /
 * `icone` / `nom` field names.
 */

// ---------------------------------------------------------------------------
// Keys and references
// ---------------------------------------------------------------------------

/**
 * Functional key of a host object: uppercase letters, digits and
 * dashes, unique in the host space (e.g. `APP-BOUTIQUE`).
 */
export type ObjectKey = string;

/** Pattern every {@link ObjectKey} must match. */
export const OBJECT_KEY_PATTERN = /^[A-Z0-9][A-Z0-9-]*$/;

/**
 * A host object referenced by the process: what the host passes at
 * load so the component displays up-to-date names, and what the
 * `attach` delegate returns.
 */
export interface ReferencedObject {

  /** Functional key, unique in the host space. */
  cle: ObjectKey;

  /** Up-to-date display name. */
  nom: string;

  /** Host space type slug. */
  type?: string;
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

/** Palette to display: the workshop subset or the full bpmn-js palette. */
export type PaletteChoice = 'atelier' | 'complete';

/** Options accepted by {@link ../editor/UrbanBpmnEditor.UrbanBpmnEditor}. */
export interface EditorOptions {

  /** DOM element the diagram is rendered into. */
  container: HTMLElement;

  /** Functions provided by the host (toolbox, drop, action, attach). */
  delegates?: Delegates;

  /**
   * Read-only mode: the diagram can be explored (zoom, pan,
   * selection) but not modified, and no modification event is emitted.
   */
  readOnly?: boolean;

  /** Palette choice; defaults to `'atelier'`. */
  palette?: PaletteChoice;
}

/** Options accepted by `load`. */
export interface LoadOptions {

  /**
   * Host objects referenced by the process (key, up-to-date name,
   * type). An element attached to one of these keys displays — and
   * exports — this name, even when the XML carries an older one.
   */
  references?: ReferencedObject[];
}

// ---------------------------------------------------------------------------
// Delegates (functions provided by the host)
// ---------------------------------------------------------------------------

/** One tool of the toolbox. */
export interface Tool {

  /** Key passed back to the drop delegate. */
  cle: string;

  libelle: string;

  /** Icon provided by the host: an URL or inline SVG markup. */
  icone?: string;

  /** Description shown when hovering the tool. */
  description?: string;
}

/** A group of tools. */
export interface ToolGroup {
  id: string;
  libelle?: string;
  outils: Tool[];
}

/** Context passed to the toolbox delegate. */
export interface ToolboxContext {

  /** Palette currently displayed. */
  palette?: PaletteChoice;
}

/**
 * Kind of BPMN element the host asks the component to create when a
 * tool is dropped.
 */
export type DropGenre =
  | 'participant'
  | 'couloir'
  | 'objet-donnees'
  | 'stockage-donnees'
  | 'collaboration';

/** A warning the host may attach to a drop, with an optional action. */
export interface Avertissement {

  /** Human message displayed by the component. */
  message: string;

  /** Action offered with the warning. */
  action?: {

    /** Identifier passed back to the action delegate. */
    id: string;

    libelle: string;
  };
}

/**
 * A member the host proposes with a collaboration: a host object plus
 * the kind of BPMN element to create for it.
 */
export interface CollaborationMembre extends ReferencedObject {

  /** Kind of BPMN element to create for this member. */
  genre: DropGenre;
}

/** What the host returns when a tool is dropped. */
export interface DropResult {

  /** Display name of the object. */
  nom: string;

  /** Host space type slug (kept in the XML extension). */
  type?: string;

  /** Kind of BPMN element to create. */
  genre: DropGenre;

  /**
   * Members to propose when `genre` is `'collaboration'`: the
   * component shows them as checkboxes (already-placed members are
   * skipped) and creates the checked ones as if dropped one by one.
   */
  membres?: CollaborationMembre[];

  /** Warning displayed by the component, with an optional action. */
  avertissement?: Avertissement;
}

/** Context passed to the attach delegate. */
export interface AttachContext {

  /** Id of the BPMN element to attach. */
  elementId: string;

  /** BPMN type of the element (e.g. `bpmn:Participant`). */
  type: string;

  /** Key currently attached, if any. */
  cle?: ObjectKey;
}

/**
 * The delegates the host provides. The component never invents what a
 * delegate should have answered: a missing delegate disables the
 * corresponding interaction.
 */
export interface Delegates {

  /** Content of the host toolbox. */
  toolbox?: (context: ToolboxContext) => Promise<ToolGroup[]> | ToolGroup[];

  /** Called once, with the tool key, when a tool is dropped. */
  drop?: (cle: string) => Promise<DropResult> | DropResult;

  /**
   * Called once, with the key and the action id, when the person
   * clicks the action of a warning.
   */
  action?: (cle: string, action: string) => Promise<void> | void;

  /**
   * Called when the person asks to attach an existing element to a
   * host object; returns the object, or `null` when the person
   * cancelled on the host side.
   */
  attach?: (
    context: AttachContext
  ) => Promise<ReferencedObject | null> | ReferencedObject | null;
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

/** What the save method returns; the host writes the file. */
export interface SaveResult {

  /**
   * The current process as standard BPMN 2.0 XML, diagram interchange
   * and references (`urban:cle` / `urban:type` extension attributes)
   * included.
   */
  xml: string;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** Emitted on every modification (for the host "modified" indicator). */
export interface ChangedEvent {

  /** What changed; always `'model'` for urban-bpmn. */
  scope: string;
}

/** Emitted when an element is selected (or the selection is cleared). */
export interface SelectionEvent {

  /** Key of the attached host object, if the element carries one. */
  cle?: ObjectKey;

  /** Id of the selected BPMN element; `undefined` when cleared. */
  elementId?: string;

  /** BPMN type (e.g. `bpmn:UserTask`); `null` when cleared. */
  type?: string | null;
}

/** Emitted once per import, with the bpmn-js warnings. */
export interface ImportDoneEvent {
  warnings: unknown[];
}

/** Event names used by the component. */
export type EventName = 'changed' | 'selection' | 'import.done';
