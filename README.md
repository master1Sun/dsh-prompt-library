# dsh-prompt-library

DSH（DeepSeek Harness）提示词库插件：在聊天栏提供**提示词管理**与**AI 润色**能力，帮你沉淀、复用和优化提示词。

## 主要功能

### 提示词库

- 保存和管理常用提示词（标题 + 正文 + 标签），支持搜索、排序、标签分组
- 一键插入：点击提示词即可填入输入框
- 输入 `#` 快速选择提示词
- 新建 / 自动学习的提示词带绿色圆点标记
- 支持聊天栏弹窗和右侧侧边栏两种方式，两边实时同步

### AI 润色

- 聊天栏「AI 润色」按钮，一键优化输入框中的文字
- 润色时按钮显示处理动画，完成后可一键替换回输入框
- 润色结果自动纳入自学习，越用越懂你的风格

### AI 自学习

- 输入内容自动识别保存为提示词，无需手动整理
- AI 智能完善标题、标签、摘要和正文
- 学习样本累积成用户画像，作为 AI 的个性化记忆，越用越贴合

### 设置

在 DSH 设置 → 提示词库中调整：自动学习开关、面板大小、侧边栏、按钮显隐、`#` 触发、AI 模型等，修改即时生效。

## 数据存储

| 数据     | 位置                                |
| -------- | ----------------------------------- |
| 提示词   | `~/.dsh/prompt-library.json`        |
| 设置     | `~/.dsh/prompt-library-settings.json` |
| 用户画像 | `~/.dsh/prompt-library-user.md`     |

> 用户画像是 AI 自学习的记忆文件，只保留核心要点，不会无限膨胀。

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
