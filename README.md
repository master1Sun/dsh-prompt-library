# dsh-prompt-library

DSH（DeepSeek Harness）提示词库插件：在聊天栏提供**提示词管理**、**AI 润色**与**五维灵魂边界**能力，帮你沉淀、复用和持续优化提示词。

## 主要功能

### 提示词库

- 管理常用提示词（标题 + 正文 + 标签），支持搜索、排序、标签分组、使用次数统计
- 右侧面板与宿主左侧栏同款样式，自动挤占并收缩聊天区，展开/折叠自由切换
- **插入**：追加到输入框已有内容之后
- **覆盖**：用该提示词直接替换整段草稿
- 输入 `#` 快速触发选择，实时筛选
- 底部实时显示标签总数与提示词总数

### AI 润色

- 聊天栏「AI 润色」按钮一键优化文字，完成后一键替换回输入框
- 润色过程遵循五个灵魂边界的约束

### 五维灵魂边界（AI 只读引用）

基于五个灵魂文件约束每一次 AI 调用，形成稳定的人格与长期记忆。文件默认生成模板、删除会自动重建；内容由**用户手动维护**，AI 只读引用、不擅自改写。

| 文件 | 含义 | 作用 |
| ---- | ---- | ---- |
| `SOUL.md` | 灵魂 | 我是谁、性格、语气、价值观、底线 |
| `AGENTS.md` | 工作手册 | 做事流程、任务规则、执行步骤 |
| `USER.md` | 用户档案 | 使用者习惯、偏好、环境信息 |
| `IDENTITY.md` | 对外身份 | 名字、头衔、对外展示形象 |
| `MEMORY.md` | 长期记忆 | 需手动填入的参考经验 |

- 自动学习输入内容为提示词入库，AI 智能完善标题、标签、摘要和正文
- 五维文件均为用户的显式设定（含默认模板），AI 据此遵循性格、风格与流程边界

### 设置

在 DSH 设置 → 提示词库调整：自动学习、手动确认、AI 智能完善、面板大小、侧边栏、按钮显隐、`#` 触发等，修改即时生效。

## 数据存储

提示词库采用 **SQLite**（`node:sqlite`），其余配置与日志统一存放在 `~/.dsh/prompt-library/`：

```
~/.dsh/prompt-library/
├── db/prompts.db      # 提示词库（SQLite）
├── log/
│   └── ai-YYYY-MM-DD.log   # AI 调用诊断日志（按日期分文件）
└── character/         # 五维灵魂边界
    ├── SOUL.md
    ├── AGENTS.md
    ├── USER.md
    ├── IDENTITY.md
    └── MEMORY.md
```

## 安装

```bash
dsh plugin --profile web add @sunjuntao/dsh-prompt-library
```

## 使用

启动 `dsh web`，点击聊天栏「提示词库」按钮打开面板，或输入 `#` 快速触发；点击「AI 润色」一键优化输入内容。

## 开发 / 构建

```bash
npm install
npm run deploy   # 类型检查 + 构建 + 同步到 DSH（需重启 dsh web 生效）
```

## 效果图

![1787154011310](images/README/1787154011310.png)

![1787154029071](images/README/1787154029071.png)

![1787154054702](images/README/1787154054702.png)

## 作者

**master1Sun**

- GitHub: [https://github.com/master1Sun/dsh-prompt-library](https://github.com/master1Sun/dsh-prompt-library)