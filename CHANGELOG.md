# Journal des changements

Versionnage sémantique. Le paquet est publié sur PyPI
(`pip install urban-bpmn==x.y.z`) à chaque étiquette `vx.y.z`.

## 0.1.0 — non publié

Première version.

- Socle sur bpmn-js 18 (diagram-js 15, aligné sur `urban-archimate`),
  construction Vite, ESLint, TypeScript, tests navigateur (Chromium
  réel) et CI GitHub Actions.
- Contrat du composant : XML BPMN 2.0 standard en entrée et en sortie
  (dessin compris), liste des objets référencés avec noms à jour,
  lecture seule, choix de palette, délégués toolbox / drop / action /
  attach, un événement par modification, export SVG, erreurs
  bpmn-moddle transmises. Conventions d'API partagées avec
  `urban-archimate`.
- Palette d'atelier (sous-ensemble lisible en atelier métier) et
  panneau de propriétés minimal (nom, documentation, type de tâche) ;
  palette bpmn-js complète sur demande.
- Boîte à outils fournie par l'hôte (groupes, libellés, icônes, clés,
  recherche) et délégué de pose : piscine boîte noire, couloir, objet
  et stockage de données, collaboration avec membres à cocher ;
  avertissements non bloquants avec action.
- Références aux objets de l'hôte dans `bpmn:extensionElements`
  (`<urban:reference cle type>`), rattachement et retrait depuis le
  panneau, indicateur discret, extension ignorée sans casse par les
  autres outils BPMN.
- Élément personnalisé `<urban-bpmn>` (shadow DOM, thème par
  variables CSS `--ub-*`) et paquet Python `urban-bpmn` avec
  `mount(app, chemin)` pour FastAPI / Starlette, publié sur PyPI par
  l'intégration continue à chaque étiquette de version.
