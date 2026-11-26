"""urban-bpmn — BPMN 2.0 process editor web component.

The package embeds the built JS (and its TypeScript types) of the
``<urban-bpmn>`` custom element, and serves them from a FastAPI /
Starlette application::

    import urban_bpmn
    urban_bpmn.mount(app, "/api/bpmn")

The page then loads ``<path>/urban-bpmn.js`` (ES module) and uses the
``<urban-bpmn>`` element.
"""

from pathlib import Path

__version__ = "0.1.0"

STATIC_DIR = Path(__file__).parent / "static"


def mount(app, path: str = "/api/bpmn") -> None:
    """Serves the component's built assets at ``path``.

    ``app`` is a FastAPI or Starlette application. The JS module is
    then available at ``{path}/urban-bpmn.js`` and the TypeScript
    types under ``{path}/types/``.
    """

    from starlette.staticfiles import StaticFiles

    app.mount(path, StaticFiles(directory=STATIC_DIR), name="urban-bpmn")
