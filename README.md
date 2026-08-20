# dsh-prompt-library

DSH（DeepSeek Harness）Web 插件：在 composer 工具栏注入「提示词库」按钮，管理可复用的 prompt 片段，点击即可插入当前输入框。

支持 **# 键快速触发**、**AI 自学习**、**AI 智能完善（润色）**、**右侧侧边栏** 与 **原生设置面板**。

## 功能特性

### 提示词管理
- **增删改查**：标题 + 正文 + 标签；按关键词搜索（标题/正文/标签）
- **一键插入**：点击列表项自动插入当前输入框
- **排序**：使用最多的前 3 条置顶，其余按更新时间倒序
- **标签分组**：按标签分组展示，多标签提示词出现在每个对应分组
- **新增高亮**：新建 / 自动学习的提示词带「新增」标记

### 与官方 UI 同步
- 按钮使用官方 `Button` 组件（`variant`/`size`），字体走官方 `--dsw-font-family`，颜色/边框/背景全用 `--dsw-alias-*` 语义化 token，随主题自动生效
- 按钮默认无背景、鼠标移入才出现背景（`--dsw-alias-interactive-bg-hover`），与 harness 官方一致
- 弹窗面板样式（圆角、边框、阴影）与官方弹层一致
- 运行时官方 CSS Modules 被宿主占位为空，已在 `button-style.ts` 注入等价 CSS 兜底

### # 键触发词库选择
- 输入 `#` 弹出选择浮层：`↑` `↓` 选择、`Enter` 插入、`Esc` 关闭；鼠标移入高亮可点击插入
- 兼容标准 `textarea`/`input` 与 `contenteditable`，通过 `keyup`/`input`/`compositionend` 三事件检测
- 浮层智能定位：底部空间不足自动翻转到输入框上方，上下都不足时收缩最大高度

### 右侧侧边栏模式
- 面板固定在屏幕右侧（`position: fixed`），不随滚动条移动
- 展开时面板左缘显示折叠按钮；折叠后右缘仅剩紧凑圆形箭头按钮（默认透明、hover 出背景）
- 折叠/展开按钮位置随面板宽度实时更新；折叠后点击面板外部不关闭
- 聊天栏弹窗与侧边栏通过 `data-sync.ts` 实时同步（任一组件增删改，两边自动刷新）

### AI 自学习 + AI 智能完善
- **自动学习**：输入适合作为提示词的文本并停止输入约 3 秒，自动识别保存（长度 ≥ 最小学习长度、含 `{var}` 占位符、多行结构等）；自动去重（精确正文匹配）、自动生成标题、标记 `auto-learned` 标签
- **AI 智能完善**：后台调用 harness LLM 生成标题/标签/摘要并优化正文；完成后前端自动轮询刷新列表，无需手动刷新
- **自学习策略**：勾选「AI智能完善」时润色结果自动纳入自学习；未勾选时弹窗提示需用户点击「确认学习」
- **用户画像**：学习样本累积到 `~/.dsh/prompt-library-user.json`（摘要/高频主题/最近样本），AI 完善时以此作为上下文，越用越贴合用户风格
- **悬停详情**：鼠标移入提示词行显示正文详情（仅内容，可滚动；默认关闭，可在设置开启）

### 原生设置面板
注册到 DSH 设置界面（设置 → 提示词库），修改立即生效。支持：
- 自动学习开关 / 标签 / 最小长度（20–500，默认 60）
- 面板宽度（300–700px，默认 380）/ 面板高度（300–800px，默认 500）
- 右侧侧边栏展开/折叠、聊天框按钮显隐
- # 键触发、鼠标移入显示详情、提示词最大存储数量（10–1000，默认 100）
- AI 智能完善开关、AI provider / model（留空自动发现）

## 持久化

| 数据 | 路径 |
| --- | --- |
| 提示词 | `~/.dsh/prompt-library.json` |
| 设置 | `~/.dsh/prompt-library-settings.json` |
| 用户画像 | `~/.dsh/prompt-library-user.json` |

## 安装（harness 插件方式）

```bash
dsh plugin --profile web add @sunjuntao/dsh-prompt-library
```

或手动方式：

```bash
cd ~/.dsh/profiles/web
# package.json 的 dependencies 添加 "dsh-prompt-library": "latest"
# dsh.profile.bundles 数组追加 "dsh-prompt-library"
pnpm install --no-frozen-lockfile
```

## 开发 / 构建

```bash
cd dsh-prompt-library
npm install
npm run typecheck   # TS 类型检查
npm run build       # 构建产物到 lib/
npm run sync        # 同步到 ~/.dsh/profiles/web（需重启 dsh web 生效）
npm run deploy      # build + sync
```

构建产物：
- `lib/index.js` — host 入口（Node ESM）
- `lib/client.js` — 浏览器入口（`__ModuleLoader__` 格式）

## 使用

启动 `dsh web`，在对话输入框左侧工具栏点击 **提示词库** 按钮打开面板，或输入 `#` 快速触发。

## 验证安装

```bash
dsh --profile web --dump-config | grep prompt-library
```

## 技术栈

- **运行时**：DSH Cordis 插件框架
- **UI 插槽**：`conversation.input.left`、`settings.section`
- **前端**：React + TypeScript
- **构建**：esbuild
- **持久化**：JSON 文件

## 效果图

![1787154011310](images/README/1787154011310.png)

![1787154029071](images/README/1787154029071.png)

![1787154054702](images/README/1787154054702.png)

## 作者

**master1Sun**

- GitHub: [https://github.com/master1Sun/dsh-prompt-library](https://github.com/master1Sun/dsh-prompt-library)
