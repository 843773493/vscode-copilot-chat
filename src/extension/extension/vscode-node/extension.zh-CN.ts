/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Note 1: 这个文件实现了仅在 Node.js 扩展宿主中运行的扩展入口点（vscode-node）。
// Note 2: 若希望在所有扩展运行时（包括 web worker / web extension）都可用，
//         优先将共享代码添加到 `../vscode/extension.ts`。

import { ExtensionContext } from 'vscode';
import { resolve } from '../../../util/vs/base/common/path';
import { baseActivate } from '../vscode/extension';
import { vscodeNodeContributions } from './contributions';
import { registerServices } from './services';

// Note 3: 通过导入侧效果模块（`../../intents/node/allIntents`）来注册 Node 环境下的意图处理器。
//         这是典型的 "仅导入以触发模块初始化" 的用法，不会显式导出符号。
// 额外提示：这种做法在模块含全局副作用（如注册处理器、单例等）时较为常见。
//#region TODO@bpasero this needs cleanup
import '../../intents/node/allIntents';

// Note 4: 开发时可选的包配置函数。
// Note 5: `source-map-support` 能在运行时将编译后的堆栈映射回 TypeScript 源，便于调试；
//         `dotenv` 用于在开发环境加载 `.env` 文件中的配置。
// Note 6: 通过 try/catch 包裹 require，是为了在生产或缺少这些包时仍保持运行（容错）。
function configureDevPackages() {
	try {
		const sourceMapSupport = require('source-map-support');
		sourceMapSupport.install();
		const dotenv = require('dotenv');
		dotenv.config({ path: [resolve(__dirname, '../.env')] });
	} catch (err) {
		console.error(err);
	}
}
//#endregion

// Note 7: 扩展的激活函数。通常由 VS Code 在扩展宿主中调用。
// Note 8: 这里调用的是通用的 `baseActivate` 工厂函数，并传入：
//         - `context`: 扩展上下文，包含订阅、全局状态等。
//         - `registerServices`: 在启动时注入依赖服务的函数（依赖注入）。
//         - `contributions`: 当前运行时特定的功能清单（命令、视图、配置等）。
//         - `configureDevPackages`: 开发时的额外配置（如 source-map、dotenv）。
//         - `forceActivation`: 可选标志，用于强制激活扩展（测试或特殊场景）。
export function activate(context: ExtensionContext, forceActivation?: boolean) {
	return baseActivate({
		context,
		registerServices,
		contributions: vscodeNodeContributions,
		configureDevPackages,
		forceActivation
	});
}

// Note 9: 重要提示 - 本文件假定在 Node.js 环境中运行，避免在其中使用仅在浏览器可用的 API（如 DOM、window）。
// Note 10: 若需将逻辑分享给 web 扩展，请将实现抽象到 `../vscode/extension.ts` 并在平台特定启动代码中注入差异。
