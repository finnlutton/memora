# Home gallery demo assets

Drop images into this folder using these exact filenames. The homepage
gallery-reveal section on `/` reads from here.

## Required filenames

Gallery cover (1):
- `gallery-cover.jpg`

Subgallery covers (3):
- `subgallery-1-cover.jpg`
- `subgallery-2-cover.jpg`
- `subgallery-3-cover.jpg`

Scenes (9 — three per subgallery):
- `scene-1-1.jpg`, `scene-1-2.jpg`, `scene-1-3.jpg`
- `scene-2-1.jpg`, `scene-2-2.jpg`, `scene-2-3.jpg`
- `scene-3-1.jpg`, `scene-3-2.jpg`, `scene-3-3.jpg`

## Recommendations

- Format: `.jpg` preferred (filenames above assume `.jpg`)
- Gallery cover: landscape, ~1600×1000+
- Subgallery covers: portrait or square, ~1000×1200+
- Scene images: landscape, ~1200×900+
- Until a file exists for a given slot, the UI shows a soft neutral
  placeholder — no broken-image icons.

## Edit text

Titles, descriptions, and captions live in
`lib/home-gallery-demo-data.ts`. Edit that single file to change any
copy across the gallery, subgalleries, or scenes.
