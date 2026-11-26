# urban-bpmn

BPMN 2.0 process editor, delivered as a web component and built on
[bpmn-js](https://github.com/bpmn-io/bpmn-js), the BPMN modeler of the
[bpmn.io](https://bpmn.io) project.

`urban-bpmn` is developed for [Ossie-studio]-style hosts: the host owns the
objects and provides the toolbox; the component displays and edits BPMN 2.0
processes and hands the XML back. The component never touches the disk — the
host reads and writes the files.

## Built on bpmn.io

This repository does **not** fork or copy bpmn-js: it declares it as a
dependency, configures it and extends it.

| Library | Role | License |
|---------|------|---------|
| [bpmn-js](https://github.com/bpmn-io/bpmn-js) | BPMN 2.0 modeler (rendering, editing) | [bpmn.io license](https://github.com/bpmn-io/bpmn-js/blob/main/LICENSE) — MIT-style; the bpmn.io watermark in rendered diagrams must be kept |
| [bpmn-moddle](https://github.com/bpmn-io/bpmn-moddle) | Reading and writing BPMN 2.0 XML | MIT |
| [diagram-js](https://github.com/bpmn-io/diagram-js) | Diagram engine (via bpmn-js) | MIT |

## Format

Standard **BPMN 2.0 XML**, diagram interchange (`bpmndi`) included, both as
input and output. Files open in any BPMN tool.

## Contract

The full contract lives in the published TypeScript types
([`src/contract/types.ts`](./src/contract/types.ts)); the facade is
`UrbanBpmnEditor`. Summary:

**Inputs.**
`new UrbanBpmnEditor({ container, delegates?, readOnly?, palette? })`, then
`load(xml?, { references? })`:

- an empty (or missing) XML loads a new process with a start event; any
  valid BPMN 2.0 XML is accepted, including exports from other tools;
- `references` lists the host objects the process references
  (`{ cle, nom, type }`): an element attached to a key displays — and
  exports — the up-to-date `nom`, even when the XML carries an older one;
- `readOnly` allows exploring (zoom, pan, click) but no modification;
- `palette` picks `'atelier'` (default) or `'complete'`.

**Delegates** (functions provided by the host, all optional — a missing
delegate disables the interaction):

| Delegate | Called | Returns |
|----------|--------|---------|
| `toolbox(context)` | to fill the host toolbox | `ToolGroup[]` (`{ cle, libelle, icone }` tools) |
| `drop(cle)` | once per tool drop, with the key | `{ nom, type, genre, membres?, avertissement? }` — `genre` is the BPMN element to create: `participant`, `couloir`, `objet-donnees`, `stockage-donnees` or `collaboration` (then `membres` lists the participants to propose); `avertissement` is shown with an optional action |
| `action(cle, action)` | once when the person clicks a warning's action | — |
| `attach(context)` | to attach an existing element to a host object | `ReferencedObject` or `null` |

**Outputs.**
`save()` returns the current process as standard BPMN 2.0 XML (references
included); `exportSvg()` returns an SVG image. Events (`on` / `off`):
`changed` — exactly one per modification, none in read-only mode or during
load; `selection` — `{ cle?, elementId, type }`, cleared as
`{ elementId: undefined, type: null }`; `import.done` — `{ warnings }`.

**Errors.** An invalid XML is refused (`load` rejects) with the
bpmn-moddle message; import warnings are returned and emitted to the host.

**References in the XML.** The attachment to host objects travels in two
extension attributes on the BPMN element, under the namespace
`https://github.com/gaelgael5/urban-bpmn/schema/1.0` (prefix `urban`):
`urban:cle` (functional key) and `urban:type` (host type slug). Everything
else is plain BPMN 2.0.

## Engine alignment with urban-archimate

Both editors must run on the same diagram engine generation:

- `urban-bpmn`: bpmn-js `^18.33.1` → diagram-js `^15.30.0`
- [`urban-archimate`](https://github.com/gaelgael5/urban-archimate): diagram-js `^15.30.1`

Both resolve to **diagram-js major version 15**. When bumping bpmn-js here,
check that the diagram-js major version still matches urban-archimate.

## Development

```bash
npm install
npm run lint        # ESLint
npm run typecheck   # TypeScript, no emit
npm test            # Vitest: unit (Node) + browser (real Chromium via Playwright)
npm run build       # Vite library build (ES module) + type declarations
npm run all         # all of the above
```

The browser tests run in a real Chromium through Playwright. In an
environment with a pre-installed Chromium, point the tests at it:

```bash
CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium npm test
```

Continuous integration runs lint, typecheck, tests and build on every push
(GitHub Actions, [.github/workflows/ci.yml](./.github/workflows/ci.yml)).

## Roadmap

See the backlog of the epic "Éditeur BPMN en composant web, sur bpmn-js":
component contract (XML in / XML out, delegates, references), workshop
palette and element properties, host-provided toolbox and drop delegate,
`<urban-bpmn>` custom element published on PyPI as `urban-bpmn` with
`mount(app, path)`, demo page.

## License

MIT (see [LICENSE](./LICENSE)). bpmn-js remains under the
[bpmn.io license](https://github.com/bpmn-io/bpmn-js/blob/main/LICENSE).

[Ossie-studio]: https://github.com/gaelgael5
