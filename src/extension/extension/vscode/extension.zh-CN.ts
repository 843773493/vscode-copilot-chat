/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import * as l10n from '@vscode/l10n';
import { commands, env, ExtensionContext, ExtensionMode, l10n as vscodeL10n } from 'vscode';
import { isScenarioAutomation } from '../../../platform/env/common/envService';
import { isProduction } from '../../../platform/env/common/packagejson';
import { IIgnoreService } from '../../../platform/ignore/common/ignoreService';
import { IExperimentationService } from '../../../platform/telemetry/common/nullExperimentationService';
import { IInstantiationServiceBuilder, InstantiationServiceBuilder } from '../../../util/common/services';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { CopilotExtensionApi } from '../../api/vscode/extensionApi';
import { ContributionCollection, IExtensionContributionFactory } from '../../common/contributions';

// ##################################################################################
// ###                                                                            ###
// ###  供 web 与 node.js 扩展宿主共享的扩展激活代码。                           ###
// ###                                                                            ###
// ###    !!! 优先在此处添加代码以支持所有扩展运行时 !!!                         ###
// ###                                                                            ###
// ##################################################################################

// Note 1: 这个文件包含扩展的通用激活逻辑，旨在在不同运行时（例如 Web 或 Node.js）中复用。
// Note 2: 教育性说明会解释为什么把通用逻辑放在这里有助于减少运行时分支和测试复杂度。

export interface IExtensionActivationConfiguration {
	context: ExtensionContext;
	contributions: IExtensionContributionFactory[];
	registerServices: (builder: IInstantiationServiceBuilder, extensionContext: ExtensionContext) => void;
	configureDevPackages?: Function;
	forceActivation?: boolean;
}

export async function baseActivate(configuration: IExtensionActivationConfiguration) {
	const context = configuration.context;
	if (context.extensionMode === ExtensionMode.Test && !configuration.forceActivation && !isScenarioAutomation) {
		// FIXME Running in tests, don't activate the extension
		// 遇到测试模式时，如果没有强制激活且不是场景自动化，跳过激活以避免将扩展代码打包进测试包
		// Note 3: 在测试时不激活扩展可以缩短测试启动时间并减少与外部服务（如网络、文件系统）的交互，
		//         从而让单元测试更稳定和可控。
		return context;
	}

	// 检查扩展是否在 VS Code 的预发布版本中运行
	const isStableVsCode = !(env.appName.includes('Insiders') || env.appName.includes('Exploration') || env.appName.includes('OSS'));
	const showSwitchToReleaseViewCtxKey = 'github.copilot.interactiveSession.switchToReleaseChannel';
	if (context.extension.packageJSON.isPreRelease && isStableVsCode) {
		// Prevent activation of the extension if the user is using a pre-release version in stable VS Code
		// 如果扩展是预发布版本而当前使用的是稳定版 VS Code，则提示用户切换到发布通道
		commands.executeCommand('setContext', showSwitchToReleaseViewCtxKey, true);
		return context;
	} else {
		commands.executeCommand('setContext', showSwitchToReleaseViewCtxKey, undefined);
	}

	if (vscodeL10n.bundle) {
		l10n.config({ contents: vscodeL10n.bundle });
	}

	if (!isProduction) {
		// Must do this before creating all the services which may rely on keys from .env
		// 在创建可能依赖 .env 中键的服务之前，需要先配置开发包
		configuration.configureDevPackages?.();
	}

	const instantiationService = createInstantiationService(configuration);

	await instantiationService.invokeFunction(async accessor => {
		const expService = accessor.get(IExperimentationService);

		// Await initialization of exp service. This ensure cache is fresh.
		// It will then auto refresh every 30 minutes after that.
		// 等待实验服务初始化以确保缓存是最新的；之后会每 30 分钟自动刷新一次
		await expService.hasTreatments();

		// THIS is awaited because some contributions can block activation
		// via `IExtensionContribution#activationBlocker`
		// 这里需要等待，因为某些贡献（contribution）可能通过 activationBlocker 阻塞激活流程
		const contributions = instantiationService.createInstance(ContributionCollection, configuration.contributions);
		context.subscriptions.push(contributions);
		await contributions.waitForActivationBlockers();
	});

	if (ExtensionMode.Test === context.extensionMode && !isScenarioAutomation) {
		return instantiationService; // The returned accessor is used in tests
	}

	return {
		getAPI(version: number) {
			if (version > CopilotExtensionApi.version) {
				throw new Error('Invalid Copilot Chat extension API version. Please upgrade Copilot Chat.');
			}

			return instantiationService.createInstance(CopilotExtensionApi);
		}
	};
}

export function createInstantiationService(configuration: IExtensionActivationConfiguration): IInstantiationService {
	const accessor = new InstantiationServiceBuilder();

	configuration.registerServices(accessor, configuration.context);

	const instantiationService = accessor.seal();
	configuration.context.subscriptions.push(instantiationService);

	instantiationService.invokeFunction(accessor => {

		// Does the initial read of ignore files, but don't block
		// 初始化时读取 .ignore 文件以建立忽略规则，但不阻塞后续操作
		// Note 4: 非阻塞读取可以让扩展更快完成启动流程，同时在后台收集忽略规则以供使用。
		accessor.get(IIgnoreService).init();
	});

	return instantiationService;
}
