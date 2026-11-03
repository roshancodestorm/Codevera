# Studio Design Editor

A dependency-free browser design editor inspired by modern canvas tools. It uses original UI, color systems, and templates rather than copying proprietary Canva assets.

## Run

Open `index.html` in a browser, or serve the folder with:

```powershell
python -m http.server 5173 --bind 127.0.0.1
```

Then visit `http://127.0.0.1:5173`.

## Included

- Dark studio layout with top bar, left tools, asset panel, canvas, zoom controls, and page strip.
- Original predefined templates across presentation, poster, social, story, business, and invitation categories.
- Template search, category filters, brand palettes, page backgrounds, and layer selection.
- Click-to-add photos, text presets, shapes, frames, badges, ribbons, and uploaded images.
- Multi-page design workflow with add page, duplicate page, page switching, undo, and redo.
- Drag, resize, duplicate, delete, layer ordering, magic layout, and selected-object controls.
- Export the active page as `.png` or `.svg`, export all pages as `.ppt`, or save the document as `.json`.
- AI deck pipeline (strategy → outline → per-slide writer) with live preview, AI image generation (local ComfyUI with automatic pollinations.ai cloud fallback), topic-relevant photo search (Unsplash key, Wikimedia Commons fallback, picsum last resort), single-slide regeneration, brand kits, and a local fallback generator.
- PPTX export embeds slide images into the package (internal media parts with external-link fallback), plus hand-rolled OOXML for shapes, text, icons, and charts.

## Next Production Steps

- Add authentication, user projects, cloud uploads, media search APIs, and share links.
- Add server-side AI generation for slide outlines, layouts, copy, and image prompts.
- Add remix/rebrand/persona one-click restyles and a template marketplace.
