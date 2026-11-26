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

The **workshop palette** (`'atelier'`) proposes only the BPMN subset
readable by business people: start / end events, message and timer
intermediate events, task / user task / service task / manual task,
sub-process, exclusive and parallel gateways, pool (lanes come with the
pool's context pad), data object, data store, text annotation; flows are
drawn with the connect tool as usual. A process created with the full
palette still opens and edits without loss — elements outside the subset
are simply not proposed for creation. The built-in **property panel**
shows the selected element's name, documentation and — for a task — its
type; the technical bpmn-js properties stay hidden.

**Delegates** (functions provided by the host, all optional — a missing
delegate disables the interaction):

| Delegate | Called | Returns |
|----------|--------|---------|
| `toolbox(context)` | to fill the host toolbox | `ToolGroup[]` (`{ cle, libelle, icone }` tools) |
| `drop(cle)` | once per tool drop, with the key | `{ nom, type, genre, membres?, avertissement? }` — `genre` is the BPMN element to create: `participant`, `couloir`, `objet-donnees`, `stockage-donnees` or `collaboration` (then `membres` lists the participants to propose); `avertissement` is shown with an optional action |
| `action(cle, action)` | once when the person clicks a warning's action | — |
| `attach(context)` | to attach an existing element to a host object | `ReferencedObject` or `null` |

The **host toolbox** renders next to the workshop palette as soon as the
`toolbox` delegate is provided: groups in the host's order, each tool with
its label, icon and key, plus a search box. Arming a tool then clicking
the canvas calls the `drop` delegate once with the key and creates the
element the host asked for, attached to the key: a `participant` is a
black-box pool (it can be detailed later), a `couloir` lands in a
participant (one is created when missing), a `collaboration` attaches the
diagram's collaboration to the key (one per file; replacing asks for
confirmation) and proposes the host's member list as checkboxes, skipping
already-placed members. A host error places nothing and shows the
message.

**Outputs.**
`save()` returns the current process as standard BPMN 2.0 XML (references
included); `exportSvg()` returns an SVG image. Events (`on` / `off`):
`changed` — exactly one per modification, none in read-only mode or during
load; `selection` — `{ cle?, elementId, type }`, cleared as
`{ elementId: undefined, type: null }`; `import.done` — `{ warnings }`.

**Errors.** An invalid XML is refused (`load` rejects) with the
bpmn-moddle message; import warnings are returned and emitted to the host.

**References in the XML.** The attachment to host objects travels inside
`bpmn:extensionElements`, as an
`<urban:reference cle="…" type="…" />` element under the namespace
`https://github.com/gaelgael5/urban-bpmn/schema/1.0` (prefix `urban`) —
`cle` is the functional key, `type` the host type slug, one reference at
most per element. Concerned elements: the collaboration, participants,
lanes, data objects, data stores, tasks, and the process (the key of the
object the process details). A BPMN tool that does not know the extension
ignores it without breaking the file; everything else is plain BPMN 2.0.
Besides dropping a tool (created already attached), an existing element
is attached through the property panel's "Rattacher…" button — the
`attach` delegate opens the host's own picker — and a reference can be
removed; attached elements carry a discreet indicator.

## Engine alignment with urban-archimate

Both editors must run on the same diagram engine generation:

- `urban-bpmn`: bpmn-js `^18.33.1` → diagram-js `^15.30.0`
- [`urban-archimate`](https://github.com/gaelgael5/urban-archimate): diagram-js `^15.30.1`

Both resolve to **diagram-js major version 15**. When bumping bpmn-js here,
check that the diagram-js major version still matches urban-archimate.

## Web component and Python package

The component ships as the `<urban-bpmn>` custom element (shadow DOM:
styles are isolated from the host page; usable without any framework and
from React). The theme follows the host through CSS variables:
`--ub-police` (font), `--ub-texte`, `--ub-fond`, `--ub-bordure`,
`--ub-accent`.

The built assets are published on **PyPI** (not npm) as the
`urban-bpmn` Python package, pinned in the host's `pyproject.toml` and
served from a FastAPI / Starlette application, like `urban-json-editor`:

```python
import urban_bpmn

urban_bpmn.mount(app, "/api/bpmn")
```

```html
<script type="module" src="/api/bpmn/urban-bpmn.js"></script>
<urban-bpmn style="height: 600px"></urban-bpmn>
```

The TypeScript types of the contract are served under
`/api/bpmn/types/`. Publication runs in CI on every `vx.y.z` tag
([.github/workflows/publish.yml](./.github/workflows/publish.yml),
PyPI trusted publishing); see the [CHANGELOG](./CHANGELOG.md).

## Demonstration

A static demonstration host (neutral domain: processing an online order)
lives in [site/](./site) and is published on GitHub Pages at
<https://gaelgael5.github.io/urban-bpmn/> on every push to `main` and
every version tag: sample process, import of a file produced by another
tool, demo toolbox with drop / action / attach delegates, read-only and
palette toggles, live XML view, SVG download.

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
