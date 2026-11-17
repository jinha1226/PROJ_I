# pixelfx (vendored)

Effects from https://github.com/patch-gg/pixelfx (commit a841596), MIT. See LICENSE and NOTICE.md. Keep both in any release.
`src/` holds only the files the game uses. To add an effect, copy it here, list it in `entry.js`, and rebuild:

    npx esbuild@0.25.10 entry.js --bundle --format=iife --minify-syntax --outfile=pixelfx.bundle.js
