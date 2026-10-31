# Portfolio (placeholder)

A static portfolio site with six clearly labeled placeholder projects. Plain HTML, one CSS file and a small vanilla JS file. No build step, no dependencies.

## Files

```
portfolio/
  index.html          Home page: intro and project grid
  project.html        Detail page, opened as project.html?id=<id>
  data/projects.json  All project content
  css/styles.css      Design tokens, layout and components
  js/app.js           loadProjects, renderGrid, renderDetail
  images/             Local SVG placeholder art
```

## Run locally

The pages load `data/projects.json` with `fetch`, so open them through a local server rather than straight from the file system.

From the repo root:

```
python3 -m http.server 8000
```

Then open http://localhost:8000/portfolio/ in a browser.

## Add a project

1. Open `data/projects.json`.
2. Add an object to the array:

   ```json
   {
     "id": "my-new-project",
     "title": "My New Project",
     "summary": "One sentence for the card.",
     "description": "A few sentences for the detail page.",
     "tags": ["Web", "Design"],
     "year": 2026,
     "status": "Placeholder"
   }
   ```

3. Keep `id` unique and URL friendly (lowercase letters, numbers and hyphens). It becomes `project.html?id=my-new-project`.
4. Optionally add a matching link to the `<noscript>` list in `index.html` so the no-JavaScript fallback stays complete.

Cards cycle through six CSS gradient thumbnails (`.thumb--1` to `.thumb--6` in `styles.css`). JSON files can't hold comments, so `projects.json` has none.

## Deploy

- It's a fully static site. Serve the `portfolio/` folder from any static host or web server (nginx, Apache, GitHub Pages, an object storage bucket and so on).
- All paths are relative, so it works at the domain root or under a subpath such as `/portfolio/`.
- No environment variables, no secrets, no server-side code.
- With nginx, the default config is enough. `index.html` is picked up as the directory index, and `.json` is served as `application/json` by the standard `mime.types`.

### Branch flow

`main` auto-deploys the live site, so changes reach it in three steps:

1. Work on a feature branch (for example `feature/portfolio`).
2. Open a pull request into `staging` and merge it there to check the change.
3. When staging looks right, open a pull request from `staging` into `main`.

Never commit or push straight to `main`.
