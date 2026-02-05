# 项目架构概览 📁

**项目**: GitHub Copilot Chat — 一个为 Visual Studio Code 提供会话式 AI 帮助与自动化编辑能力的 VS Code 扩展。

---

## 🔎 高层摘要

- 主要语言：**TypeScript**（包含 TSX 模板用于 prompt 渲染）。
- 运行时 / 工具链：**Node.js**, **esbuild**, **Vitest**（单元测试）, **npm** 脚本与 VS Code 任务用于构建/监视。
- 架构风格：**分层 + 服务化（依赖注入）**，以 `src/platform/`（平台服务）和 `src/extension/`（扩展功能）为主线，强调可组合的贡献点（contribution-based）与事件驱动模式。

---

## 🔧 技术栈 & 关键依赖

- TypeScript / TSX（自定义 JSX 工厂：`vscpp`, 片段工厂：`vscppf`）。
- VS Code 扩展 API（大量 `proposed` 特性启用以支持 chat、embeddings、mapped edits 等）。
- 多模型支持：OpenAI、Anthropic、Azure、Gemini、Ollama 等（在 `package.json` 的 `languageModelChatProviders` 定义）。
- 构建：`esbuild`、`tsc`（watch 模式由多个 watch 任务组合形成 `start-watch-tasks`）。
- 测试：`Vitest`（单元）、集成与仿真测试（`simulate.sh` / `.ps1`）。
- 其它：WebAssembly（解析/tokenization），Python（notebooks、ML 脚本与评估）。

---

## 🗂️ 主要目录结构（简要）

- `src/`
  - `extension/`：扩展实现（conversation, inlineChat, prompts, intents, prompts 等）
  - `platform/`：通用平台服务（chat、openai、embedding、search、parser 等）
  - `util/`：通用工具与 VS Code 抽象
- `assets/`：图标、提示模板等静态资源
- `docs/`：文档（本文件位于此处）
- `script/`：构建/仿真脚本与工具
- `test/`：测试套件与仿真相关

（详见 `.github/copilot-instructions.md` 的“Project Architecture”部分）

---

## ⚙️ 激活流程与运行时行为

- 扩展激活入口：`src/extension/extension/vscode/extension.ts`。
- 激活点（`activationEvents`）：`onStartupFinished`, `onLanguageModelChat:copilot`, `onUri`, `onCustomAgentProvider` 等（见 `package.json`）。
- 扩展通过“贡献点（contributes）”注册语言模型工具、chat participants、language model providers、commands 等。

---

## 🤖 Chat 与 Agent 架构要点

- Chat 参与者（chat participants）与 Agent 模式是核心（包含默认 agent、workspace agent、edits agent 等）。
- 请求流程：输入解析 → 上下文收集（文件、诊断、工作区）→ Prompt 构建 → 模型交互 → 响应处理 → 执行动作（编辑、终端等）。
- 强调“工具调用（tool calling）”而非直接在文本中输出改动；编辑由专门工具（`replace_string_in_file`, `apply_patch`, `insertEdit` 等）执行。

---

## 🧭 开发与贡献指南（快速上手）

1. 安装依赖：`npm ci` 或 `npm install`。
2. 启动 watch（建议）：运行 VS Code 任务 `start-watch-tasks`（会并行启动 `watch:tsc-*` 与 `watch:esbuild` 等）。
3. 编译：`npm run compile`（用于一次性构建）。
4. 测试：`npm run test:unit`、`npm run test:extension`、`npm run simulate`。

> ⚠️ 必须经常查看 `start-watch-tasks` 输出以捕获即时的 TypeScript 编译错误（见 `.github/copilot-instructions.md`）。

---

## 📐 编码规范与架构模式（要点）

- 使用 **tabs** 缩进。字符串规则：对用户可见使用双引号，内部字符串使用单引号。
- 类型管理：避免 `any`，尽量使用 `readonly`，偏好明确的类型与接口。
- 模块化、服务化、事件驱动、基于贡献点的扩展（便于通过 `package.json` 配置进行功能扩展）。

---

## 🔎 关键文件与入口（便于定位）

- `package.json`：扩展元数据、激活事件、contributes、scripts、已启用的 VS Code proposed API 列表。
- `tsconfig.json`：编译配置（JSX 工厂、paths 等）。
- `src/extension/extension/vscode/extension.ts`：激活与服务注册入口。
- `src/extension/prompts/`：prompt 渲染与模型相关定制（使用 `@vscode/prompt-tsx`）。
- `.github/copilot-instructions.md`：开发者级别的架构、编码与流程指南（强制阅读要点）。

---

## ✅ 建议和注意事项

- 在修改关键服务或 prompt 时，尽量增加/更新对应的单元测试与 prompt snapshot（`agentPrompt.spec.tsx`）。
- 任何对构建或类型产生影响的更改应先在 `start-watch-tasks` 下验证，修复编译错误后再提交。
- 编辑工具与终端工具的调用必须遵循既定的 workflow（不要并行多次调用 `run_in_terminal`，避免在输出中直接把补丁以 code block 形式给出）。

---

## 参考/链接 🔗

- 项目 README：`README.md`
- 开发说明：`.github/copilot-instructions.md`
- Prompt 文档：`docs/prompts.md` 与 `src/extension/prompts/`
- package config：`package.json`

---

如果你希望我把此文档拓展为：
- 更详细的类/模块关系图（Mermaid/UML），或
- 将关键模块与依赖画成拓扑图（便于架构审阅），
我可以继续生成并保存到 `docs/` 下（例如 `docs/architecture-diagram.md`）。💡
