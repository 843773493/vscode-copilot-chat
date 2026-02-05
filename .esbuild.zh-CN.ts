/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Note 1: 本文件为项目的构建脚本，使用 esbuild 来打包不同目标（Node / 浏览器 / 测试等）。
// Note 2: 请勿直接更改运行时行为 —— 我们仅添加注释以便学习和理解构建流程。

import * as watcher from '@parcel/watcher';
import * as esbuild from 'esbuild';
import * as fs from 'fs';
import { copyFile, mkdir } from 'fs/promises';
import { glob } from 'glob';
import * as path from 'path';

// Note 3: import.meta.dirname 用来获取本脚本所在目录，便于构造相对路径（如 package.json、src 等）。
const REPO_ROOT = import.meta.dirname;
// Note 4: 下面的三个常量用于在命令行参数中开启不同的构建模式（观察、开发、预发布）。
const isWatch = process.argv.includes('--watch');
const isDev = process.argv.includes('--dev');
const isPreRelease = process.argv.includes('--prerelease');

// Note 5: 通用的 esbuild 构建选项，多个具体构建会继承此对象以保证一致性。
const baseBuildOptions = {
	bundle: true,
	logLevel: 'info',
	minify: !isDev,
	outdir: './dist',
	sourcemap: isDev ? 'linked' : false,
	sourcesContent: false,
	treeShaking: true
} satisfies esbuild.BuildOptions;

// Note 6: 针对 Node 平台的基础配置，列出了不应被打包进去的外部依赖（native 模块、测试运行时等）。
const baseNodeBuildOptions = {
	...baseBuildOptions,
	external: [
		'./package.json',
		'./.vscode-test.mjs',
		'playwright',
		'keytar',
		'@azure/functions-core',
		'applicationinsights-native-metrics',
		'@opentelemetry/instrumentation',
		'@azure/opentelemetry-instrumentation-azure-sdk',
		'electron', // 用于 simulation workbench
		'sqlite3',
		'node-pty', // 被 @github/copilot 需要的本机依赖
		'@github/copilot',
		...(isDev ? [] : ['dotenv', 'source-map-support'])
	],
	platform: 'node',
	mainFields: ["module", "main"], // 为了兼容 jsonc-parser 等包的主字段解析
	define: {
		'process.env.APPLICATIONINSIGHTS_CONFIGURATION_CONTENT': JSON.stringify(JSON.stringify({
			proxyHttpUrl: "",
			proxyHttpsUrl: ""
		}))
	},
} satisfies esbuild.BuildOptions;

// Note 7: webview 专用的打包配置（在浏览器环境中运行的小型入口）。
const webviewBuildOptions = {
	...baseBuildOptions,
	platform: 'browser',
	target: 'es2024', // Electron 34 -> Chrome 132 -> ES2024
	entryPoints: [
		{ in: 'src/extension/completions-core/vscode-node/extension/src/copilotPanel/webView/suggestionsPanelWebview.ts', out: 'suggestionsPanelWebview' },
	],
} satisfies esbuild.BuildOptions;

// Note 8: 测试相关的 glob 模式，用于查找扩展测试文件（用于把测试打包进测试运行器）。
const nodeExtHostTestGlobs = [
	'src/**/vscode/**/*.test.{ts,tsx}',
	'src/**/vscode-node/**/*.test.{ts,tsx}',
	// deprecated: 旧的测试路径支持
	'src/extension/**/*.test.{ts,tsx}'
];

// Note 9: 下面的插件会在构建时动态生成一个入口模块，把所有测试文件 require 进来，方便在单个捆绑包中运行测试。
const testBundlePlugin: esbuild.Plugin = {
	name: 'testBundlePlugin',
	setup(build) {
		build.onResolve({ filter: /[\/\\]test-extension\.ts$/ }, args => {
			if (args.kind !== 'entry-point') {
				return;
			}
			return { path: path.resolve(args.path) };
		});
		build.onLoad({ filter: /[\/\\]test-extension\.ts$/ }, async args => {
			let files = await glob(nodeExtHostTestGlobs, { cwd: REPO_ROOT, posix: true, ignore: ['src/extension/completions-core/**/*'] });
			files = files.map(f => path.posix.relative('src', f));
			if (files.length === 0) {
				throw new Error('No extension tests found');
			}
			return {
				contents: files
					.map(f => `require('./${f}');`)
					.join(''),
				watchDirs: files.map(path.dirname),
				watchFiles: files,
			};
		});
	}
};

const nodeExtHostSanityTestGlobs = [
	'src/**/vscode-node/**/*.sanity-test.{ts,tsx}',
];

// Note 10: 与上面的测试插件类似，但用于 "sanity"（基本健全性）测试集合。
const sanityTestBundlePlugin: esbuild.Plugin = {
	name: 'sanityTestBundlePlugin',
	setup(build) {
		build.onResolve({ filter: /[\/\\]sanity-test-extension\.ts$/ }, args => {
			if (args.kind !== 'entry-point') {
				return;
			}
			return { path: path.resolve(args.path) };
		});
		build.onLoad({ filter: /[\/\\]sanity-test-extension\.ts$/ }, async args => {
			let files = await glob(nodeExtHostSanityTestGlobs, { cwd: REPO_ROOT, posix: true, ignore: ['src/extension/completions-core/**/*'] });
			files = files.map(f => path.posix.relative('src', f));
			if (files.length === 0) {
				throw new Error('No extension tests found');
			}
			return {
				contents: files
					.map(f => `require('./${f}');`)
					.join(''),
				watchDirs: files.map(path.dirname),
				watchFiles: files,
			};
		});
	}
};

// Note 11: 处理第三方包中使用 import.meta.url 的兼容性问题（例如 @anthropic-ai/claude-agent-sdk）
const importMetaPlugin: esbuild.Plugin = {
	name: 'claudeAgentSdkImportMetaPlugin',
	setup(build) {
		// 针对 .mjs 文件中使用 import.meta.url 的情况，替换为 Node 兼容的运行时表达式
		build.onLoad({ filter: /node_modules[\/\\]@anthropic-ai[\/\\]claude-agent-sdk[\/\\].*\.mjs$/ }, async (args) => {
			const contents = await fs.promises.readFile(args.path, 'utf8');
			return {
				contents: contents.replace(
					/import\.meta\.url/g,
					'require("url").pathToFileURL(__filename).href'
				),
				loader: 'js'
			};
		});
	}
};

// Note 12: 创建一个虚拟模块用以在运行时按需 require vscode（方便测试/模拟环境）。
const shimVsCodeTypesPlugin: esbuild.Plugin = {
	name: 'shimVsCodeTypesPlugin',
	setup(build) {
		// 在解析 vscode 模块时，返回一个名为 vscode-dynamic 的虚拟模块
		build.onResolve({ filter: /^vscode$/ }, args => {
			return {
				path: 'vscode-dynamic',
				namespace: 'vscode-fallback'
			};
		});

		build.onLoad({ filter: /^vscode-dynamic$/, namespace: 'vscode-fallback' }, () => {
			return {
				contents: `
					let vscode;
					// 参见 test/simulationExtension/extension.js，那里创建了 COPILOT_SIMULATION_VSCODE
					if (typeof COPILOT_SIMULATION_VSCODE !== 'undefined') {
						vscode = COPILOT_SIMULATION_VSCODE;
					} else {
						try {
							vscode = eval('require(' + JSON.stringify('vscode') + ')');
						} catch (e) {
							vscode = require('./src/util/common/test/shims/vscodeTypesShim.ts');
						}
					}
					module.exports = vscode;
				`,
				resolveDir: REPO_ROOT
			};
		});
	}
};

// Note 13: Node 扩展宿主（ext host）的构建选项，列出了多个入口点（主扩展、各种 worker、测试入口等）。
const nodeExtHostBuildOptions = {
	...baseNodeBuildOptions,
	entryPoints: [
		{ in: './src/extension/extension/vscode-node/extension.ts', out: 'extension' },
		{ in: './src/platform/parser/node/parserWorker.ts', out: 'worker2' },
		{ in: './src/platform/tokenizer/node/tikTokenizerWorker.ts', out: 'tikTokenizerWorker' },
		{ in: './src/platform/diff/node/diffWorkerMain.ts', out: 'diffWorker' },
		{ in: './src/platform/tfidf/node/tfidfWorker.ts', out: 'tfidfWorker' },
		{ in: './src/extension/onboardDebug/node/copilotDebugWorker/index.ts', out: 'copilotDebugCommand' },
		{ in: './src/extension/chatSessions/vscode-node/copilotCLIShim.ts', out: 'copilotCLIShim' },
		{ in: './src/test-extension.ts', out: 'test-extension' },
		{ in: './src/sanity-test-extension.ts', out: 'sanity-test-extension' },
	],
	loader: { '.ps1': 'text' },
	plugins: [testBundlePlugin, sanityTestBundlePlugin, importMetaPlugin],
	external: [
		...baseNodeBuildOptions.external,
		'vscode'
	]
} satisfies esbuild.BuildOptions;

// Note 14: 在 Web Worker（扩展的 web 环境）中打包的配置，注意格式为 cjs 以导出 activate 函数供扩展加载。
const webExtHostBuildOptions = {
	...baseBuildOptions,
	platform: 'browser',
	entryPoints: [
		{ in: './src/extension/extension/vscode-worker/extension.ts', out: 'web' },
	],
	format: 'cjs', // 为了从捆绑包中导出 activate 函数
	external: [
		'vscode',
		'http',
	]
} satisfies esbuild.BuildOptions;

// Note 15: 用于生成模拟扩展的测试输出目录和入口设置。
const nodeExtHostSimulationTestOptions = {
	...nodeExtHostBuildOptions,
	outdir: '.vscode/extensions/test-extension/dist',
	entryPoints: [
		{ in: '.vscode/extensions/test-extension/main.ts', out: './simulation-extension' }
	]
} satisfies esbuild.BuildOptions;

// Note 16: simulation 主进程的打包配置。
const nodeSimulationBuildOptions = {
	...baseNodeBuildOptions,
	entryPoints: [
		{ in: './test/simulationMain.ts', out: 'simulationMain' },
	],
	plugins: [testBundlePlugin, shimVsCodeTypesPlugin],
	external: [
		...baseNodeBuildOptions.external,
	]
} satisfies esbuild.BuildOptions;

// Note 17: 针对 simulation workbench UI 的构建，虽然使用 node 的基础配置，但平台设置为 browser 以便正确绑定 window 等全局。
const nodeSimulationWorkbenchUIBuildOptions = {
	...baseNodeBuildOptions,
	platform: 'browser', // 重要：使用 'browser' 以便正确处理 window
	mainFields: ["browser", "module", "main"],
	entryPoints: [
		{ in: './test/simulation/workbench/simulationWorkbench.tsx', out: 'simulationWorkbench' },
	],
	alias: {
		'vscode': './src/util/common/test/shims/vscodeTypesShim.ts'
	},
	external: [
		...baseNodeBuildOptions.external,

		'../../node_modules/monaco-editor/*',

		// 有些 Node 内置库在 browser 平台下需要显式声明为外部以避免被打包
		'fs',
		'path',
		'readline',
		'child_process',
		'http',
		'assert',
	],
} satisfies esbuild.BuildOptions;

// Note 18: 将 TypeScript 语言服务插件的 package.json 复制到 node_modules 里，以便在运行时被加载。
async function typeScriptServerPluginPackageJsonInstall(): Promise<void> {
	await mkdir('./node_modules/@vscode/copilot-typescript-server-plugin', { recursive: true });
	const source = path.join(import.meta.dirname, './src/extension/typescriptContext/serverPlugin/package.json');
	const destination = path.join(import.meta.dirname, './node_modules/@vscode/copilot-typescript-server-plugin/package.json');
	try {
		await copyFile(source, destination);
	} catch (error) {
		console.error('Error copying package.json:', error);
	}
}

// Note 19: TypeScript server plugin 的构建选项，输出到 node_modules 的 dist 目录，供编辑器扩展加载使用。
const typeScriptServerPluginBuildOptions = {
	bundle: true,
	format: 'cjs',
	// keepNames: true,
	logLevel: 'info',
	minify: !isDev,
	outdir: './node_modules/@vscode/copilot-typescript-server-plugin/dist',
	platform: 'node',
	sourcemap: isDev ? 'linked' : false,
	sourcesContent: false,
	treeShaking: true,
	external: [
		"typescript",
		"typescript/lib/tsserverlibrary"
	],
	entryPoints: [
		{ in: './src/extension/typescriptContext/serverPlugin/src/node/main.ts', out: 'main' },
	]
} satisfies esbuild.BuildOptions;

// Note 20: 主流程：根据是否是监视模式选择构建策略（watch 模式使用 context + rebuild，非 watch 使用一次性 build）。
async function main() {
	if (!isDev) {
		applyPackageJsonPatch(isPreRelease);
	}

	await typeScriptServerPluginPackageJsonInstall();

	if (isWatch) {

		const contexts: esbuild.BuildContext[] = [];

		const nodeExtHostContext = await esbuild.context(nodeExtHostBuildOptions);
		contexts.push(nodeExtHostContext);

		const webExtHostContext = await esbuild.context(webExtHostBuildOptions);
		contexts.push(webExtHostContext);

		const nodeSimulationContext = await esbuild.context(nodeSimulationBuildOptions);
		contexts.push(nodeSimulationContext);

		const nodeSimulationWorkbenchUIContext = await esbuild.context(nodeSimulationWorkbenchUIBuildOptions);
		contexts.push(nodeSimulationWorkbenchUIContext);

		const nodeExtHostSimulationContext = await esbuild.context(nodeExtHostSimulationTestOptions);
		contexts.push(nodeExtHostSimulationContext);

		const typeScriptServerPluginContext = await esbuild.context(typeScriptServerPluginBuildOptions);
		contexts.push(typeScriptServerPluginContext);

		let debounce: NodeJS.Timeout | undefined;

		const rebuild = async () => {
			if (debounce) {
				clearTimeout(debounce);
			}

			debounce = setTimeout(async () => {
				console.log('[watch] build started');
				for (const ctx of contexts) {
					try {
						await ctx.cancel();
						await ctx.rebuild();
					} catch (error) {
						console.error('[watch]', error);
					}
				}
				console.log('[watch] build finished');
			}, 100);
		};


		watcher.subscribe(REPO_ROOT, (err, events) => {
			for (const event of events) {
				console.log(`File change detected: ${event.path}`);
			}
			rebuild();
		}, {
			ignore: [
				`**/.git/**`,
				`**/.simulation/**`,
				`**/test/outcome/**`,
				`.vscode-test/**`,
				`**/.venv/**`,
				`**/dist/**`,
				`**/node_modules/**`,
				`**/*.txt`,
				`**/baseline.json`,
				`**/baseline.old.json`,
				`**/*.w.json`,
				'**/*.sqlite',
				'**/*.sqlite-journal',
				'test/aml/out/**'
			]
		});
		rebuild();
	} else {
		await Promise.all([
			esbuild.build(nodeExtHostBuildOptions),
			esbuild.build(webExtHostBuildOptions),
			esbuild.build(nodeSimulationBuildOptions),
			esbuild.build(nodeSimulationWorkbenchUIBuildOptions),
			esbuild.build(nodeExtHostSimulationTestOptions),
			esbuild.build(typeScriptServerPluginBuildOptions),
			esbuild.build(webviewBuildOptions),
		]);
	}
}

// Note 21: applyPackageJsonPatch 会基于当前构建状态修改 package.json 中的一些字段（用于生成产物时移除开发信息）。
function applyPackageJsonPatch(isPreRelease: boolean) {
	const packagejsonPath = path.join(import.meta.dirname, './package.json');
	const json = JSON.parse(fs.readFileSync(packagejsonPath).toString());

	const newProps: any = {
		buildType: 'prod',
		isPreRelease,
	};

	const patchedPackageJson = Object.assign(json, newProps);

	// Note 22: 移除脚本和依赖信息以避免在发布产物中泄漏开发过程
	delete patchedPackageJson['scripts'];
	delete patchedPackageJson['devDependencies'];
	delete patchedPackageJson['dependencies'];

	fs.writeFileSync(packagejsonPath, JSON.stringify(patchedPackageJson));
}

// Note 23: 启动入口：执行构建脚本
main();
