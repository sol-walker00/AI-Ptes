# 桌面 AI 宠物

一个桌面优先的 QQ 宠物式 AI 伴侣原型。宠物窗口常驻桌面，设置窗口提供模型供应商中心，聊天窗口提供更完整的对话体验。

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

- `供应商`：默认 `DeepSeek`
- `模型`：默认 `deepseek-v4-flash`
- `API key`：按供应商分别存入系统钥匙串，不写入本地 JSON
- `高级设置`：可查看或调整 Base URL、协议和自定义供应商鉴权

内置供应商包括 DeepSeek、OpenAI、Anthropic、Gemini、Qwen/百炼、Kimi/Moonshot、Z.AI/GLM、OpenRouter、SiliconFlow、Ollama/本地和自定义端点。宠物状态、模型设置和记忆摘要会保存在应用数据目录，API key 只保存在系统安全存储中。

## 领养档案导入

首次启动桌面 App 时，如果本地还没有宠物，设置窗口会自动打开并显示导入入口。选择从领养站下载的 `adoption.pet` 后，App 会把档案转换成本地宠物资料、初始状态、空记忆和当天照顾任务。

`.pet` 文件只包含宠物出生档案，不包含 API key、聊天记录、长期记忆或成长状态。模型供应商和 API key 仍然在桌面 App 本机设置。

## 验证

```bash
npm run test:run
npm run build
cd src-tauri
cargo test
```
