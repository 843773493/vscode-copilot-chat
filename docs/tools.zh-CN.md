## 所以你想要编写一个工具

刚接触 LLM 工具？这里有一些起步资源：
- https://code.visualstudio.com/api/extension-guides/tools
- https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview
- https://platform.openai.com/docs/guides/function-calling?api-mode=chat
- https://www.anthropic.com/engineering/building-effective-agents

本文旨在为 vscode-copilot-chat 添加工具，但大部分内容同样适用于其他扩展或 MCP 服务器中的工具。

### 我们需要一个新工具吗？

首先，考虑是否需要一个新的内置工具。如果工具与 VS Code 核心功能或核心搜索/编辑/终端代理循环相关，并且对于常见的即用场景是必需的，那么应构建为内置工具。考虑该工具是否可以通过其他扩展提供。如果任务可以通过常规终端命令完成，那么可能不需要单独的工具。

### 静态部分

首先，在 vscode-copilot 的 package.json 中添加一个条目，在'contributes.languageModelTools'：
- ~~给它起个以'copilot_'开头的名字——这个图案只限我们使用~~
  - 这已经过时了——新工具可以使用任何名称，我觉得匹配“toolReferenceName”可能是个好主意。
  - 现有的“copilot_”工具将在后续重新命名。
- 赋予合理的“toolReferenceName”和本地化的“userDescription”。
  - “toolReferenceName”是工具选择器中使用的名称，用于用“#”引用工具，并将工具添加到模式或工具集。
  - 将其添加到“contributes.languageModelToolSets”中的工具集——新工具应作为工具集的一部分。
- 现在写你的“modelDescription”。这就是LLM用来决定是否使用你的工具的依据。这不应该是本地化的。要非常详细：
  - 这个工具到底是干什么的？
  - 它会返回什么样的信息？
  - 在什么情况下应该使用该工具？
  - 阅读更多 [最佳最佳实践](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview#best-practices-for-tool-definitions)
- 如果工具需要输入，请添加一个 `inputSchema`。这是一个 JSON 模式，必须描述一个包含工具所需属性的对象。详细描述这些属性。文件路径应为绝对路径。仔细考虑哪些属性是 `必需` 的。
- 在 `toolNames.ts` 中，为 `ToolName`、`ContributedToolName`、`contributedToolNameToToolNames` 添加条目。遵循其他工具的命名模式。`ToolName` 是 LLM 将看到的工具真实名称，同时要清晰明了。一个好的模式是以动词开头，例如 `read_file`。
- 记住要查看其他执行类似操作的工具，并确保你的工具在输入和术语上与它们保持一致，并且功能上不重叠。这样可以确保 LLM 能够理解如何将它们一起使用。

### 工具实现部分

然后，实现你的`src/extension/tools/node` 中的工具：
- 如果你的工具需要输入，请编写一个接口，并确保它与 package.json 中的模式完全匹配，包括哪些属性是必需的。
- 一个典型的工具可以实现 `vscode.LanguageModelTool`。更复杂的工具可以实现 `ICopilotTool`，这会为你提供一些额外功能。
- 调用 `ToolRegistry.registerTool(YourTool);` 并在 `allTools.ts` 中导入你的工具文件。
- 你的工具是否与模拟器/swebench 场景相关？如果相关，请检查它是否正常工作。
- 如果工具结果不是简单的字符串，建议使用 prompt-tsx。这允许你从多个部分组合结果，或重用其他 prompt-tsx 组件。

### 输入验证

- 输入将根据 package.json 中的模式进行验证，因此你的工具中不需要重复进行验证。
- 当从 LLM 获取路径作为输入时，请使用 `IPromptPathRepresentationService`。

### 错误处理

如果出现问题，请抛出带有消息的错误这将使大型语言模型（LLM）能够理解。它会被代理捕获并展示给LLM。如果模型再次使用不同的参数调用你的工具，或者做不同的操作，模型应该怎么做？确保模型能理解下一步该怎么做。

### 工具确认

如果工具可能有潜在的危险副作用（例如终端工具），必须在运行前请求用户确认。可以通过返回 `PreparedToolInvocation.confirmationMessages` 来实现。在确认信息中提供足够的上下文，让用户理解工具将执行的操作以及风险是什么。`message` 可以是包含代码块的 Markdown 字符串。

### 美化显示

- 填写 `PreparedToolInvocation.invocationMessage` 和 `pastTenseMessage`，提供在界面中显示的有用信息。
- 不要在工具信息末尾自行添加 `...`
- 如果你希望工具信息能对工具结果产生反应，可以使用 `ExtendedLanguageModelToolResult.toolResultMessage`。
- 使用 Markdown 风格适当。
- 设置 `toolResultDetails` 将使工具消息变成一个可展开的 URI 列表，以显示工具的结果。（例如：文件搜索、文本搜索）

![](./media/expandable-tool-result.png)

- 如果你希望在工具消息中使用可点击的文件小部件（例如：读取文件），请将 `ExtendedLanguageModelToolResult.toolResultMessage` 设置为 MarkdownString，并使用 `formatUriForFileWidget`。目前这不能与 `toolResultDetails` 选项结合使用。

![](./media/file-widget.png)

### 测试

考虑为你的工具编写单元测试。一个可以借鉴的例子是 [`readFile.spec.tsx`](https://github.com/microsoft/vscode-copilot/blob/a2b8af8b8e7286d4da77ff4108b6bcdeb1441d79/src/extension/tools/node/test/readFile.spec.tsx#L40-L59)。该测试使用一些硬编码参数调用工具，并将结果与快照进行比对。

## 模型特定工具

模型特定工具允许你提供仅对某些语言模型可用的工具实现（例如：Gemini、Claude,GPT-5）。这在以下情况下非常有用：
- 模型具有独特功能，需要专用工具
- 你想调整工具描述/方案，使其更好地配合特定模型
- 你需要覆盖某些模型中现有工具的行为

### 何时使用特定型号的工具

在以下情况下使用模型专用工具：
- 该工具利用模型特定的功能（例如，原生模型特征）
- 你需要不同的工具描述或模式，以更好地配合某些模型
- 你想覆盖现有工具针对特定模型的行为

### 注册一个型号专用工具

使用“ToolRegistry.registerModelSpecificTool”注册模型专用工具：

“打字稿”
class MyGeminiTool implements ICopilotModelSpecificTool<IMyToolInput> {
	异步调用（
		选项：VScode。LanguageModelToolInvocationOptions<IMyToolInput>，
		代币：VScode。取消令牌
	）： Promise<vscode.LanguageModelToolResult> {
		双子座专用实现
		返回 { 内容： [{ 类型：“文本”，值：'结果'}] };
	}
}

用模型选择器注册
const disposable = ToolRegistry.registerModelSpecificTool（
	{
		名称：“my_gemini_tool”，
		displayName：“我的双子座工具”，
		描述：“一款为双子座模型优化的工具”，
		inputSchema： {
			类型：“对象”，
			性质：{
				query： { 类型： 'string'， description： 'The query to process' }
			},
			必修：['查询']
		},
		仅适用于双子座3号：
		模特们：[{ 家族：“Gemini-3-PRO” }]
	},
	我的双子星工具
);
```

### 覆盖现有工具

如果你的模型专用工具需要替换某些模型的现有工具，可以使用“overridesTool”属性：

“打字稿”
class MyGeminiSearchTool 扩展 GenericGrepSearchTool {
	公开可读覆盖Tool = ToolName.GrepSearch;
		双子座优化搜索实现
	}
}

ToolRegistry.registerModelSpecificTool（
	{
		名称：“gemini_grep_search”，
		displayName：“Search （Gemini）”，
		描述：“对双子座进行优化的grep搜索”，
		模型：[{ 家庭：'gemini' }],
		inputSchema: { /* ... */ }
	},
	MyGeminiSearchTool
);
```

当设置 `overridesTool` 时：
- 模型特定工具在 UI 中 **无法单独选择**
- 启用并匹配模型时，会自动替换基础工具
- 要使覆盖生效，基础工具必须已注册并启用

### 阅读提示

阅读提示。没有什么替代方法能像频繁使用你的工具并阅读提示那样有效。请从头到尾完整阅读。它讲述了什么故事？熟悉整个提示，不要只关注单条信息。作为人类，你能理解新工具的结果吗？它的格式是否与其他工具结果和用户消息的上下文一致？

![](./media/debug-view.png)
![](./media/tool-log.png)