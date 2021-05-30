var path = require("path");
var fs = require("fs");
// import { normalizePath } from "vite";
var { createFilter } = require("@rollup/pluginutils");
const { inspect } = require("util");

const acm = fs.constants.F_OK | fs.constants.R_OK;
const fsp = fs.promises;
const PLUGIN_NAME = '@vue-mfc';
const rePathAbs = /^(\w+:)?[\\\/]+/i;
const afrom = x => x instanceof Array ? x : x ? [x] : [];

const blockTypes = {
	template: {
		min: 0,
		max: 1,
	},
	script: {
		min: 1,
		max: 1,
	},
	style: {
		min: 0,
		max: Infinity,
	},
	custom: {
		min: 0,
		max: Infinity,
	},
};
const blockTypeKeys = Object.keys(blockTypes);

const blockDefs = [
	{
		file: 'html',
		type: 'template',
		output(fpath) {
			return `<template src=${JSON.stringify(fpath)} />\n`;
		}
	},
	{
		file: ['vue-tsx', 'vue-ts', 'vue-jsx', 'vue-js'],
		type: 'script',
		async output(fpath) {
			const code = await fsp.readFile(fpath, 'utf-8');
			return `<script>\n${code}\n</script>\n`;
		}
	},
	{
		file: 'scoped.css',
		type: 'style',
		output(fpath) {
			return `<style scoped src=${JSON.stringify(fpath)} />\n`;
		}
	},
	{
		file: 'css',
		type: 'style',
		output(fpath) {
			return `<style src=${JSON.stringify(fpath)} />\n`;
		}
	},
];

const reExtVue = /\.vue$/;
const reExtDot = /^\.?/;

const resolvingMap = new Map();

async function asyncReduce(list, handler, initial) {
	if (initial === undefined) initial = list.shift();
	while (list.length) {
		let next = list.shift();
		initial = await handler(initial, next);
	}
	return initial;
}

async function processScriptFile(source) {
	const baseExt = path.basename(source);
	const dirname = path.dirname(source);
	const btfound = {};
	const errorFiles = [];
	blockTypeKeys.forEach(k => btfound[k] = 0);
	const blocksScript = [];
	const blocksTemplate = [];
	const blocksStyle = [];
	const blocksCustom = [];
	blockDefs.forEach(block => {
		switch (block.type) {
			case 'script': return blocksScript.push(block);
			case 'template': return blocksTemplate.push(block);
			case 'style': return blocksStyle.push(block);
			case 'custom': return blocksCustom.push(block);
			default: throw new Error(`Unknown block type ${block.type}`);
		}
	});
	let blockScript = await asyncReduce(
		blocksScript,
		async (found, block) => {
			if (found) return found;
			const ext = afrom(block.file).find(f => source.endsWith(f));
			if (ext) return { ...block, file: ext };
		},
		null
	);
	const base = baseExt.substr(0, baseExt.length-blockScript.file.length).replace(/\.+$/, '');
	console.error(PLUGIN_NAME, '-------- process start');
	console.error(PLUGIN_NAME, source);
	console.error(PLUGIN_NAME, blockScript);
	console.error(PLUGIN_NAME, baseExt);
	console.error(PLUGIN_NAME, base);
	console.error(PLUGIN_NAME, dirname);
	console.error(PLUGIN_NAME, '-------- process end');
	const blocks = [
		blockScript,
		...blocksTemplate,
		...blocksStyle,
		...blocksCustom,
	];

	const result = (await Promise.all(blocks.map(({file, type, output}) => {
		return Promise.all(afrom(file).map(file => {
			const fext = file.replace(reExtDot, '.');
			const fpath = path.join(dirname, base+fext);
			let found;
			return fsp.access(fpath, acm)
				.then(
					() => {
						found = true;
						btfound[type]++;
					},
					(error) => {
						found = false;
						errorFiles.push({ fpath, error });
						// filesNotFound.push(`${fpath}:${err && err.message || err}`);
					}
				)
				.then(() => found ? output(fpath) : '');
		}));
	}))).flat().join('');
	const errorValidations = [];
	let error;
	blockTypeKeys.forEach(k => {
		if ( !(btfound[k] >= blockTypes[k].min) ) {
			errorValidations.push(`Found ${btfound[k]} files for ${k} but ${blockTypes[k].min} are required`);
		}
		if ( !(btfound[k] <= blockTypes[k].max) ) {
			errorValidations.push(`Found ${btfound[k]} files for ${k} but only ${blockTypes[k].max} are permitted`);
		}
	});
	if (errorValidations.length) {
		error = `${PLUGIN_NAME}: The following errors were found: ${errorValidations.join(', ')} // file errors: ${errorFiles.map(({fpath, error}) => `${fpath}:${error && error.message || error}`).join(', ')}`;
	}
	return {
		result,
		error,
		errorValidations,
		errorFiles,
	};
}

module.exports = function loadVue (rawOptions = {}) {

	const filter = createFilter(
		rawOptions.include || reExtVue,
		rawOptions.exclude
	);

	// let dirRoot;
	return {
		name: PLUGIN_NAME, // this name will show up in warnings and errors
		// configResolved({root}) {
		// 	// store the resolved config
		// 	dirRoot = root;
		// },
		resolveId ( originalSource, importer ) {
			return Promise.resolve().then(function() {
				const source = //normalizePath(
					// path.isAbsolute(originalSource)
					// 	? path.resolve(dirRoot, originalSource.replace(rePathAbs, '')) :
					path.resolve(path.dirname(importer), originalSource)
				;//);
				if (!filter(source)) return;
				// throw new Error('STOP! hammertime');

				return processScriptFile(source).then(function({ result, error }) {
					if (error) this.error(error);
	
					// console.error(`${PLUGIN_NAME}: COMP GENERATED`, source, plist);
					// console.error(btErrNotFound);
					resolvingMap.set(source, result);
					console.error(PLUGIN_NAME, '-------- resolveId start');
					console.error(PLUGIN_NAME, originalSource, importer);
					console.error(PLUGIN_NAME, path.resolve(path.dirname(importer), originalSource));
					console.error(PLUGIN_NAME, source);
					console.error(PLUGIN_NAME, plist);
					console.error(PLUGIN_NAME, '-------- resolveId end');
					return source;
				});
			});
		},
		async load ( id ) {
			console.error(PLUGIN_NAME, '-------- load start');
			console.error(PLUGIN_NAME, id);
			console.error(PLUGIN_NAME, filter(id));
			console.error(PLUGIN_NAME, resolvingMap.get(id));
			console.error(PLUGIN_NAME, '-------- load end');
			if (!filter(id)) return;
			const output = resolvingMap.get(id);
			if (output === undefined) {

				const { result, error } = await processScriptFile(id);
				if (error) this.error(error);
				return result;
	
			} else {
				resolvingMap.delete(id);
			}
			return output;
		}
	};
}
