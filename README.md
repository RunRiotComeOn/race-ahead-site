# Race Ahead · project website

Static page for the demo paper (the link the demo track requires). It follows the demo video, but everything on it is
native: the system diagram (HTML, details on hover or tap), the round explorer, the branch lineage and the results are
drawn by `site.js` from the run's data (`data.js`, run `crude2-selfonly/s1`, exported by `scripts/evolve/demo_export.py`). The only embedded videos are game
footage: recorded laps replayed in SuperTuxKart by `scripts/evolve/footage.py`, synced in the page, with lap times that
match the records. The 2:30 demo video is linked, not embedded.

- `index.html`, `style.css`, `site.js`, `data.js`, `laps.js` (zengarden: champions after rounds 0, 7, 11, 14, 40 and the oracle),
  `laps-unseen.js` (snowmountain: round 0, final champion, oracle), `fonts/`.
- `play/`: the playable race. The visitor drives a kart on the road of cornfield_crossing (an unseen track) against a
  replay of the frozen champion's recorded lap; the small window plays that lap in the game (`media/cc-r40.mp4`) with
  Jev's recorded answers. `play/track.js` comes from `scripts/evolve/play_export.py`; the player's kart has the game
  kart's top speed, acceleration and turning radius, plus a grip limit set so that an autopilot laps in about 55.9 s
  (champion 56.9 s, game AI 54.0 s). three.js is loaded from jsDelivr. `play/scenery/` is the track's real scenery
  (every model of its scene.xml, merged by texture) from `scripts/evolve/play_scenery.py`; it is SuperTuxKart art under
  CC-BY-SA 4.0 with the authors in `play/scenery/LICENSE.txt`.; `play/kart/` is the game's Tux kart (the one the system
  drives), the player's copy recoloured blue (`--kart tux`).
- `media/`: `lap-*.mp4` (zengarden), `sm-*.mp4` (snowmountain), `cc-r40.mp4` (cornfield_crossing, for `play/`),
  `race-ahead-demo.mp4` (the video).
- Host the folder as is (GitHub Pages from the repository root; `.nojekyll` keeps every file as is) or serve it with any
  static server, e.g. `python3 -m http.server`.
- This repository holds the built site only. It is generated in the code repository
  ([car-racing-with-continual-learning](https://github.com/RunRiotComeOn/car-racing-with-continual-learning)) by
  `sh scripts/build_site.sh` (copies `web/evolve/data.js`) or `sh scripts/build_site.sh --media` (also the media) into its `site/`
  folder, then copied here: `rsync -a --delete --exclude .git --exclude .nojekyll --exclude .gitignore --exclude README.md --exclude .DS_Store <code repo>/site/ ./`.
