<div align="center">

[🇨🇳 中文](./README.md) | 🌐 **English**

</div>

# dsh-prompt-library

DSH (DeepSeek Harness) prompt library plugin: provides **prompt management**, **AI polish** and **persona customization** in the chat bar, helping you accumulate, reuse and continuously improve prompts.

The plugin treats conversation-level prompts as its core. Every feature is designed around this capability, while other auxiliary features are just a bonus. We warmly welcome users to share ideas and suggestions, and will keep iterating based on them.

## Key Features

### Prompt Library

- Manage frequently-used prompts (title + body + tags), with search, sorting, tag grouping and usage-count statistics
- The right panel shares the same style as the host's left sidebar, automatically squeezing and shrinking the chat area, freely toggling between expand/collapse
- **Insert**: appends to the existing content in the input box
- **Overwrite**: directly replaces the whole draft with this prompt
- **Insert & Send**: fills in template variables and sends with one click (uses the variable dialog when it contains `{{}}`); outside `#` scenarios it is only available when the draft is empty, avoiding accidentally carrying existing content; when triggered by `#`, the trigger word is filtered out while the preceding text is kept and sent along
- Type `#` to quickly trigger selection with real-time filtering
- The bottom shows the total number of tags and prompts in real time

### Generate Skills

- Select prompts under "Prompt Library → Import/Export" to generate DSH Skills in batch
- AI generates an English skill name and description from the prompt content; the skill is written to `~/.dsh/skills/<name>/SKILL.md`, and can be triggered by typing `/skill-name` in the chat box, or auto-matched by the model from the description
- A link between the prompt and the skill is created automatically; regenerating the same prompt **overwrites the original skill directory** instead of adding endlessly
- If the body contains `{{variables}}`, the "placeholder auto-fill" capability is marked at generation time — when using the skill, AI infers and fills them automatically from the current semantic context, no manual input needed

### AI Polish

- The "AI Polish" button in the chat bar optimizes text with one click, then replaces it back into the input box with one click
- The polishing process follows the constraints of the persona file

### Persona (AI read-only reference)

Each AI call and the whole chat session are constrained by a single `SOUL.md` persona file to form a stable assistant persona. The file is generated from a default template and rebuilt automatically if deleted; its content is **manually maintained by the user**, and AI only reads it without modifying it on its own.

| File      | Meaning | Purpose |
| --------- | ------- | ------- |
| `SOUL.md` | Persona | Identity, tone/personality, working rules |

- Automatically learn input content into the prompt library, with AI smart-refining titles, tags, summaries and bodies
- The persona file is the user's explicit configuration (including the default template), and AI follows its personality, tone and working rules accordingly

### Settings

Under DSH Settings → Prompt Library, adjust: auto learning, manual confirmation, AI smart polish, panel size, sidebar, button visibility, `#` triggering, etc. Changes take effect immediately.

## Data Storage

The library uses **SQLite** (`node:sqlite`); all other configs and logs are stored under `~/.dsh/prompt-library/`:

```
~/.dsh/prompt-library/
├── db/prompts.db      # prompt library (SQLite)
├── log/
│   └── ai-YYYY-MM-DD.log   # AI diagnostic logs (per-day files)
└── character/         # persona file
    └── SOUL.md
```

## Installation

```bash
dsh plugin --profile web add @sunjuntao/dsh-prompt-library
```

## Usage

Start `dsh web`, click the "Prompt Library" button in the chat bar to open the panel, or type `#` to trigger it quickly; click "AI Polish" to polish your input with one click.

## Development / Build

```bash
npm install
npm run deploy   # type check + build + sync to DSH (restart dsh web to take effect)
```

## Screenshots

![1787652137511](images/README/1787652137511.png)![1787652192115](images/README/1787652192115.png)![1787652201302](images/README/1787652201302.png)![1787652209555](images/README/1787652209555.png)

## Author

**master1Sun**

- GitHub: [https://github.com/master1Sun/dsh-prompt-library](https://github.com/master1Sun/dsh-prompt-library)