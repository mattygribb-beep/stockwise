# Source Stack Storefront Scout 0.4.2

This version uses the public production API at
`https://stockwise-roan-gamma.vercel.app` and restores a saved detail queue
before processing messages after a background worker restart.

## Update an existing installation

1. Extract the downloaded ZIP into a permanent folder.
2. Replace the files in the folder used by the existing unpacked extension.
3. Open `chrome://extensions` (or `edge://extensions`) and click Reload on
   Source Stack Storefront Scout. Keep the existing extension installed so
   its saved progress remains available.
4. Refresh the Amazon tab, open the Scout side panel and click Resume, or
   select the seller and start its pending detail scan.

For a first installation, enable Developer mode and choose Load unpacked,
then select the extracted folder containing `manifest.json`.

The API is deployed separately from this extension. Queue and save endpoints
are `/api/storefront-product-details`; storefront checkpoints use
`/api/storefront-scout`. Captured products remain separate from verified
supplier identities and buying decisions.

## Verification

Run `node --test scripts/scanner-api.test.cjs` from the repository root.
The tests cover queue loading, JSON errors, catalogue membership, preservation
of blank identifiers, sequential checkpoints, worker recovery and save failure.

The downloadable ZIP in `public/downloads` contains this extension directory.
