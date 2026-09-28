# .well-known

PWABuilder gives you a file called `assetlinks.json` when it builds the Android app.
Upload it into this folder, so it is served at:

    https://medsoft.cc.cd/.well-known/assetlinks.json

It proves the app and the website belong together, which lets Android hide the
browser address bar. Without it the app still works, but shows a thin URL bar at the top.
(The `.nojekyll` file in the repo root is what lets GitHub Pages serve this folder.)
