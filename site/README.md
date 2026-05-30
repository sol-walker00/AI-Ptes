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

客户端安装包链接配置在 `src/downloads.ts`。当 macOS 或 Windows 下载地址为空时，页面会显示禁用下载按钮和“客户端安装包即将开放”。
