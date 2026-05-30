# 桌面 AI 宠物

一个桌面优先的 QQ 宠物式 AI 伴侣原型。宠物窗口常驻桌面，设置窗口默认接入 DeepSeek 的 OpenAI-compatible API 配置，聊天窗口提供更完整的对话体验。

## 运行

```bash
npm install
npm run dev
```

浏览器预览可直接访问：

- `http://127.0.0.1:1420/?window=pet`
- `http://127.0.0.1:1420/?window=settings`
- `http://127.0.0.1:1420/?window=chat`

浏览器预览不会读取系统钥匙串，也不会真的调用模型；桌面 App 运行时会走 Tauri 后端。

## 桌面模式

```bash
npm run tauri:dev
```

第一次运行后，在设置窗口里填写：

- `Base URL`：默认 `https://api.deepseek.com`
- `模型`：默认 `deepseek-v4-flash`
- `API key`：存入系统钥匙串，不写入本地 JSON

宠物状态、模型设置和记忆摘要会保存在应用数据目录，API key 只保存在系统安全存储中。

## 验证

```bash
npm run test:run
npm run build
cd src-tauri
cargo test
```
