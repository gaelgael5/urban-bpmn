"""`pip install urban-bpmn` puis `mount(app, chemin)` :
le JS (et les types) sont servis à ce chemin."""

from starlette.applications import Starlette
from starlette.testclient import TestClient

import urban_bpmn


def test_mount_serves_the_component():
    app = Starlette()
    urban_bpmn.mount(app, "/api/bpmn")

    client = TestClient(app)

    response = client.get("/api/bpmn/urban-bpmn.js")
    assert response.status_code == 200
    assert "urban-bpmn" in response.text

    types = client.get("/api/bpmn/types/contract/types.d.ts")
    assert types.status_code == 200
    assert "Delegates" in types.text


def test_version_is_pinnable():
    assert urban_bpmn.__version__
