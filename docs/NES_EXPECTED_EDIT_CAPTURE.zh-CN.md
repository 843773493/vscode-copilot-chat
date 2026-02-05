# NES 预期编辑捕捉功能

## 概述

这是一个允许用户记录/捕捉“预期建议”的功能，当下一次编辑建议（NES）被拒绝或未出现时。捕获的数据以“.recording.w.json”格式保存（兼容测试基础设施），用于分析和模型改进。

## 开始

### 1.启用该功能
将此设置添加到你的 VS Code “settings.json”中：

'''json
{
  启用捕捉功能
  “github.copilot.chat.advanced.inlineEdits.recordExpectedEdit.enabled”： true
}
```

就是这样！拒绝时自动捕获默认启用。要禁用它（你仍然可以通过**Cmd+K Cmd+R**手动捕获）：
'''json
{
  “github.copilot.chat.advanced.inlineEdits.recordExpectedEdit.onReject”： false
}
```

### 2.捕捉预期编辑

**当NES显示错误建议时：**
1. 拒绝建议（按“Esc”或继续输入）
2. 如果启用了“onReject”，捕获模式会自动开始
3. 输入你*预期*的代码NES 建议
4. 按 **Enter** 保存，或按 **Esc** 取消

**当 NES 没有出现但本应该出现时：**
1. 按 **Cmd+K Cmd+R**（Mac）或 **Ctrl+K Ctrl+R**（Windows/Linux）
2. 输入你希望 NES 建议的代码
3. 按 **Enter** 保存

> **提示：** 在捕获过程中使用 **Shift+Enter** 插入换行（因为 Enter 会保存）。

### 3. 提交你的反馈
捕获了一些编辑后：
1. 打开命令面板（**Cmd+Shift+P** / **Ctrl+Shift+P**）
2. 运行 **"Copilot: Submit NES Captures"**
3. 审查要包含的文件（你可以排除敏感文件）
4. 点击 **Submit Feedback** 创建 PR

### 快速参考

| 操作 | 快捷键 |
|------|--------|
| 手动开始捕获 | **Cmd+K Cmd+R** / **Ctrl+K Ctrl+R** |
| 保存捕获 | **Enter** |
| 取消捕获 | **Esc** |
| 插入换行 | **Shift+Enter** |

| 命令 | 描述 |
|------|------|
| Copilot: Record Expected Edit (NES) | 开始捕获会话 |
| Copilot: Submit NES Captures |将反馈上传到内部仓库 |

## 工作原理

### 触发点
- **自动**：当你拒绝 NES 建议时开始捕获（如果启用了 `onReject` 设置）
- **手动**：当 NES 没有出现但应该出现时，使用键盘快捷键或命令面板

### 捕获会话
当捕获模式处于活动状态时：
1. 状态栏指示器显示：**"NES 捕获模式已激活"**
2. 在编辑器中自然输入你期望的编辑
3. 按 **Enter** 保存或按 **Esc** 取消

### 捕获内容的保存位置
录制内容存储在工作区的 `.copilot/nes-feedback/` 下：
- `capture-<timestamp>.recording.w.json` — 编辑录制
- `capture-<timestamp>.metadata.json` — 捕获的上下文信息

---

## 技术参考

### 命令

| 命令 ID | 描述 |
|------------|-------------|
| `github.copilot.nes.captureExpected.start` | 手动开始捕获 |
| `github.copilot.nes.captureExpected.confirm` | 确认并保存 |
| `github.copilot.nes.captureExpected.abort` | 取消捕获 || 取消捕获 |
| `github.copilot.nes.captureExpected.submit` | 提交到 `microsoft/copilot-nes-feedback` |

### 架构

#### 状态管理
捕获控制器维护最少的状态：
```typescript
{
  active: boolean;
  startBookmark: DebugRecorderBookmark;
  endBookmark?: DebugRecorderBookmark;
  startDocumentId: DocumentId;
  startTime: number;
  trigger: 'rejection' | 'manual';
  originalNesMetadata?: {
    requestUuid: string;
    providerInfo?: string;
    modelName?: string;
    endpointUrl?: string;
    suggestionText?: string;
    // [startLine, startCharacter, endLine, endCharacter]
    suggestionRange?: [number, number, number, number];
    documentPath?: string;
  };
}
```

### 实现流程

捕获流程利用 **DebugRecorder**，它已经能自动追踪所有文档编辑——无需自定义事件监听或手动计算差异。

1. **开始捕获**：在 DebugRecorder 中创建书签，存储当前文档 ID，设置上下文启用键绑定并显示状态栏指示器，请使用键 `copilotNesCaptureMode`。

2. **用户编辑**：用户在编辑器中自然输入期望的编辑内容。DebugRecorder 会在后台自动跟踪所有更改。

3. **确认捕获**：创建结束书签，提取开始/结束书签之间的日志片段，筛选目标文档的编辑内容，将其组合为单个 `nextUserEdit`，并保存到磁盘。

4. **中止/清理**：清除状态，重置上下文键，并释放状态栏项目。

完整实现请参见 [vscode-node/components/expectedEditCaptureController.ts](vscode-node/components/expectedEditCaptureController.ts) 中的 `ExpectedEditCaptureController`。

### 文件输出

#### 位置
录制内容存储在 **第一个工作区文件夹** 的 `.copilot/nes-feedback/` 目录下：

- **完整路径**：`<workspaceFolder>/.copilot/nes-feedback/capture-<timestamp>.recording.w.json`
- **时间戳格式**：ISO 8601，冒号和句点替换为连字符(例如，`2025-12-04T14-30-45`)
- **示例**：`.copilot/nes-feedback/capture-2025-12-04T14-30-45.recording.w.json`
- 如果文件夹不存在，将会自动创建

每次录制会生成两个文件：
1. **录制文件**：`capture-<timestamp>.recording.w.json` - 包含日志和编辑数据
2. **元数据文件**：`capture-<timestamp>.metadata.json` - 包含捕获上下文和时间信息

#### 格式
与 stest 基础设施使用的现有 `.recording.w.json` 结构匹配：

```json
{
  "log": [
    {
      "kind": "header",
      "repoRootUri": "file:///workspace",
      "time": 1234567890,
      "uuid": "..."
    },
    {
      "kind": "documentEncountered",
      "id": 0,
      "relativePath": "src/foo.ts",
      "time": 1234567890
    },
    {
      "kind": "setContent",
      "id": 0,
      "v": 1,
      "content": "...",
      "time": 1234567890
    },
    ...
  ],
  "nextUserEdit": {
    "relativePath": "src/foo.ts",
    "edit": [
      [876, 996, "替换的文本"],[1522年，1530年，“更多文本”]
    ]
  }
}
```

#### 元数据文件
每个录制旁边都会保存一个元数据文件，并附带捕获上下文：
'''jsonc
{
  “captureTimestamp”：“2025-11-19T...”，// ISO开始捕捉时的时间戳
  “触发”：“拒绝”，// 捕获的启动方式：“拒绝”或“手动”
  “durationMs”：5432，// 开始到确认之间的时间以毫秒计
  “noEditExpected”：false，// 如果用户确认且未做编辑，则为真
  “originalNesContext”：{ // 来自被拒绝的NES建议（如果有）的元数据
    “requestUuid”：“...”， // NES 请求的唯一 ID
    “providerInfo”：“...”，// 建议来源（例如，'provider'，'diagnostics'）
    “modelName”：“...”，// 生成建议的 AI 模型
    “endpointUrl”：“...”，// 用于请求的 API 端点
    “建议文本”：“......”，// 实际被拒绝的建议文本
    "suggestionRange": [10, 0, 15, 20]      // 建议的起止位置 [startLine, startChar, endLine, endChar]
  }
}
```

## 优势

- **零障碍**：自然输入，按 Enter — 无需表单或对话框
- **适用两种情况**：被拒绝的建议和错过的机会
- **隐私保护**：敏感文件在提交前会自动过滤

## 边界情况

| 场景 | 行为 |
|----------|----------|
| **多次快速拒绝** | 每次仅激活一次捕获；后续拒绝将被忽略 |
| **文档关闭** | 捕获会自动中止 |
| **未进行编辑** | 有效反馈！保存时标记为 `noEditExpected: true`（表示拒绝是正确的） |
| **大幅编辑** | DebugRecorder 会自动处理大小限制 |

## 反馈提交

当你运行 **"Copilot: 提交 NES 捕获"** 时：

1. 会收集 `.copilot/nes-feedback/` 中的所有捕获
2. 预览对话框会显示哪些文件将被已包含
3. 如果需要，您可以排除特定文件
4. 在 `microsoft/copilot-nes-feedback` 中会创建一个拉取请求

### 隐私与过滤
敏感文件**会自动从提交中排除**：
- VS Code 设置（`settings.json`、`launch.json`）
- 凭证（`.npmrc`、`.env`、`.gitconfig` 等）
- 私钥（`.pem`、`.key`、`id_rsa` 等）
- 敏感目录（`.aws/`、`.ssh/`、`.gnupg/`）

**要求：** GitHub 认证并具有对 `microsoft/copilot-nes-feedback` 仓库的访问权限

---

## 未来增强功能

- **差异预览**：保存前显示可视化对比
- **类别标记**：快速选择期望类型（导入、重构等）
- **自动生成 stest**：自动创建 `.stest.ts` 包装文件

## 相关文件

- [node/debugRecorder.ts](node/debugRecorder.ts) - 核心录制基础设施
- [vscode-node/components/inlineEditDebugComponent.ts](vscode-node/components/inlineEditDebugComponent.ts) - 现有反馈/调试工具和敏感文件过滤
- [vscode-node/components/expectedEditCaptureController.ts](vscode-node/components/expectedEditCaptureController.ts) - 捕获会话管理
- [vscode-node/components/nesFeedbackSubmitter.ts](vscode-node/components/nesFeedbackSubmitter.ts) - 向 GitHub 提交反馈
- [common/observableWorkspaceRecordingReplayer.ts](common/observableWorkspaceRecordingReplayer.ts) - 录制回放逻辑
- [../../../test/simulation/inlineEdit/inlineEditTester.ts](../../../test/simulation/inlineEdit/inlineEditTester.ts) - 测试基础设施