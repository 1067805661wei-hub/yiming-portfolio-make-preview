# Sleeve：可运行的交互原型与封面接入说明

此交接包携带真实 Sleeve 应用，供下一轮把「UI 截图」改成「可以操作的封面」。本次打包没有修改首页，也没有把独立应用误称为已完成的交互封面。

## 已交付

- 可编辑源代码：`examples/sleeve/`。
- 预构建运行文件：`public/demos/sleeve/`。
- 启动根作品集后，直接访问 `/demos/sleeve/index.html#/templates`。显式保留 `index.html`：Vite 开发服务器不会为 public 子目录自动寻找 index.html，仅访问目录可能返回根作品集的 SPA 页面。
- 首次访问 editor 时如果没有草稿，会回到模板选择页；选择模板即可进入编辑器。不要用不存在的初始草稿深链制造空白。
- 应用支持 7 个模板（6 个图形模板、1 个照片窗口模板）、文字编辑、字重/字号/位置/配色、照片上传与裁切、PNG 导出。状态只保存在当前浏览器标签的 sessionStorage。
- 默认建筑图像是 AI 生成演示图，不是作品集作者拍摄的照片。出处保存在 `examples/sleeve/public/demo-window.source.txt`。

## 隔离的原因

作品集根工程使用 React 18 / Vite 6；Sleeve 使用 React 19 / Vite 8。它们保留各自 package.json 与依赖，避免直接把两套 React 混入同一个运行树。

可优先用同源 iframe 展示预构建的 Sleeve（`src="/demos/sleeve/index.html#/templates"`）；也可提取 Sleeve 的纯图形与编辑状态，重新制作小型封面组件。不要为了接入一个 UI 封面而重写作品集框架。

此轮没有改动 Sleeve 的 38 个应用源码文件。只改了可移植的构建配置、HTML 外壳、运行命令和公开素材出处中的本机路径，移除了 Figma 原环境脚手架插件依赖；字体许可证随包保留。

## 修改与重新构建

根作品集不需要安装 Sleeve 依赖，即可使用附带的运行文件。只有修改 Sleeve 源码时才需要执行下面步骤。

Node 要求：20.19+，或 22.12+；本次在 Node 24.19.0 验证。推荐 pnpm 10.31.0，使用随包的 pnpm-lock.yaml。

从工程根目录执行：

```sh
npx pnpm@10.31.0 --dir examples/sleeve install --frozen-lockfile
npx pnpm@10.31.0 --dir examples/sleeve run build:demo
npm run build
```

`build:demo` 只更新 `public/demos/sleeve/` 这个生成目录，不修改原始 Sleeve 项目或根工程源码。普通 `build` 只生成 `examples/sleeve/dist/`，可用于独立发布。运行文件采用相对路径，照片使用 Vite BASE_URL，字体全部本地打包，不要求 Google Fonts 或其他远程字体服务。

若需要单独开发 Sleeve：

```sh
npx pnpm@10.31.0 --dir examples/sleeve run dev --port 5193
```

单独开发服务器的入口是 `http://127.0.0.1:5193/#/templates`。这是运行 examples/sleeve 自己的源码；根作品集里的预构建 demo 入口仍使用显式 index.html。

## 下一轮交互封面的约束

1. 封面默认保持作品集的视觉节奏；明确的「试一下 / Try it」入口激活编辑，避免滚轮经过 iframe 就被吞掉。
2. 激活后允许点击、键盘输入与触摸操作，提供清楚的退出方式。Esc 应退出这次内嵌操作并把焦点交还触发按钮；不要破坏应用内部已有弹层优先处理 Esc 的逻辑。
3. 编辑过程中不能被外层无限滚动拖走；退出时恢复原浏览位置。外层页要识别焦点和交互状态，不要让两个滚动控制器同时抢事件。
4. 先懒加载一个实例。不要让首尾循环克隆同时运行两个 Sleeve、重复保存草稿或在切换项目时重置正在编辑的内容。
5. iframe 使用有意义的 title，并提供独立打开原型的链接；移动端保留可点击入口及足够大的编辑区域。触摸板、鼠标滚轮和触摸操作分别验收。
6. 当前 Sleeve 界面文字主要为英语，支持中文输入，但没有现成的语言切换或跨窗口语言消息协议。根作品集的中英切换必须保留；封面标题、操作提示、状态与退出按钮都需要双语。若决定把编辑器界面也同步翻译，需要明确实现该同步，不能只传一个没有接收方的 lang 参数或 postMessage 就声称完成。
7. 不要伪造点击效果；至少模板/配色切换与文字编辑必须实际更新作品。尽量沿用真实 Sleeve 编辑逻辑。
8. 这是个人概念项目。保留 AI 辅助与默认图像出处，不增加真实客户、上线数据或商业成就。

## 已完成验证与尚未验证

- `pnpm install --frozen-lockfile --offline` 成功，全部依赖来自公开 npm 包。
- `pnpm run build:demo` 成功，Vite 8.0.5，共 1965 modules。
- `pnpm exec tsc --noEmit` 成功。
- 原始目录与拷贝目录的 38 个应用源码文件哈希完全相同。
- HTML/CSS 引用的本地构建资源均存在，默认演示图与字体已包含。
- 接入首页后的滚轮、焦点、语言、循环及屏幕自适应需要在下一轮封面设计中验收；本交接包没有声称它们已接入。

