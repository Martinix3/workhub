# DEPRECATED PARA `https://santa-brisa-erp.web.app/` — NO USAR PARA DEPLOY

Este frontend React/Vite NO está confirmado como source canónico de la URL live de Santa Brisa ERP.

Fuente operativa actual para deploy:

`/Users/martinjaimesamperiz/santabrisa-workhub/public`

Runbook obligatorio:

`/Users/martinjaimesamperiz/santabrisa-workhub/docs/FIREBASE_FRONTEND_SOURCE_OF_TRUTH.md`

Motivo:

- La URL live `https://santa-brisa-erp.web.app/` manda.
- Producción sirve un bundle Vite/React con assets históricos `/assets/index-BbMJsUvQ.js` y `/assets/index-CSRsFkJF.css`.
- Este árbol puede contener código relacionado o parcial, pero no debe usarse por nombre para build/deploy.
- Ya provocó confusión operativa.

Regla:

Si necesitas tocar el frontend de producción, primero compara contra Firebase live. Si no reproduce shell/assets, parar.
