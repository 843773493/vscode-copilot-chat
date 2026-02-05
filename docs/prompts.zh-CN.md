# 编写特定模型的提示语

## 目录

- [概览](#overview)
- [创建自定义提示语](#creating-a-custom-prompt)

**开发工作流程**
- [第 1 步：从默认开始](#step-1-start-with-defaults)
- [第 2 步：测试行为](#step-2-test-behaviors)
- [第 3 步：进行最小调整](#step-3-make-minimal-adjustments)

**验证**
- [预期行为](#expected-behaviors)
- [常见陷阱](#common-pitfalls)
- [测试与调试](#testing--debugging)

## 概览

vscode-copilot-chat 使用**提示注册系统**来将 AI 模型与其最佳提示结构匹配。每个模型提供商都可以拥有自定义提示，以充分利用各自的优势。

### 注册系统的工作方式

[`PromptRegistry`](../src/extension/prompts/node/agent/promptRegistry.ts) 使用以下方法将模型与提示匹配：
1. **自定义匹配器**：`matchesModel()` 函数用于处理复杂逻辑
2. **系列前缀**：对模型系列名称进行简单的字符串匹配

一个提示解析器可以在同一个提供程序系列中为不同的模型返回**不同的提示**。例如，你可能希望为 `gpt-5` 使用一个提示，为 `gpt-5-codex` 使用一个不同的优化提示。解析器的 `resolvePrompt()` 方法会接收端点信息（包括模型名称），并可以使用条件逻辑返回相应的提示类：

```typescript
class MyProviderPromptResolver implements IAgentPrompt {
	static readonly familyPrefixes = ['my-model'];

	resolvePrompt(endpoint: IChatEndpoint): PromptConstructor | undefined {
		// 为不同模型版本提供不同的提示
		if (endpoint.model?.startsWith('my-model-1')) {
			return MyModel1Prompt;  // 针对 1 版本优化
		}
		if (endpoint.model?.startsWith('my-model-4')) {
			return MyModel4Prompt;   // 针对标准 v4 优化
		}
		return MyDefaultPrompt;      // 其他模型的回退
	}
}
```

这使得在保持所有模型变体有序的同时，实现对提示的精细控制成为可能。在一个提供者文件中。

### 文件位置

提示符位于“src/extension/prompts/node/agent/”中：
- **[defaultAgentInstructions.tsx]（../src/extension/prompts/node/agent/defaultAgentInstructions.tsx）** - 基础提示符和共享组件
- **[promptRegistry.ts]（../src/extension/prompts/node/agent/promptRegistry.ts）**
- **[anthropicPrompts.tsx]（../src/extension/prompts/node/agent/anthropicPrompts.tsx）**
- **[openAIPrompts.tsx]（../src/extension/prompts/node/agent/openAIPrompts.tsx）**
- **[geminiPrompts.tsx]（../src/extension/prompts/node/agent/geminiPrompts.tsx）**
- **[xAIPrompts.tsx]（../src/extension/prompts/node/agent/xAIPrompts.tsx）**
- **[vscModelPrompts.tsx]（../src/extension/prompts/node/agent/vscModelPrompts.tsx）**

---

## 创建自定义提示词

### 步骤1：复制默认提示结构

将“DefaultAgentPrompt”从“defaultAgentInstructions.tsx”复制到你的自定义提示文件中：

“TSX
从 '@vscode/prompt-tsx' 导入 { PromptElement， PromptSizing };
导入 {DefaultAgentPromptProps, detectToolCapabilities } 来自 './defaultAgentInstructions';
import { InstructionMessage } from '../base/instructionMessage';

export class MyProviderAgentPrompt extends PromptElement<DefaultAgentPromptProps> {
	async render(state: void, sizing: PromptSizing) {
		const tools = detectToolCapabilities(this.props.availableTools);

		return <InstructionMessage>
			{/* 在这里添加你的自定义内容 */}
		</InstructionMessage>;
	}
}
```

### 第 2 步：创建解析器

实现 `IAgentPrompt` 接口：

```typescript
class MyProviderPromptResolver implements IAgentPrompt {
	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IExperimentationService private readonly experimentationService: IExperimentationService,
	) { }

	static readonly familyPrefixes = ['my-model', 'provider-name'];

	resolvePrompt(endpoint: IChatEndpoint): PromptConstructor | undefined {
		// 简单方法：所有情况使用同一个提示
		return MyProviderAgentPrompt;// 高级：条件逻辑
		if (endpoint.model?.startsWith('my-model-4')) {
			return MyProviderV4Prompt;
		}
		return MyProviderAgentPrompt;
	}
}
```

### 第 3 步：注册

在文件末尾注册你的提示：

```typescript
PromptRegistry.registerPrompt(MyProviderPromptResolver);
```

最后，更新 [`allAgentPrompts.ts`](../src/extension/prompts/node/agent/allAgentPrompts.ts) 文件，以包含你的自定义提示文件。

---

## 第 1 步：从默认值开始

从 `DefaultAgentPrompt` 开始——无需自定义。大多数模型仅从工具定义就能推断出正确的行为。

默认提示包含最基本的指令：
- 基本角色定义：“你是一个高度智能的自动化编码代理......”
- 工具可用性意识：基于可用工具的条件指令
- 响应格式：Markdown 规则，文件/符号链接化

在优化提示时，请遵循以下原则：
- 从简单开始，仅在需要时添加
- 删除冗余，以提高令牌效率
- 使用条件部分仅包含相关指令
- 保持与工具名称一致的术语

---

## 第2步：测试行为

通过测试场景运行模型并评估关键行为：

### 1. 工具使用模式
- 使用编辑工具（`replace_string_in_file`、`apply_patch`、`insert_edit_into_file`）而不是代码块
- 使用代码搜索工具（`read_file`、`semantic_search`、`grep_search`、`file_search`）来收集上下文
- 使用终端工具（`run_in_terminal`）而不是 bash 命令
- **不使用终端工具来创建、编辑或更新文件** - 始终使用专用编辑工具
- 对于复杂任务使用规划工具（`manage_todo_list`）

### 2. 响应格式
- 文件路径和符号使用反引号链接化
- 使用带有标题和章节的结构化 Markdown
- 在工具调用之间提供简明、及时的进度更新

**常见问题**：一些模型会在前期进行思考，只在最后进行总结。示例修复：
```tsx
每进行 3-5 次工具调用时提供简要的进度更新，以让用户了解你的进展。<br />
在完成并行工具调用后，在进行下一步之前提供简要的状态更新。<br />
```

### 3. 工作流程执行
- 在行动前收集上下文
- 完整执行任务，无需暂停向用户确认
- 适当处理错误并进行迭代

---

## 步骤 3：进行最小调整

**仅在模型持续未能完成步骤 2 行为时进行自定义。**

针对具体问题添加 1-2 句说明：

```tsx
// 修复：模型显示代码块而不是使用编辑工具
{tools[ToolName.ReplaceStringInFile] && <>
  除非用户要求，否则不要打印带有文件更改的代码块。
  使用适当的编辑工具（replace_string_in_file、apply_patch 或 insert_into_file）。
</>}

// 修复：模型并行调用终端工具
{tools[ToolName.CoreRunInTerminal] && <>
  不要多次调用 run_in_terminal 工具并行。
  相反，运行一个命令并等待输出，然后再运行下一个命令。
</>}

// 修复：模型不会使用 TODO 工具进行计划
{tools[ToolName.CoreManageTodoList] && <>
  对于复杂的多步骤任务，使用 manage_todo_list 工具跟踪你的进度
  并向用户提供可见性。
</>}
```

这种方法保持指令针对性，并避免过度指定。

## 第 4 步：测试

将你的模型系列添加到 [`agentPrompt.spec.tsx`](../src/extension/prompts/node/agent/test/agentPrompt.spec.tsx) 顶部的列表中。这将为你的模型渲染提示，并使用一些不同的输入场景来验证提示输出与快照的一致性。这对于检查提示的最终渲染形式、确保任何模型特定的自定义已正确应用以及避免回归非常有用。你可以根据需要添加测试用例，以覆盖提示中任何新的动态逻辑。

---

## 预期行为

模型应具备的关键行为展览：

### 文件/符号 链接化
✅ **正确**：`` 函数 `calculateTotal` 在 `lib/utils/math.ts` 文件中 ``
❌ **错误**：`函数 calculateTotal 在 lib/utils/math.ts 文件中`

### 代码工具使用
✅ **正确**：调用编辑工具（`replace_string_in_file`、`apply_patch`、`insert_into_file`）
❌ **错误**：在 Markdown 代码块中显示代码（除非有明确要求）

**修正**：
```tsx
除非用户要求，否则不要打印包含文件更改的代码块。
使用适当的编辑工具（replace_string_in_file、apply_patch 或 insert_into_file）。
```

### 代码搜索工具
✅ **正确**：在编辑前使用 `read_file`、`semantic_search`、`grep_search` 获取上下文
❌ **错误**：在未阅读代码的情况下做出假设，或使用终端工具读取文件

**修正**：
```tsx
{tools[ToolName.ReadFile] && <>
  在进行更改前，始终使用 read_file 阅读相关文件。
  使用 semantic_search 在整个工作区查找相关代码。
</>}
```

### 终端命令
✅ **正确**：调用 `run_in_terminal` 工具
❌ **错误**：在代码块中显示 bash 命令（除非用户明确要求）

**修复**：
```tsx
{tools[ToolName.CoreRunInTerminal] && <>
  除非用户要求，否则**绝不**输出终端命令的代码块。
  请改用 run_in_terminal 工具。
</>}
```

### 响应格式最佳实践

**简短前言**
✅ `我将为登录功能添加错误处理。`
❌ `感谢您的请求！我知道您希望我添加错误处理。这是个好主意……`

**进度更新**
✅ 每调用 3-5 次工具简短更新
❌ 静默批量处理或持续叙述

**完成总结**
✅ 使用结构良好的 Markdown，包括标题、项目符号、可链接文件
❌ 无格式的长篇文本

**待办事项管理**
✅ 分步创建、更新并标记已完成的待办事项
❌ 复杂多步骤工作不做任务跟踪

---

## 常见陷阱

### 过度指定
❌ **错误**：太多互相矛盾的指令
```tsx你应该使用工具，但也要先思考。需要时再使用工具。不要不必要地使用工具。有效地使用工具。
```
✅ **好**：清晰且可操作
```tsx
你可以重复调用工具以收集上下文并完成任务。
除非你确定请求无法完成，否则不要放弃。
```

### 缺少工具检查
❌ **坏**：假设工具存在
```tsx
使用 read_file 工具来读取文件。
```

✅ **好**：检查可用性
```tsx
{tools[ToolName.ReadFile] && <>使用 read_file 工具来读取文件。</>}
```

### 忽略 prompt-tsx 约定
❌ **坏**：在 JSX 中忽略换行
```tsx
<Tag name='instructions'>
	第 1 行
	第 2 行
</Tag>
```

✅ **好**：显式换行
```tsx
<Tag name='instructions'>
	第 1 行<br />
	第 2 行<br />
</Tag>
```

---

## 测试与调试

打开聊天调试视图以检查实际的提示、工具调用和工具调用结果。这是检查发送给模型的确切提示的最佳方式。
![](./media/debug-view.png)![](./media/tool-log.png)

### 测试场景

**简单查询**
```
用户: 144的平方根是多少？
预期: 12
```

**文件操作**
```
用户: 为 auth.ts 添加错误处理
预期:
- 使用 read_file 读取文件
- 使用编辑工具（replace_string_in_file、apply_patch 或 insert_into_file，而不是代码块）
- 提供带链接的引用
```

**多步骤任务**
```
用户: 创建一个用户管理的 REST API
预期:
- 创建待办事项列表
- 收集上下文
- 逐步实现
- 更新待办事项
- 提供总结
```

**代码搜索**
```
用户: 身份验证是如何工作的？
预期:
- 使用代码搜索工具（semantic_search、grep_search、read_file）
- 结构化 Markdown
- 提供带链接的引用
- 章节标题
```