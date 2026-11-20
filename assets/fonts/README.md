# Bundled fonts

All fonts here are licensed under the SIL Open Font License 1.1 (full text in [OFL.txt](OFL.txt)).
Files are the Latin subset, WOFF 1.0, taken from [Fontsource](https://fontsource.org) 5.3.x. WOFF 1.0 (not WOFF2) on purpose:
`pptx.js` turns them back into TrueType with Node's zlib alone to embed them in exported .pptx files.

`build.js` inlines the fonts of the deck theme (`deck.json` `fonts`: `theme` default, `all` for every theme in the switcher, `none`).

| Family | Weights | Used by themes | Copyright |
|---|---|---|---|
| Caladea | 400, 700 | campus-slide | Copyright 2012 The Caladea Project Authors (https://github.com/huertatipografica/Caladea) |
| Carlito | 400, 700 | campus-slide | Copyright 2013 The Carlito Project Authors (https://github.com/googlefonts/carlito) |
| Crimson Pro | 400, 700 | botanical | Copyright 2018 The Crimson Pro Project Authors (https://github.com/Fonthausen/CrimsonPro) |
| Gelasio | 400, 700 | paper, petrol-gold | Copyright 2022 The Gelasio Project Authors (https://github.com/SorkinType/Gelasio) |
| IBM Plex Sans | 400, 700 | slate-rust | Copyright 2019 IBM Corp. All rights reserved. |
| IBM Plex Serif | 400, 700 | slate-rust | Copyright 2020 IBM Corp. All rights reserved. |
| Inter | 400, 700, 800 | paper, parchment-gold, swiss | Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter) |
| JetBrains Mono | 400, 700 | neon | Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono) |
| Jost | 400, 700, 800 | botanical | Copyright 2020 The Jost Project Authors (https://github.com/indestructible-type/Jost) |
| Libre Baskerville | 400, 700 | parchment-gold | Copyright 2012 The Libre Baskerville Project Authors (https://github.com/impallari/Libre-Baskerville) |
| Plus Jakarta Sans | 400, 700, 800 | navy | Copyright 2020 The Plus Jakarta Sans Project Authors (https://github.com/tokotype/PlusJakartaSans) |
| Public Sans | 400, 700, 800 | petrol-gold | Copyright 2015 The Public Sans Project Authors (https://github.com/uswds/public-sans) |
| Source Serif 4 | 400, 700 | navy | © 2014 - 2021 Adobe Systems Incorporated (http://www.adobe.com/), with Reserved Font Name ‘Source’. |
| Space Grotesk | 400, 700 | neon | Copyright 2020 The Space Grotesk Project Authors (https://github.com/floriankarsten/space-grotesk) |
| Work Sans | 400, 700, 800 | terracotta | Copyright 2019 The Work Sans Project Authors (https://github.com/weiweihuanghuang/Work-Sans) |
