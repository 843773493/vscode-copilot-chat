# GitHub Copilot 聊天扩展 - Copilot 使用说明

## 项目概述

这是用于 Visual Studio Code 的 **GitHub Copilot 聊天** 扩展 —— 一个为 VS Code 提供对话式 AI 协助的扩展，具备多种工具的编程代理、内联编辑功能及高级 AI 驱动功能。

### 主要功能
- **聊天界面**：通过聊天参与者、变量和斜杠命令提供对话式 AI 协助
- **内联聊天**：使用 `Ctrl+I` 在编辑器中直接进行 AI 驱动编辑
- **代理模式**：多步骤自主编程任务
- **编辑模式**：自然语言转代码
- **内联建议**：下一步编辑建议和内联补全
- **语言模型集成**：支持多种 AI 模型（GPT-4、Claude、Gemini 等）
- **上下文感知**：工作区理解、语义搜索和代码分析

### 技术栈
- **TypeScript**：主要语言（遵循 VS Code 编码标准）
- **TSX**：提示构建使用@vscode/prompt-tsx 库
- **Node.js**：扩展主机和语言服务器功能的运行时
- **WebAssembly**：用于性能关键的解析和分词
- **VS Code 扩展 API**：广泛使用提议的 API 来实现聊天、语言模型和编辑功能
- **ESBuild**：打包和编译
- **Vitest**：单元测试框架
- **Python**：用于笔记本集成和机器学习评估脚本

## 验证更改

在运行任何脚本或声明工作完成之前，您必须检查编译输出！

1. **始终**检查 `start-watch-tasks` 监视任务输出中的编译错误
2. **切勿**使用 `compile` 任务来检查一切是否正常工作
3. **修复**所有编译错误后再继续

### TypeScript 编译步骤
- 在进行更改时，监控 `start-watch-tasks` 任务输出以获取实时编译错误
- 该任务运行 `npm: watch:tsc-extension`、`npm: watch:tsc-extension-web`、`npm: watch:tsc-simulation-workbench`以及 `npm: watch:esbuild` 以增量编译项目
- 如果任务未在后台运行，则启动该任务

## 项目架构

### 顶层目录结构

#### 核心源代码 (`src/`)
- **`src/extension/`**：主要的扩展实现，按功能组织
- **`src/platform/`**：共享平台服务和工具
- **`src/util/`**：通用工具、VS Code API 封装及服务基础设施

#### 构建与配置
- **`.esbuild.ts`**：用于打包扩展、Web Worker 和模拟工作台的构建配置
- **`tsconfig.json`**：TypeScript 配置，扩展了基础配置并包含 React JSX 设置
- **`vite.config.ts`**：Vitest 单元测试的测试配置
- **`package.json`**：扩展清单，包含 VS Code 功能贡献、依赖和脚本

#### 测试与模拟
- **`test/`**：完整的测试套件，包括单元测试、集成测试和模拟测试
- **`script/simulate.sh`**：测试运行器基于场景的测试
- **`notebooks/`**：用于性能分析和机器学习实验的 Jupyter 笔记本

#### 资源与文档
- **`assets/`**：图标、字体和视觉资源
- **`CONTRIBUTING.md`**：架构文档和开发指南

### 主要源代码目录

#### `src/extension/` - 功能实现

**核心聊天与对话功能：**
- **`conversation/`**：聊天参与者、代理及对话流程编排
- **`inlineChat/`**：内联编辑功能（`Ctrl+I`）和提示系统
- **`inlineEdits/`**：具有流式编辑的高级内联编辑功能

**上下文与智能：**
- **`context/`**：代码理解和工作区分析的上下文解析
- **`contextKeys/`**：用于 UI 状态的 VS Code 上下文键管理
- **`intents/`**：聊天参与者/斜杠命令实现
- **`prompts/`**：提示工程和模板系统
- **`prompt/`**：常用提示工具
- **`relatedFiles/`**：相关文件发现与上下文收集
- **`typescriptContext/`**：TypeScript 特定的上下文和分析

**搜索与发现：**
- **`search/`**：扩展中的通用搜索功能
- **`workspaceChunkSearch/`**：大规模代码库的分块工作区搜索
- **`workspaceSemanticSearch/`**：跨工作区内容的语义搜索
- **`workspaceRecorder/`**：记录和跟踪工作区交互

**认证与配置：**
- **`authentication/`**：GitHub 认证与令牌管理
- **`configuration/`**：设置和配置管理
- **`byok/`**：自带密钥 (BYOK) 功能，用于自定义 API 密钥

**AI 集成与端点：**
- **`endpoint/`**：AI 服务端点和模型选择
- **`tools/`**：语言模型工具和集成
- **`api/`**：核心 API 抽象和接口
- **`mcp/`**：模型上下文协议集成

**开发与测试：**
- **`testing/`**：测试生成和执行功能**`test/`**：特定于扩展的测试工具和辅助功能

**用户界面与体验：**
- **`commands/`**：用于处理 VS Code 命令的服务
- **`codeBlocks/`**：流式代码块处理
- **`linkify/`**：URL 和引用链接化
- **`getting-started/`**：入门和设置体验
- **`onboardDebug/`**：调试入门流程
- **`survey/`**：用户反馈和调查收集

**专业功能：**
- **`notebook/`**：Notebook 集成与支持
- **`review/`**：代码审查和 PR 集成功能
- **`renameSuggestions/`**：AI 驱动的重命名建议
- **`ignore/`**：文件和模式忽略功能
- **`xtab/`**：跨标签页通信与状态管理

**基础设施与工具：**
- **`extension/`**：核心扩展初始化与生命周期管理
- **`log/`**：日志基础设施与实用工具
- **`telemetry/`**：分析与使用情况跟踪

**VS Code API 类型定义：**
- 多个 `vscode.proposed.*.d.ts` 文件用于提出的 VS Code API，包括聊天、语言模型、嵌入以及各种编辑器集成

#### `src/platform/` - 平台服务
- **`chat/`**：核心聊天服务和对话选项
- **`openai/`**：OpenAI API 协议集成和请求处理
- **`embedding/`**：用于语义搜索的向量嵌入
- **`parser/`**：代码解析和 AST 分析
- **`search/`**：工作区搜索和索引
- **`telemetry/`**：分析和使用情况跟踪
- **`workspace/`**：工作区理解和文件管理
- **`notebook/`**：笔记本集成
- **`git/`**：Git 集成和仓库分析

#### `src/util/` - 基础设施
- **`common/`**：共享工具、服务基础设施和抽象
- **`vs/`**：借自 microsoft/vscode 仓库的工具（只读）

### 扩展激活流程

1. **基础激活**（`src/extension/extension/vscode/extension.ts`）：
   - 检查 VS Code 版本兼容性
   - 创建服务实例基础设施
   - 初始化贡献系统

2. **服务注册**:
   - 平台服务（搜索、解析、遥测等）
   - 扩展特定服务（聊天、认证等）
   - VS Code 集成（命令、提供程序等）

3. **贡献加载**:
   - 聊天参与者
   - 语言模型提供者
   - 命令注册
   - UI 贡献（视图、菜单等）

### 聊天系统架构

#### 聊天参与者
- **默认代理**：主要的对话 AI 助手
- **设置代理**：处理初始 Copilot 设置和入门
- **工作区代理**：专注于工作区范围的操作
- **代理模式**：自主执行多步骤任务

#### 请求处理
1. **输入解析**：解析用户输入以确定参与者、变量、斜杠命令
2. **上下文解析**：收集相关代码上下文、诊断信息、工作区信息
3. **提示构建**：根据上下文和意图构建提示
4. **模型交互**：发送向适当语言模型的请求
5. **响应处理**：解析和解释AI回复
6. **动作执行**：应用代码编辑，显示结果，处理后续

#### 语言模型集成
- 支持多个提供者（OpenAI、Anthropic等）
- 模型选择与切换能力
- 配额管理与备选处理
- 自定义指令集成

### 在线聊天系统
- **提示系统**：智能检测自然语言输入以实现内嵌建议
- **意图检测**：自动检测用户意图（解释、修复、重构等）
- **上下文收集**：收集光标/选择相关的代码上下文
- **流式编辑**：实时应用AI建议的更改
- **版本2**：新实现，提升用户体验和请求隐藏功能

## 编码标准

### TypeScript/JavaScript 指南
- **缩进**：使用**制表符*，非空格
- **命名规范**：
  - “PascalCase”用于类型和枚举值
  -函数、方法、属性和局部变量使用 `camelCase`
  - 名称中使用描述性、完整的单词
- **字符串**：
  - 对于需要本地化的用户可见字符串使用“双引号”
  - 对于内部字符串使用‘单引号’
- **函数**：使用箭头函数 `=>` 代替匿名函数表达式
- **条件语句**：始终使用花括号，左花括号与条件在同一行
- **注释**：函数、接口、枚举和类使用 JSDoc 风格

### React/JSX 约定
- 自定义 JSX 工厂：`vscpp`（代替 React.createElement）
- Fragment 工厂：`vscppf`
- 组件遵循 VS Code 的主题和样式模式

### 架构模式
- **面向服务**：通过 `IInstantiationService` 广泛使用依赖注入
- **基于贡献**：模块化系统，功能自行注册
- **事件驱动**：广泛使用 VS Code 的事件系统和可释放对象
- **分层**：平台服务与扩展功能明确分离

### 测试标准
- **单元测试**：使用 Vitest 对独立组件进行测试
- **集成测试**：使用 VS Code 扩展主机测试 API 集成
- **模拟测试**：使用 `.stest.ts` 文件进行端到端场景测试
- **测试数据**：为各种场景提供全面的测试数据

### 文件组织
- **逻辑分组**：按功能分组，而非技术层次
- **平台分离**：Web 与 Node.js 环境使用不同实现
- **测试接近实现**：测试文件靠近实现 (`/test/` 子目录)
- **清晰接口**：服务边界有明确接口定义

## 关键开发指南

### 箭头函数与参数
- 使用箭头函数 `=>` 替代匿名函数表达式
- 只有在必要时才为箭头函数参数加括号：

```javascript
x => x + x                    // ✓ 正确
(x, y) => x + y              // ✓ 正确
<T>(x: T, y: T) => x === y   // ✓ 正确
(x) => x + x                 // ✗ 错误
```### 代码结构
- 始终使用花括号包围循环和条件语句的主体
- 左花括号总是放在需要它的语句同一行
   - 左花括号之后必须换行，主体内容缩进在下一行
- 括号内的结构不应有多余空格
- 逗号、冒号和分号后面要有一个空格

```javascript
for (let i = 0, n = str.length; i < 10; i++) {
    if (x < 10) {
        foo();
    }
}

function f(x: number, y: string): void { }
```

### 类型管理
- 除非需要在多个组件之间共享，否则不要导出 `types` 或 `functions`
- 不要向全局命名空间引入新的 `types` 或 `values`
- 使用正确的类型。除非绝对必要，不要使用 `any`
- 尽可能使用 `readonly`
- 除非绝对必要，避免在 TypeScript 中进行类型转换。如果在修改后出现类型错误，请查找相关变量的类型，并建立正确的类型系统使用接口，而不是添加类型转换。
- 除非绝对必要，否则不要将 `any` 或 `unknown` 用作变量、参数或返回值的类型。如果需要类型注解，应该定义适当的类型或接口。

## 关键 API 和集成

### VS Code 提议的 API（已启用）
该扩展使用了许多 VS Code 提议的 API 以实现高级功能：
- `chatParticipantPrivate`：私有聊天参与者功能
- `languageModelSystem`：用于 LM API 的系统消息
- `chatProvider`：自定义聊天提供程序实现
- `mappedEditsProvider`：高级编辑功能
- `inlineCompletionsAdditions`：增强的内联建议
- `aiTextSearchProvider`：AI 驱动的搜索功能

### 外部集成
- **GitHub**：身份验证和 API 访问
- **Azure**：云服务和实验功能
- **OpenAI**：语言模型 API
- **Anthropic**：Claude 模型集成 - 参见**[src/extension/agents/claude/AGENTS.md](../src/extension/agents/claude/AGENTS.md)** 获取完整的 Claude Agent SDK 集成文档，包括架构、组件和注册表
- **遥测**：使用分析和性能监控

## 开发工作流程

### 设置和构建
- `npm install`：安装依赖
- `npm run compile`：开发构建
- `npm run watch:*`：用于开发的各种观察模式

### 测试
- `npm run test:unit`：单元测试
- `npm run test:extension`：VS Code 集成测试
- `npm run simulate`：基于场景的模拟测试

### 关键编辑入口

**聊天与会话功能：**
- **添加新的聊天功能**：从 `src/extension/conversation/` 开始
- **聊天参与者和代理**：在 `src/extension/conversation/` 中查看参与者实现
- **会话存储**：修改 `src/extension/conversationStore/` 以实现持久化功能
- **内联聊天改进**：查看 `src/extension/inlineChat/` 和`src/extension/inlineEdits/`

**上下文与智能:**
- **上下文解析更改**: 检查 `src/extension/context/` 和 `src/extension/typescriptContext/`
- **提示工程**: 更新 `src/extension/prompts/` 和 `src/extension/prompt/`
- **意图检测**: 修改 `src/extension/intents/` 以进行用户意图分类
- **相关文件发现**: 编辑 `src/extension/relatedFiles/` 以收集上下文信息

**搜索与发现:**
- **搜索功能**: 更新 `src/extension/search/` 以实现通用搜索
- **工作区搜索**: 修改 `src/extension/workspaceChunkSearch/` 以在大型代码库中搜索
- **语义搜索**: 编辑 `src/extension/workspaceSemanticSearch/` 以实现 AI 驱动的搜索
- **工作区跟踪**: 更新 `src/extension/workspaceRecorder/` 以记录交互

**身份验证与配置:**
- **认证流程**: 修改 `src/extension/authentication/` 以集成 GitHub
- **设置与配置**: 更新 `src/extension/configuration/`以及 `src/extension/settingsSchema/`
- **BYOK 功能**：编辑 `src/extension/byok/` 来实现自定义 API 密钥功能

**AI 集成：**
- **AI 端点**：更新 `src/extension/endpoint/` 以选择模型和路由
- **语言模型工具**：修改 `src/extension/tools/` 进行 AI 工具集成
- **API 抽象**：编辑 `src/extension/api/` 以实现核心接口
- **MCP 集成**：更新 `src/extension/mcp/` 以实现模型上下文协议功能

**用户界面：**
- **VS Code 命令**：更新 `src/extension/commands/` 以实现命令功能
- **代码块渲染**：修改 `src/extension/codeBlocks/` 以显示代码
- **入门流程**：编辑 `src/extension/getting-started/` 和 `src/extension/onboardDebug/`
- **跨标签功能**：更新 `src/extension/xtab/` 以进行多标签协调

**测试与开发：**
- **测试生成**：修改 `src/extension/testing/` 以实现 AI 驱动的测试创建
- **扩展测试**：更新 `src/extension/test/` 用于扩展特定的测试工具

**平台服务:**
- **核心平台服务**：扩展 `src/platform/` 服务以实现跨功能功能
- **VS Code 集成**：更新贡献文件和扩展激活代码
- **配置**：修改 `package.json` 贡献以进行 VS Code 集成

此扩展是一个复杂的多层系统，在 VS Code 中提供全面的 AI 支持。理解服务架构、贡献系统以及平台与扩展层之间的分离对于进行有效的修改至关重要。

## 最佳实践
- 尽可能使用服务和依赖注入，而不是直接使用 node 或 vscode API。例如，使用 `IFileSystemService` 而不是 node 的 `fs`。
- 始终使用 URI 类型，而不是字符串文件路径。有许多用于处理 URI 的辅助工具可用。