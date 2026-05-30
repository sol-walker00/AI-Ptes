# Desktop AI Pet Adoption

This repository is a V1 pet adoption flow:

- `site/` is the adoption website. Users design a desktop pet, download `adoption.pet`, and download the desktop client.
- `app/` is the Tauri desktop client. Users import `adoption.pet` on first launch and bring the pet onto their own desktop.

## Local Development

Run the adoption site:

```bash
cd site
npm install
npm run dev
```

Run the desktop client:

```bash
cd app
npm install
npm run tauri:dev
```

## Verify

```bash
cd site
npm run test:run
npm run build -- --base ./

cd ../app
npm run test:run
cd src-tauri
cargo test
```

## GitHub Deployment

1. Create an empty GitHub repository.
2. Add the repository as `origin`:

```bash
git remote add origin git@github.com:YOUR_NAME/YOUR_REPO.git
git push -u origin main
```

3. In GitHub, open **Settings > Pages** and set **Build and deployment > Source** to **GitHub Actions**.
4. The `adoption site pages` workflow deploys `site/` to GitHub Pages on every `main` push.
5. To build and publish desktop client downloads, push a release tag:

```bash
git tag desktop-ai-pet-v0.1.0
git push origin desktop-ai-pet-v0.1.0
```

The `desktop release` workflow builds macOS and Windows zip files and uploads them to a draft GitHub Release.
