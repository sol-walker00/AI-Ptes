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

If you already have an empty GitHub repository, publish with its remote URL:

```bash
scripts/publish-github.sh git@github.com:YOUR_NAME/YOUR_REPO.git
```

If this machine has authenticated GitHub CLI (`gh`) or `GH_TOKEN` / `GITHUB_TOKEN` / `GITHUB_PAT` with repository creation permission, the script can create the public repository first:

```bash
scripts/publish-github.sh --create --repo-name desktop-ai-pet-adoption
```

The script adds `origin` when needed, pushes `main`, creates `desktop-ai-pet-v0.1.0` if it does not exist, and pushes that tag.

After the first push, open **Settings > Pages** in GitHub and set **Build and deployment > Source** to **GitHub Actions**. The `adoption site pages` workflow deploys `site/` to GitHub Pages on every `main` push. The `desktop release` workflow builds macOS and Windows zip files and uploads them to a draft GitHub Release when the release tag is pushed.
