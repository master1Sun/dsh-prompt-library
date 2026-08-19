# dsh-prompt-library

DSH（DeepSeek Harness）Web 插件：在 composer 工具栏注入一个「提示词库」按钮，管理可复用的 prompt 片段，点击即可插入当前输入框。支持**自动学习**：输入复杂 prompt 文案时，插件会自动识别并保存到提示词库。

## 功能

- **提示词管理**：创建、编辑、删除、搜索提示词（支持标题 + 正文 + 标签）
- **一键插入**：点击列表中的提示词，自动插入到当前输入框
- **自动学习**：输入适合作为提示词的文本后，自动保存到库中（带 `auto-learned` 标签）
- **文件持久化**：数据保存在 `~/.dsh/prompt-library.json`

## 安装

### 前置条件

- Node.js >= 22.19
- DSH 环境已配置

### 安装到 web profile

```bash
# 1. 进入 web profile 目录
cd ~/.dsh/profiles/web

# 2. 添加依赖
npm pkg set dependencies.dsh-prompt-library="latest"
# 或手动在 package.json 的 dependencies 中添加：
# "dsh-prompt-library": "latest"

# 3. 在 dsh.profile.bundles 中添加 "dsh-prompt-library"
# 编辑 package.json，在 dsh.profile.bundles 数组中追加

# 4. 安装
pnpm install --no-frozen-lockfile
```

### 从本地安装（开发模式）

```bash
cd ~/.dsh/profiles/web

# 在 package.json 中添加：
# "dependencies": { "dsh-prompt-library": "file:../../file/dsh-prompt-library" }
# 并在 dsh.profile.bundles 中追加 "dsh-prompt-library"

pnpm install --no-frozen-lockfile
```

## 构建

```bash
cd dsh-prompt-library
npm install
npm run build
```

构建产物：

- `lib/index.js` — host 入口（Node ESM）
- `lib/client.js` — 浏览器入口（`__ModuleLoader__` 格式）

## 使用

启动 DSH Web：

```bash
dsh web
```

在对话输入框左侧工具栏会看到一个 **Prompts** 按钮，点击打开提示词库面板：

- **+ New**：新建提示词（标题 + 正文 + 标签）
- **搜索框**：按关键词搜索已有提示词
- **Insert**：将提示词正文插入到当前输入框
- **Edit** / **Delete**：编辑或删除提示词

### 自动学习

当你在输入框中输入以下类型的文本，停止输入约 3 秒后，插件会自动将其保存到提示词库：

- 长度 ≥ 60 字符
- 有多行结构或包含 `{var}` / `[var]` 占位符
- 有清晰的句子结构

保存时按钮上方会闪现绿色 **✓ Learned** 提示，该提示词会被标记为 `auto-learned` 标签。

## 验证是否安装成功

```bash
dsh --profile web --dump-config | grep prompt-library
```

输出应包含：

```
# == dsh-prompt-library
- id: prompt-library
  name: dsh-prompt-library
```

## 技术栈

- **运行时**：DSH Cordis 插件框架
- **UI 插槽**：`conversation.input.left`
- **前端**：React + TypeScript
- **构建**：esbuild
- **持久化**：JSON 文件（`~/.dsh/prompt-library.json`）