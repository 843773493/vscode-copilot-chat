---
name: translate-file-educational
description: '当你希望对某个文件进行“翻译/添加教育性注释”时使用。此 skill 指导主 agent 创建一个子 agent，子 agent 将使用 `.github/prompts/add-educational-comments.prompt.zh-CN.md` 作为指令来翻译并生成带中文教育性注释的文件。触发词示例："翻译文件"、"添加教育性注释"、"/translate-file"。'
---

# 翻译并添加教育性注释（Translate File - Educational Comments）

## 何时使用

- 你想把某个源文件翻成中文并添加教育性注释作为学习材料时。
- 你希望由 agent 创建一个子 agent 专门按现有提示文件的规范处理该文件时。

## 前提

- 仓库包含用于生成教育性注释的提示文件：`.github/prompts/add-educational-comments.prompt.zh-CN.md`。
- 用户需要提供目标文件路径；若未提供，agent 应引导用户选择（提供近似匹配的编号列表）。

## 工作流程（建议）

1. **接收触发**：用户发出自然语言请求（例如："请翻译并添加教育性注释到 src/foo/bar.ts" 或 使用命令 `/translate-file #file:src/foo/bar.ts`）。
2. **确认输入**：主 agent 确认要处理的文件、配置参数（注释深度、重复性、是否行号引用等）。
3. **创建子 agent**：主 agent 创建一个子 agent，并将子 agent 的初始指令设为引用提示文件 `.github/prompts/add-educational-comments.prompt.zh-CN.md`，同时传入参数：

```json
{
  "promptFile": ".github/prompts/add-educational-comments.prompt.zh-CN.md",
  "params": {
    "文件名": "src/foo/bar.ts",
    "注释细节": 2,
    "重复性": 2,
    "行号引用": "yes"
  }
}
```

4. **子 agent 执行**：子 agent 使用提示文件中定义的角色、规则和输出格式，生成或修改文件（例如 `src/foo/bar.zh-CN.ts` 或 就地在副本中添加注释），并确保不破坏原文件的编码、语法或构建正确性。
5. **验证与回报**：子 agent 验证变更（语法检查、行数规则），返回摘要给主 agent；主 agent 将结果展示给用户并提供下载/提交选项（或生成 PR 的建议步骤）。

## 示例对话

- 用户："帮我翻译 `src/extension/example.ts`，并加教育性注释，注释细节=2，行号引用=是"
- 主 agent：确认文件存在并询问是否创建新文件 `src/extension/example.zh-CN.ts`。
- 主 agent：创建子 agent，传入 `.github/prompts/add-educational-comments.prompt.zh-CN.md` 与参数。
- 子 agent：生成文件并返回变更摘要与校验信息。

## 注意事项

- 保持提示文件（`.github/prompts/add-educational-comments.prompt.zh-CN.md`）的最新版本；此 skill 依赖其内部的规则（如 125% 行数规则、行号引用等）。
- 对大型文件或已处理文件（已存在教育性注释）的处理策略需明确（例如：修订而非重新添加大量注释）。
- 若将输出自动提交到仓库，请在 skill 或流程中加入人工确认步骤并遵循 PR 流程。

## 参考

- `.github/prompts/add-educational-comments.prompt.zh-CN.md`（提示文件）

---

