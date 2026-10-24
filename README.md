# Portfolio V3 — Figma Make handoff

这是第三版的公开交接副本，供 Figma Make 从 GitHub 匿名克隆或下载完整工程。公开仓库：https://github.com/1067805661wei-hub/yiming-portfolio-make-preview 。使用 `figma/home-polish` 分支；`main` 与 `v3-public-baseline` 保存本次交接基准。尚未进行第四版视觉修改，Make 云端读取和运行结果需实际核验。

完整源码、图片、字体、短视频预览与站内简历均包含在此，原私有仓库、完整视频和原始制作素材另行保留。本副本以新建的 Git 历史开始。此前通过 Files 手动上传的六批在云端未齐全，当前应以本仓库为完整来源。匿名读取公共仓库不需要 GitHub token；也不等于已具备向 GitHub 推送的权限。交接约定见 [GitHub 工作流](handoff/GITHUB-WORKFLOW.md)。

## 从这里开始

1. 先读取 `handoff/DESIGN-BRIEF.md`：完整设计目标、问题清单和范围。
2. 将 `handoff/CLAUDE-PROMPT.txt` 全文粘贴到已导入本工程的 Figma Make 对话中。
3. `handoff/SLEEVE-DEMO.md` 说明真正可运行的 UI 演示及其源码。
4. `handoff/IMPORT-WORKFLOW.md` 说明导入、GitHub、下载回本地与验收。

## 运行

推荐 Node.js 22.12+ 或 24；本地打包验证使用 Node 24.14。只用公开 npm 包。

```sh
npm ci
npm run dev
```

默认端口 5173；Figma 提供 `PORT` 时自动使用该端口，监听 `0.0.0.0`。也可传 `--port`。根目录 `index.html` 是入口。

```sh
npm run check:content
npm run build
npm run preview
```

主页 `/`；可交互的 Sleeve 演示 `/demos/sleeve/index.html#/templates`。Sleeve 目前作为独立演示随包提供，尚未改造首页的 UI 封面。

## 工程地图

- `src/main.jsx`：应用、双语切换、哈希路由、项目浮层。
- `src/components/HomeV3.jsx` / `home-v3.css`：当前首页、虚拟滚动、封面、章节。
- `src/components/Preloader.jsx`：0–100 开场。
- `src/components/ProjectV2.jsx`：当前项目展开与媒体展示，第一阶段保留。
- `src/data/*.json`：7 份数据，共 44 条项目记录（含 3 条占位）。
- `src/personal.json`：网站已使用的联系信息、简历与肖像引用。
- `public/assets` / `public/fonts`：现有网站资源与字体许可。
- `public/demos/sleeve`：可直接加载的隔离式 UI 演示。
- `examples/sleeve`：Sleeve 可编辑源码与独立依赖；不要将其 React 19 直接混入主站 React 18。
- `handoff`：完整提示词、问题清单、导入流程、媒体预览清单。

## 与原第三版的区别

页面源码、项目 JSON、图片、字体、站内简历保留。七个 MP4 替换为最多前 8 秒、最大宽度 960px、24fps、无音轨的预览片段，播放路径不变。它们只用于验证封面/视频播放，不代表完整作品。`handoff/media-preview-manifest.json` 记录原片与预览的大小和哈希。原片保留在本地第三版目录，回收 Figma 修改时按路径恢复。

增加通用 Vite 启动配置、内容检查入口、交接文档及 Sleeve 演示。省略 `node_modules`、根目录 `dist`、本机启动器、日志、截图、历史备份和 Adobe/UE 等原始制作文件。依赖可重新安装，构建可重新生成。

请勿把此导入副本理解为全部原始素材库。需要新增素材时，由用户或本地 Codex 另行选取并加入。Figma 云端不能通过本工程读取用户电脑其他文件夹。

## 当前行为需要保留

桌面端（宽度大于 800px）双向无限滚动；移动端原生线性滚动；首页中英切换；Full/Reduced 动效偏好；键盘操作；关闭项目返回先前浏览位置；真实的作品状态和贡献说明。不要把现有移动端线性滚动误报为移动端已实现无限滚动。

## 回收修改

Figma 修改完成后导出代码到新的本地候选目录，比较 `src/` 与配置差异，恢复完整视频并复测后再决定升级。本地旧版、旧素材和此交接快照应继续保留。不要把 Figma 导出的低清预览覆盖原片。
