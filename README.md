# PP Lab — Paradox & Possibility Lab

悖论与可能性实验室。一个纯静态的哲学思想实验工作台，第一阶段聚焦「核心链路」。

在线预览：https://kirmarainch.github.io/pp-lab/

## 当前已实现

- **黑箱室 3D 舞台**：React Three Fiber 场景，条件驱动材质、光路与实体；相机预设可切换。
- **SceneSpec 1.0**：实体、条件、绑定、注释、相机预设的可校验数据结构；条件与场景属性通过声明式 binding 连接。
- **2D 降级**：WebGL 不可用时，使用同一份 SceneSpec 渲染 SVG 图解。
- **本地工作台**：判断（claim）、三个立场槽位、探针占位卡、异议处理动作。
- **反例轨道**：每次回应 / 修订 / 保留都会生成版本；支持手动保存版本与回溯，回溯本身也留档。
- **本地持久化**：IndexedDB（Dexie）；JSON 导出已接通，导入待补。
- **响应式外壳**：顶栏、左栏前提、中央舞台、右栏判断、底部反例轨道。
- **明暗双主题**：浅色陶瓷 / 深色石墨工作台，3D 与 2D 场景同步切换，主题选择本地保存。

## 内容占位

按当前约定，所有场景叙事与探针文案均为占位，等待用户定稿：

- 场景标题、对象名称、条件名称与注释：`src/lib/seed.ts`
- 立场名称、说明、追问：`src/lib/content.ts`
- 探针正文占位：`src/lib/content.ts` 的 `PROBE_PLACEHOLDER`
- 条件读数只显示「条件 A：关 · 条件 B：关」这类结构状态，不生成叙事文案。

默认示例是**可替换的种子**（`SEED 01`），不是固定的「主案例」。

## 开发

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run typecheck
npm run build
npm run preview
```

技术栈：Vite + React + TypeScript、Tailwind CSS v4、React Three Fiber / drei、Zustand、Zod、Dexie。

## 部署到 GitHub Pages

仓库内已包含 `.github/workflows/deploy.yml`：

1. 在 GitHub 创建仓库（Pages 免费额度通常要求仓库公开）。
2. 推送 `main` 分支。
3. 在仓库 **Settings → Pages** 中把 Source 设为 **GitHub Actions**。
4. 工作流会构建 `dist/` 并发布；Vite 使用相对 base，可直接部署在项目子路径下。

视频与本地大文件不进入仓库（见 `.gitignore`）；它们只保留在本目录。

## 数据与隐私

- 目前没有模型调用，也没有任何 API key。
- 实验状态只写入浏览器 IndexedDB；导出的 JSON 只包含实验与版本数据。
- 后续接入模型时，按 brief 的约束：会话级密钥、仅浏览器直连、明确 CORS 要求与费用确认，不写入导出、日志或错误报告。

## 已知边界（本阶段）

- 探针正文、立场内容、场景文案均为占位。
- 尚未接入模型；「探针」目前只完成结构、快照与版本链路。
- 论证图、更多场景族、完整导演模式尚未进入本阶段。
- 没有正式测试矩阵、录屏测试或外部内测（按项目范围约定）。

## 图标

`public/icon.png` 与 `public/icon-512.png` 为透明背景点阵图标（按项目原始图标重绘，最近邻放大，无 JPEG 白边或半透明残色；原图未被修改）。
