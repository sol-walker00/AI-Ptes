# 桌面宠物领养站

这个站点用于创建桌面宠物的 V1 领养档案。用户在浏览器中设计宠物，下载 `adoption.pet`，再导入桌面 App。

## 运行

```bash
npm install
npm run dev
```

默认开发地址：

- `http://127.0.0.1:5173`

## 验证

```bash
npm run test:run
npm run build
```

## 下载按钮

客户端安装包链接配置在 `src/downloads.ts`。当前仓库内提供 Apple Silicon macOS zip 包和 Windows x64 zip 包：

- `public/downloads/Desktop-AI-Pet-0.1.0-macos-aarch64.zip`
- `public/downloads/Desktop-AI-Pet-0.1.0-windows-x64.zip`

当 macOS 或 Windows 下载地址为空时，页面会显示禁用下载按钮和“客户端安装包即将开放”。

发布构建可以通过环境变量让两个按钮都指向同一个下载目录：

```bash
VITE_DESKTOP_DOWNLOAD_BASE_URL=/downloads npm run build
```

`.github/workflows/desktop-release.yml` 会在 GitHub Actions 里生成：

- `Desktop-AI-Pet-0.1.0-macos-aarch64.zip`
- `Desktop-AI-Pet-0.1.0-windows-x64.zip`
- 内含两个下载包的 `pet-adoption-site` 静态站点 artifact

在推送 `desktop-ai-pet-v*` 标签时，工作流还会把两个桌面客户端下载包上传到同名 GitHub Release。

`.github/workflows/site-pages.yml` 会在 `main` 更新时构建 `site/` 并通过 GitHub Pages 发布领养站。工作流使用 `actions/configure-pages@v5`、`actions/upload-pages-artifact@v4` 和 `actions/deploy-pages@v4`。构建命令是 `npm run build -- --base ./`，因此下载链接会随部署路径生成相对地址，适配仓库 Pages 子路径和自定义域名。
