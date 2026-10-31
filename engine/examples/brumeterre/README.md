# Brumeterre — an example guichet

The knowledge base of an invented community of map-makers, "Les Cartographes de Brumeterre",
in French. It is used by the tests (`test/brumeterre.test.mjs`) and is a ready-made way to try the
Guichet:

```sh
GUICHET_DOCS=examples/brumeterre GUICHET_PROVIDER=compatible \
GUICHET_BASE_URL=https://oai.endpoints.kepler.ai.cloud.ovh.net/v1 GUICHET_MODEL=Mistral-Small-3.2-24B-Instruct-2506 \
GUICHET_API_KEY=... node bin/guichet.mjs --relay https://site.example/guichet/sage-du-phare
```

`admin-serveur.md` holds a fake password on purpose: it must never reach the model nor an answer.
