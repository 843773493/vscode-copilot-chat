# 贡献给 GitHub Copilot Chat

* [创建好的 issue](#creating-good-issues)
  * [查找现有的 issue](#look-for-an-existing-issue)
    * [撰写好的错误报告和功能请求](#writing-good-bug-reports-and-feature-requests)
* [开发](#developing)
  * [需求](#requirements)
    * [首次设置](#first-time-setup)
    * [测试](#testing)
    * [使用基础/通用工具](#use-basecommon-utils)
  * [开发提示](#developing-prompts)
    * [TSX 提示制作的动机](#motivations-for-tsx-prompt-crafting)
    * [快速入门](#quickstart)
  * [代码结构](#code-structure)
    * [项目架构和编码标准](#project-architecture-and-coding-standards)
    * [层次结构](#layers)
    * [运行时（node.js、Web Worker）](#runtimes-nodejs-web-worker)
    * [贡献与服务](#contributions-and-services)
  * [代理模式](#agent-mode)
  * [工具](#tools)
    * [开发工具](#developing-tools)
  * [树状结构]Sitter](#tree-sitter)
  * [故障排除](#troubleshooting)
    * [读取请求](#reading-requests)
  * [API 更新](#api-updates)
    * [对 API 进行破坏性更改](#making-breaking-changes-to-api)
    * [对 API 进行追加更改](#making-additive-changes-to-api)
  * [与 Code OSS 一起运行](#running-with-code-oss)

# 创建好的问题

## 查找现有问题

在创建新问题之前，请在[未解决的问题](https://github.com/microsoft/vscode/issues)中搜索，看看该问题或功能请求是否已经被提交。

务必浏览[最受欢迎的](https://github.com/microsoft/vscode/issues?q=is%3Aopen+is%3Aissue+label%3Afeature-request+sort%3Areactions-%2B1-desc)功能请求。

如果发现你的问题已经存在，请添加相关评论并添加你的[表情反应](https://github.com/blog/2119-add-reactions-to-pull-requests-issues-and-comments)。使用表情代替“+1”的评论：

* 👍 - 点赞
* 👎 - 反对

如果你如果找不到描述您遇到的错误或功能的新问题，请按照以下指南创建一个新问题。

### 编写好的错误报告和功能请求

每个问题和功能请求只提交一个问题。不要在同一个问题中列出多个错误或功能请求。

除非问题的输入完全相同，否则不要将您的问题作为评论添加到现有问题中。许多问题看起来相似，但原因可能不同。

您提供的信息越多，其他人复现问题并找到解决方案的可能性就越大。

内置的报告问题工具（可以通过 VS Code 的“帮助”菜单中的“报告问题”访问）可以帮助简化此过程，它会自动提供 VS Code 的版本、已安装的所有扩展以及您的系统信息。此外，该工具还会搜索现有问题，以查看是否已存在类似问题。

请在每个问题中包括以下内容：

* VS Code 和 Copilot Chat 的版本扩展
* 你的操作系统
* 如果适用，LLM 模型
* 可重现问题的步骤（1... 2... 3...）
* 你期望看到的结果与实际看到的结果
* 显示问题发生的图片、动画或视频链接
* 能够演示问题的代码片段或提示，或者开发者可以轻松拉取的代码仓库链接，以便在本地重现问题
  * **注意:** 由于开发者需要复制和粘贴代码片段，仅将代码片段作为媒体文件（例如 .gif）是不够的。
* 来自开发者工具控制台的错误（通过菜单打开：帮助 > 切换开发者工具）

# 开发

## 要求
- Node 22.x
- Python >=3.10, <=3.12
- Git 大文件存储（LFS）- 用于运行测试
- （Windows）Visual Studio 构建工具 >=2019 - 用于使用 node-gyp 构建 [查看 node-gyp 文档](https://github.com/nodejs/node-gyp?tab=readme-ov-file#on-windows)

### 初次设置
- 在 Windows 上，你需要运行 `Set-ExecutionPolicy作为PowerShell管理员，“无限制”。
- “NPM安装”
- “NPM运行get_token”
- 然后你可以用“cmd+shift+B”运行构建任务，或者直接启动“启动Copilot扩展 - Watch Mode”启动配置，然后再调试扩展。

**提示：** 如果“启动副驾驶扩展 - 观察模式”对你不起作用，试试使用“启动副驾驶扩展”调试配置。

**注：** 支持在Windows子系统Linux（WSL）下设置和运行，需遵循[VS Code设置说明]（https://github.com/microsoft/vscode/wiki/Selfhosting-on-Windows-WSL）。

### 测试
如果在运行测试时遇到错误，确保你使用的是正确的节点版本，并且git lfs安装正确（运行'git lfs pull'以验证）。

有单元测试在Node.JS中运行：

```
NPM 运行测试：单元
```

还有一些集成测试是在VS Code内部运行的：

```
NPM run test：extension
```

最后，还有**模拟测试**。这些测试访问 Copilot API 端点，调用大语言模型（LLM）并需要昂贵的计算资源。每个测试运行 10 次，以适应 LLM 本身的随机性。所有测试的所有运行结果都会在基准文件 [`test/simulation/baseline.json`](test/simulation/baseline.json) 中进行快照记录，该文件记录了测试套件在任意时间点的质量。

由于 LLM 的结果既随机又成本高昂，这些结果会缓存在仓库中的 `test/simulation/cache` 中。这意味着重新运行模拟测试并利用缓存将使测试运行既更快又更确定。

你可以使用以下命令运行模拟测试：

```
npm run simulate
```

请注意，除非缓存已填充，否则 PR 将会失败。运行上述命令将通过在 `test/simulation/cache/layers` 中创建新的缓存层来填充缓存。这个缓存填充必须由 VS Code 团队成员完成。如果社区成员提交包含新缓存层的 PR,PR 将会失败，并且必须由 VS Code 团队成员删除该层（或这些层）并在他们的开发环境中重新创建。

您可以通过以下方式确保缓存已被填充：

```
npm run simulate-require-cache
```

最后，如果有任何未提交的基线更改，PR 也会失败。如果您在本地确实看到测试结果的变化，并且想要接受模拟测试的新基线，则应更新基线并将该更改包含在您的提交中：

```
npm run simulate-update-baseline
```

### 使用 `base/common` 工具

我们喜欢并怀念 'microsoft/vscode' 仓库中的实用工具，特别是来自 base/common 的工具，比如 async.ts、strings.ts、map.ts 等。与其手动复制并在此维护它们，不如直接从 vscode 仓库中使用。为此，有一个 `script/setup/copySources.ts` 脚本。在脚本的最后，你会找到一个从 vscode 仓库复制的模块列表。如果你需要 vscode 中的某个模块，将其添加到列表中并运行 `npx tsx script/setup/copySources.ts`。将此仓库作为 vscode 仓库的同级目录，它会将 vscode 仓库中的模块复制到 `src/util/vs` 中。请注意，`src/util/vs` 文件夹被标记为只读，对复制的源代码的更改应在 vscode 仓库中进行。

## 开发提示

我们开发了一个基于 TSX 的提示组合框架。本节描述了它解决的问题以及如何使用它。

### TSX 提示制作的动机
* 支持根据 token 预算动态组合 OpenAI API 请求消息。
   * 提示是纯字符串，这使得在通过字符串拼接组成后很难编辑。相反，使用 TSX 提示时，消息被表示为一棵 TSX 组件树。树中的每个节点都有一个 `priority`，概念上类似于 `zIndex`（数值越高 == 优先级越高）。如果一个意图声明的消息数量超过了 token 预算，提示渲染器会剪裁优先级最低的消息。`ChatMessage` 数组，最终会发送到 Copilot API，同时保留它们声明的顺序。
   * 这也使得最终支持更复杂的提示管理技术变得更容易，例如，尝试提示的不同变体，或者提示的一部分通过 Copilot API 请求递归地总结其子内容以缩小自身。
* 让每个基于 LLM 的功能/意图的所有者能够透明地构建提示，同时仍然能够重用常见的提示元素，如安全规则。
   * 你的意图拥有并完全控制发送到 Copilot API 的 `System`、`User` 和 `Assistant` 消息。这让你能够更好地控制和查看每个功能发送的安全规则、提示上下文类型和对话历史记录。

### 快速开始
- 首先定义一个根 TSX 提示组件，继承 [`PromptElement`]。最简单的提示元素实现一个同步的 `render` 方法，它返回想要发送的聊天消息Copilot API。例如：

```ts
interface CatPromptProps extends BasePromptElementProps {
   query: string;
}

export class CatPrompt extends PromptElement<CatPromptProps, void> {
   render() {
      return (
         <>
            <SystemMessage>
               对所有消息的回应都要像一只猫一样。
            </SystemMessage>
            <UserMessage>
               {this.props.query}
            </UserMessage>
         </>
      );
   }
}
```

- 要渲染你的提示元素，创建一个 [`PromptRenderer`] 实例，并在你定义的提示组件上调用 `render`，传入提示组件所需的 props。`PromptRenderer` 会生成一组系统、用户和助手消息，这些消息适合通过 `ChatMLFetcher` 发送到 Copilot API。有关一些策略，可参阅此 [OpenAI 指南](https://platform.openai.com/docs/guides/prompt-engineering/six-strategies-for-getting-better-results)获得良好结果。

```ts
class CatIntentInvocation implements IIntentInvocation {
   constructor(private readonly accessor: ServicesAccessor, private readonly endpoint: IChatEndpoint) {}

   async buildPrompt({ query }: IBuildPromptContext, progress: vscode.Progress<vscode.ChatResponseProgressPart | vscode.ChatResponseReferencePart>, token: vscode.CancellationToken): Promise<RenderPromptResult> {
      // 渲染 `CatPrompt` 提示元素
	   const renderer = new PromptRenderer(this.accessor, this.endpoint, CatPrompt, { query });

      return renderer.render(progress, token);
   }
}
```
- 提示元素可以返回其他提示元素，这些元素都会由提示渲染器渲染。例如，你的提示可能会受益于重用以下实用组件：
   - `SystemMessage`、`UserMessage` 和 `AssistantMessage`：这些组件中的文本将被转换为 OpenAI API 中的系统消息、用户消息和助手消息类型。`SafetyRules`：通常应包含在 `SystemMessage` 中，以确保您的功能符合负责任的 AI 指南。
- 如果您的提示执行异步工作，例如 VS Code 扩展 API 调用或对 Copilot API 的额外请求以重新排序数据块，您可以在可选的异步 `prepare` 方法中预先计算此状态。`prepare` 会在 `render` 调用之前执行，并且准备好的状态将传回到提示组件的同步 `render` 方法中。

请注意：
* 渲染字符串字面量时不会保留换行符，必须使用内置的 `<br />` 属性显式声明。
* 目前，如果两个具有 _相同优先级_ 的提示消息因超出 token 预算而需要被清除，则之前声明的提示消息的子树无法清除之后声明的提示消息的子树。

## 代码结构

### 项目架构和编码标准

关于项目架构的详细信息，有关标准和开发指南，请参阅 [Copilot 指南](.github/copilot-instructions.md)。该文档包括：

* **项目概览**：主要功能、技术栈和能力
* **架构细节**：目录结构、服务组织和扩展激活流程
* **编码标准**：TypeScript/JavaScript 指南、React/JSX 规范和架构模式
* **关键入口点**：针对特定功能进行更改的位置
* **开发指南**：贡献代码库的最佳实践

理解这些指南对于有效地为 GitHub Copilot 聊天扩展做出贡献至关重要。

### 层

与在 VS Code 中一样，我们将源代码组织为不同的层和文件夹。理解“层”是指运行时目标，由你可以使用的环境 API 定义。我们有以下层：

* `common` - 仅 JavaScript 及其内置 API。也允许使用 VS Code API 的类型，但无法进行运行时访问。* `vscode` - 运行时访问 VS Code API，可以使用 `common`
* `node` - Node.js API 和模块，可以使用 `common, node`
* `vscode-node` - VS Code API 和 Node.js API，可以使用 `common, vscode, node`
* `worker` - Web Worker API，可以使用 `common`
* `vscode-worker` - VS Code API 和 Web Worker API，可以使用 `common, vscode, worker`

顶层文件夹是我们将代码按逻辑分组组织的方式，每个文件夹下有子文件夹，源文件位于二级文件夹中。我们有以下顶层文件夹：

- src
   - util
      - 可跨项目使用的实用工具代码
      - 此文件夹中的文件可由在 VS Code 外运行的测试加载
      - 它们应从 `vscodeTypes` 模块导入基础类型，此模块在测试中会被模拟
      - 不能从 `./platform` 或 `./extension` 文件夹导入
   - platform
      - 该文件夹包含用于实现扩展的服务，如遥测、配置、搜索等
      - 可以从 `./util` 导入- 扩展
  - 这是实现所有功能的大文件夹。
  - 可以从 `./util` 和 `./platform` 导入
- 测试
  - 该文件夹中的测试代码可以从 `base/` 导入，但不能从 `extension/` 导入

### 运行时（node.js, web worker）

Copilot 支持 node.js 和 web worker 扩展宿主，这意味着它既可以在桌面运行，也可以在 web 上运行，即使没有连接远程（“无服务器”）。因此，我们正在构建两种类型的扩展：

* `./extension/extension/vscode-node/extension.ts`：扩展运行在 node.js 扩展宿主中
* `./extension/extension/vscode-worker/extension.ts`：扩展运行在 web worker 扩展宿主中

尽可能地，我们尝试在 node.js 和 web worker 扩展宿主中运行相同的代码。具有运行时特定的代码应该是例外而非规则。

以下是一些在 web worker 扩展宿主中不支持的代码示例：
* 直接使用 node.js API（例如 `require`、`process.env`、`fs`）
* 使用不适用于网页的 node.js 模块
* 对网页不支持的其他扩展的依赖（例如 `vscode.Git` 扩展）

在各自的运行环境中从源代码运行扩展：
* `node`：只需使用启动配置（"Launch Copilot Extension"）
* `web`
  * 确保在 `package.json` 中有一个条目 `"browser": "./dist/web"`
  * 运行 `npm run web`
  * 在浏览器中打开 `http://localhost:3000`
  * 在 VS Code 中配置隐藏设置 `chat.experimental.serverlessWebEnabled` 为 `true`（如果是第一次设置，请重载）

### 贡献与服务

像在 VS Code 中一样，Copilot 扩展是通过贡献和服务构建的，这样组件既可以相互隔离，也可以共同提供和使用服务。

贡献会在这些文件夹中注册，并在扩展运行时自动被拾取：
* `./extension/extension/vscode/contributions.ts`：可在 node.js 和 web worker 扩展宿主中运行的贡献* `./extension/extension/vscode-node/contributions.ts`：仅在 Node.js 扩展宿主中运行的贡献
* `./extension/extension/vscode-worker/contributions.ts`：仅在 Web Worker 扩展宿主中运行的贡献

同样，服务会被注册，并自动由创建这些贡献的主实例化服务采集：
* `./extension/extension/vscode/services.ts`：可以在 Node.js 和 Web Worker 扩展宿主中运行的服务
* `./extension/extension/vscode-node/services.ts`：仅在 Node.js 扩展宿主中运行的服务
* `./extension/extension/vscode-worker/services.ts`：仅在 Web Worker 扩展宿主中运行的服务

同样，尽量将你的服务和贡献放到 `vscode` 层，以便它可以在所有支持的运行时中使用。

## 代理模式

与代理模式相关的主要有趣文件是：

- [`agentPrompt.tsx`](src/extension/prompts/node/agent/agentPrompt.tsx)：渲染的主要入口代理提示
- [`agentInstructions.tsx`](src/extension/prompts/node/agent/agentInstructions.tsx)：代理模式系统提示
- [`toolCallingLoop.ts`](src/extension/intents/node/toolCallingLoop.ts)：运行代理循环
- [`chatAgents.ts`](src/extension/conversation/vscode-node/chatParticipants.ts)：注册代理模式和其他参与者，以及来自 VS Code 请求的处理程序。

目前，代理模式本质上是注册到 VS Code 的[聊天参与者](https://code.visualstudio.com/api/extension-guides/chat)。它主要使用标准 API 以及标准 [`vscode.lm.invokeTool`](https://code.visualstudio.com/api/references/vscode-api#lm.tools) API 来调用工具，但在 `package.json` 中通过标记注册为“代理模式”参与者。它还具备一些由[提议 API](https://code.visualstudio.com/api/advanced-topics/using-proposed-api) 驱动的特殊能力。

> **注意**：代码库中某些“代理”的使用可能指的是我们的较早聊天参与者（`@workspace`、`@vscode` 等）或由 GitHub 应用安装的 Copilot 扩展代理。

## 工具

Copilot 注册了多种不同的工具。工具也可以来自其他 VS Code 扩展或已在 VS Code 注册的 MCP 服务器。VS Code 中的工具选择器主要决定启用哪些工具，这个工具集合会在 ChatRequest 中传递给代理。一些编辑工具仅对某些模型或基于配置或实验时才启用。代理对包含哪些工具在请求中具有最终决定权，这个逻辑位于 [`agentIntent.ts`](src/extension/intents/node/agentIntent.ts) 中的 `getTools`。

### 开发工具

工具通过 VS Code 的常规 [语言模型工具 API](https://code.visualstudio.com/api/extension-guides/tools) 注册。内置工具的关键部分如下：

- [`package.json`](package.json)：工具描述和架构在此定义。[`toolNames.ts`](src/extension/tools/common/toolNames.ts)：包含面向模型的工具名称。
- [`tools/`](src/extension/tools/node/)：工具实现位于此文件夹中。在大多数情况下，它们是标准 `vscode.LanguageModelTool` 接口的实现，但由于有些工具具有额外的自定义行为，因此可以实现扩展的 `ICopilotTool` 接口。

请查看 [tools.md](docs/tools.md) 文档，了解开发工具的更多重要细节。在添加新工具之前，请务必阅读它！

## Tree Sitter

我们现在已迁移到 https://github.com/microsoft/vscode-tree-sitter-wasm 以获取 WASM 预构建版本。

## 故障排除

### 读取请求

要轻松查看 Copilot Chat 发出的请求详情，请运行命令“显示聊天调试视图”。这将显示一个树状视图，其中每个条目对应一次请求。你可以查看发送到模型的提示、启用的工具、响应以及其他关键细节。在进行任何操作时，请始终阅读提示。更改，以确保它按预期呈现！您可以通过右键点击 > “导出为...” 来保存请求日志。

该视图还显示了工具调用的条目，以及可以在简单浏览器中打开的 prompt-tsx 调试视图。

> 🚨 **注意**：此日志在排查问题时也非常有用，如果您在提交有关代理行为的问题时分享它，我们将不胜感激。但此日志可能包含个人信息，例如您的文件内容或终端输出。请在与他人共享之前仔细检查其内容。

## API 更新

在更新扩展使用的 VS Code 提议扩展 API 时，我们有两种工具来确保安装的扩展版本与 VS Code 版本兼容：`package.json` 中的 `engines.vscode` 字段，以及提议的 API 版本。

### 对 API 进行重大更改

当对提议的 API 进行破坏性更改时，使其不再向后兼容，您必须更新提案的 API 版本。这在提案的 .d.ts 文件顶部的注释中声明，并且会通过构建任务在 `extensionsApiProposals.ts` 中自动更新。示例：https://github.com/microsoft/vscode/blob/93a7382ecd63439a5bc507ef60e57610845ec05d/src/vscode-dts/vscode.proposed.lmTools.d.ts#L6。

然后，您必须在扩展中采纳此更改，并在 `package.json` 的 `enabledApiProposals` 中声明该扩展支持此版本的 API，例如 `lmTools@2`。这将确保该扩展仅在支持相同版本 API 的 VS Code 版本中安装和激活。

此外，您必须在 VS Code 中进行更改的同时在扩展中采纳该更改，否则第二天的 Insiders 构建将无法拥有兼容的 Copilot Chat 扩展可用。

破坏向后兼容性的更改示例：
- 重命名扩展使用的方法
- 更改现有方法接受的参数为扩展已经使用的提案添加必需的静态贡献点

### 对 API 进行增量更改

当对提议的 API 进行更改以添加新功能但不破坏向后兼容性时，你不必更新 API 版本，因为旧版本的扩展仍然可以在新的 VS Code 构建中工作。但是，一旦采用新 API，你必须更新 `package.json` 中 `engines.vscode` 字段的日期部分。例如，`"vscode": "^1.91.0-20240624"`。这确保扩展只会安装和激活在支持新 API 的 VS Code 版本中。

增量更改示例
- 向 `ChatResponseStream` 添加新的响应类型
- 添加新的 API 提案
- 向现有接口添加新方法

## 在 Code OSS 上运行

### 桌面端

只要遵循以下步骤，你就可以在 Code OSS Desktop 上运行扩展：
- 在 `vscode` 中创建顶层的 `product.overrides.json`仓库
- 将以下内容作为 JSON 添加
- 在 Code OSS 中运行扩展启动配置

```json
{
   "trustedExtensionAuthAccess": {
      "github": [
         "github.copilot-chat"
      ]
   }
}
```

### 网页版

Code OSS 网页版不支持 `product.overrides.json` 方法。你必须手动将 `defaultChatAgent` 属性的内容复制到 `src/vs/platform/product/common/product.ts` 文件中，[点击这里查看](https://github.com/microsoft/vscode/blob/d499211732305086bbac4e603392e540dee05bd2/src/vs/platform/product/common/product.ts#L72)。

例如：

```ts
Object.assign(product, {
		version: '1.102.0-dev',
		nameShort: 'Code - OSS Dev',
		nameLong: 'Code - OSS Dev',
		applicationName: 'code-oss',
		dataFolderName: '.vscode-oss',
		urlProtocol: 'code-oss',
		reportIssueUrl: 'https://github.com/microsoft/vscode/issues/new',
		licenseName: 'MIT',
		licenseUrl: 'https://github.com/microsoft/vscode/blob/main/LICENSE.txt',
		serverLicenseUrl: "}“https://github.com/microsoft/vscode/blob/main/LICENSE.txt”
		defaultChatAgent： {
			'extensionId'： 'GitHub.copilot'，
			'chatExtensionId'： 'GitHub.copilot-chat'，
			'documentationUrl'： 'https://aka.ms/github-copilot-overview'，
			'termsStatementUrl'： 'https://aka.ms/github-copilot-terms-statement'，
			'privacyStatementUrl'： 'https://aka.ms/github-copilot-privacy-statement'，
			'skusDocumentationUrl'： 'https://aka.ms/github-copilot-plans'，
			'publicCodeMatchesUrl'： 'https://aka.ms/github-copilot-match-public-code'，
			'manageSettingsUrl'： 'https://aka.ms/github-copilot-settings'，
			'managePlanUrl'： 'https://aka.ms/github-copilot-manage-plan'，
			'manageOverageUrl'： 'https://aka.ms/github-copilot-manage-overage'，
			'upgradePlanUrl'： 'https://aka.ms/github-copilot-upgrade-plan'，
			'signUpUrl'： 'https://aka.ms/github-sign-up'，
			'提供者'：{
				“默认”：{
					'id'： 'GitHub'，
					'name'： 'GitHub'
				},
				“企业号”：{
					'id'： 'GitHub-enterprise'，
					'名字'：“GHE.com”},
				'谷歌'：{
					'id'： 'google'，
					'名字'：'谷歌'
				},
				'苹果'：{
					'id'： 'apple'，
					“名字”：“苹果”
				}
			},
			'providerUriSetting'： 'github-enterprise.uri'，
			'providerScopes'： [
				[
					'用户：邮件'
				],
				[
					'read：user'
				],
				[
					“read：user”，
					'user：email'，
					“repo”，
					“工作流程”
				]
			],
			'entitlementUrl'： 'https://api.github.com/copilot_internal/user'，
			'entitlementSignupLimitedUrl'： 'https://api.github.com/copilot_internal/subscribe_limited_user'，
			'chatQuotaExceededContext'： 'github.copilot.chat.quotaExceeded'，
			'completionsQuotaExceededContext'： 'github.copilot.completions.quotaExceeded'，
			'walkthroughCommand'： 'github.copilot.open.walkthrough'，
			'completionsMenuCommand'： 'github.copilot.toggleStatusMenu'，
			'completionsRefreshTokenCommand'： 'github.copilot.signIn'，
			'chatRefreshTokenCommand'： 'github.copilot.refreshToken'，
			'completionsAdvancedSetting'： 'github.copilot.advanced'，'completionsEnablementSetting': 'github.copilot.enable',
			'nextEditSuggestionsSetting': 'github.copilot.nextEditSuggestions.enabled'
		},
		trustedExtensionAuthAccess: {
			'github': [
				'github.copilot-chat'
			]
		}
	});
}