# Race Ahead · project website

Static page for the demo paper (the link the demo track requires). It follows the demo video, but everything on it is
native: the system diagram (HTML, details on hover or tap), the round explorer, the branch lineage and the results are
drawn by `site.js` from the live demo's data (`demo/data.js`, run `crude2-selfonly/s1`). The only embedded videos are game
footage: recorded laps replayed in SuperTuxKart by `scripts/evolve/footage.py`, synced in the page, with lap times that
match the records. The 2:30 demo video is linked, not embedded. The live demo (`web/evolve`) is copied to `demo/`.

- `index.html`, `style.css`, `site.js`, `laps.js` (zengarden: champions after rounds 0, 7, 11, 14, 40 and the oracle),
  `laps-unseen.js` (snowmountain: round 0, final champion, oracle), `fonts/`.
- `media/`: `lap-*.mp4` (zengarden), `sm-*.mp4` (snowmountain), `race-ahead-demo.mp4` (the video).
- Host the folder as is (GitHub Pages from the repository root; `.nojekyll` keeps every file as is) or serve it with any
  static server, e.g. `python3 -m http.server`.
- This repository holds the built site only. It is generated in the code repository
  ([car-racing-with-continual-learning](https://github.com/RunRiotComeOn/car-racing-with-continual-learning)) by
  `sh scripts/build_site.sh` (copies the live demo) or `sh scripts/build_site.sh --media` (also the media) into its `site/`
  folder, then copied here: `rsync -a --delete --exclude .git --exclude .nojekyll --exclude .gitignore --exclude README.md --exclude .DS_Store <code repo>/site/ ./`.
