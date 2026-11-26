/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The "atelier" palette: the workshop subset of BPMN, readable by
 * business people — start / end events, message and timer
 * intermediate events, the four everyday tasks, sub-process,
 * exclusive and parallel gateways, pool (lanes come with the pool's
 * context pad), data object and data store, text annotation. Flows
 * (sequence, message, association) are drawn with the connect tool
 * and the context pad, as usual in bpmn-js.
 *
 * Elements outside this palette are not proposed for creation, but a
 * process containing them still opens, renders and edits without any
 * loss: only the creation entries change.
 */

type PaletteEntries = Record<string, unknown>;

/** Default bpmn-js entries kept as they are, in display order. */
const KEPT_ENTRIES = [
  'hand-tool',
  'lasso-tool',
  'space-tool',
  'global-connect-tool',
  'tool-separator',
  'create.start-event',
  'create.end-event'
];

const KEPT_ENTRIES_AFTER = [
  'create.exclusive-gateway',
  'create.task',
  'create.subprocess-expanded',
  'create.participant-expanded',
  'create.data-object',
  'create.data-store'
];

export class AtelierPaletteProvider {

  static $inject = [ 'palette', 'create', 'elementFactory' ];

  private _create: any;
  private _elementFactory: any;

  constructor(palette: any, create: any, elementFactory: any) {
    this._create = create;
    this._elementFactory = elementFactory;

    palette.registerProvider(this);
  }

  getPaletteEntries(): (entries: PaletteEntries) => PaletteEntries {
    return (entries: PaletteEntries) => {
      const atelier: PaletteEntries = {};

      for (const key of KEPT_ENTRIES) {
        if (entries[key]) {
          atelier[key] = entries[key];
        }
      }

      atelier['create.intermediate-message-event'] = this._createAction(
        'bpmn:IntermediateCatchEvent',
        'event',
        'bpmn-icon-intermediate-event-catch-message',
        'Créer un événement intermédiaire message',
        { eventDefinitionType: 'bpmn:MessageEventDefinition' }
      );

      atelier['create.intermediate-timer-event'] = this._createAction(
        'bpmn:IntermediateCatchEvent',
        'event',
        'bpmn-icon-intermediate-event-catch-timer',
        'Créer un événement intermédiaire minuterie',
        { eventDefinitionType: 'bpmn:TimerEventDefinition' }
      );

      for (const key of KEPT_ENTRIES_AFTER) {
        if (entries[key]) {
          atelier[key] = entries[key];
        }
      }

      atelier['create.parallel-gateway'] = this._createAction(
        'bpmn:ParallelGateway',
        'gateway',
        'bpmn-icon-gateway-parallel',
        'Créer une passerelle parallèle'
      );

      atelier['create.user-task'] = this._createAction(
        'bpmn:UserTask',
        'activity',
        'bpmn-icon-user-task',
        'Créer une tâche utilisateur'
      );

      atelier['create.service-task'] = this._createAction(
        'bpmn:ServiceTask',
        'activity',
        'bpmn-icon-service-task',
        'Créer une tâche service'
      );

      atelier['create.manual-task'] = this._createAction(
        'bpmn:ManualTask',
        'activity',
        'bpmn-icon-manual-task',
        'Créer une tâche manuelle'
      );

      atelier['create.text-annotation'] = this._createAction(
        'bpmn:TextAnnotation',
        'artifact',
        'bpmn-icon-text-annotation',
        'Créer une annotation de texte'
      );

      return atelier;
    };
  }

  private _createAction(
    type: string,
    group: string,
    className: string,
    title: string,
    options: Record<string, unknown> = {}
  ): unknown {
    const listener = (event: unknown) => {
      const shape = this._elementFactory.createShape({ type, ...options });

      this._create.start(event, shape);
    };

    return {
      group,
      className,
      title,
      action: {
        dragstart: listener,
        click: listener
      }
    };
  }
}

export default {
  __init__: [ 'atelierPaletteProvider' ],
  atelierPaletteProvider: [ 'type', AtelierPaletteProvider ]
};
