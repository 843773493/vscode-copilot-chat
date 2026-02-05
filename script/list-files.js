#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const fs = require('fs');
const path = require('path');

function parseArgs() {
	const args = process.argv.slice(2);
	const opts = {
		namesOnly: false,
		unique: false,
		ignore: new Set(['node_modules', '.git']),
		root: process.cwd(),
	};
	for (const a of args) {
		if (a === '--names-only') {
			opts.namesOnly = true;
		} else if (a === '--unique') {
			opts.unique = true;
		} else if (a.startsWith('--ignore=')) {
			const val = a.substring('--ignore='.length);
			val.split(',').forEach((d) => d && opts.ignore.add(d.trim()));
		} else if (a.startsWith('--root=')) {
			opts.root = a.substring('--root='.length);
		} else {
			// ignore unknown args for safety
		}
	}
	return opts;
}

async function walk(dir, root, acc, opts) {
	let entries;
	try {
		entries = await fs.promises.readdir(dir, { withFileTypes: true });
	} catch (e) {
		// skip unreadable dirs
		return;
	}
	for (const ent of entries) {
		const fullPath = path.join(dir, ent.name);
		const relPath = path.relative(root, fullPath);
		if (ent.isDirectory()) {
			if (opts.ignore.has(ent.name)) {
				continue;
			}
			await walk(fullPath, root, acc, opts);
		} else if (ent.isFile()) {
			const name = ent.name;
			// include file if it has a dot (extension) and is not ending with .zh-CN.{ext}
			if (name.includes('.')) {
				if (!/\.zh-CN\.[^/.]+$/.test(name)) {
					acc.push(relPath);
				}
			}
		}
	}
}

async function main() {
	const opts = parseArgs();
	const results = [];
	await walk(opts.root, opts.root, results, opts);
	let final = results;
	if (opts.unique) {
		final = Array.from(new Set(final));
	}
	if (opts.namesOnly) {
		final = final.map((p) => path.basename(p));
	}
	// Print one per line
	process.stdout.write(final.join('\n'));
}

main().catch((err) => {
	console.error('Error listing files:', err);
	process.exit(1);
});
