# urban-bpmn (paquet Python)

BPMN 2.0 process editor web component (`<urban-bpmn>`, built on
[bpmn-js](https://github.com/bpmn-io/bpmn-js)), embedded as built assets
and served from a FastAPI / Starlette application:

```python
import urban_bpmn

urban_bpmn.mount(app, "/api/bpmn")
```

The page then loads the ES module and uses the element:

```html
<script type="module" src="/api/bpmn/urban-bpmn.js"></script>
<urban-bpmn style="height: 600px"></urban-bpmn>
```

Pin the version in `pyproject.toml`: `urban-bpmn==x.y.z`. The TypeScript
types of the contract are served under `/api/bpmn/types/`.

Source, contract and changelog:
[github.com/gaelgael5/urban-bpmn](https://github.com/gaelgael5/urban-bpmn).
