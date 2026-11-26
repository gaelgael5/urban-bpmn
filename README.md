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
