import path from "path";
import fs from "fs";
// import { normalizePath } from "vite";
import { createFilter } from "@rollup/pluginutils";

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
		file: ['tsx', 'jsx', 'ts', 'js'],
		type: 'script',
		output(fpath) {
			return `<script src=${JSON.stringify(fpath)} />\n`;
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

export default function loadVue (rawOptions = {}) {

	const filter = createFilter(
		rawOptions.include || reExtVue,
		rawOptions.exclude
	);

	let dirRoot;
	return {
		name: PLUGIN_NAME, // this name will show up in warnings and errors
		configResolved({root}) {
			// store the resolved config
			dirRoot = root;
		},
		async resolveId ( originalSource, importer ) {
			const source = //normalizePath(
				path.isAbsolute(originalSource)
					? path.resolve(dirRoot, originalSource.replace(rePathAbs, ''))
					: path.resolve(path.dirname(importer), originalSource)
			;//);
			if (!filter(source)) return;
			const base = path.basename(source).replace(reExtVue, '');
			const dirname = path.dirname(source);
			const btfound = {};
			blockTypeKeys.forEach(k => btfound[k] = 0);

			const btErrNotFound = [];
			const plist = (await Promise.all(blockDefs.map(({file, type, output}) => {
				return Promise.all(afrom(file).map(file => {
					const fext = file.replace(reExtDot, '.');
					const fpath = path.join(dirname, base, base+fext);
					let found;
					return fsp.access(fpath, acm)
						.then(
							() => {
								found = true;
								btfound[type]++;
							},
							(err) => {
								found = false;
								btErrNotFound.push(`${fpath}:${err && err.message || err}`);
							}
						)
						.then(() => found ? output(fpath) : '');
				}));
			}))).flat().join('');
			const btErr = [];
			blockTypeKeys.forEach(k => {
				if ( !(btfound[k] >= blockTypes[k].min) ) {
					btErr.push(`Found ${btfound[k]} files for ${k} but ${blockTypes[k].min} are required`);
				}
				if ( !(btfound[k] <= blockTypes[k].max) ) {
					btErr.push(`Found ${btfound[k]} files for ${k} but only ${blockTypes[k].max} are permitted`);
				}
			});
			if (btErr.length) {
				this.error(`${PLUGIN_NAME}: The following errors were found: ${btErr.join(', ')} - file errors: ${btErrNotFound.join(', ')}`);
				return null;
			}
			// console.error(`${PLUGIN_NAME}: COMP GENERATED`, source, plist);
			// console.error(btErrNotFound);
			resolvingMap.set(source, plist);
			return source;
		},
		async load ( id ) {
			if (!filter(id)) return;
			const output = resolvingMap.get(id);
			if (output !== undefined) resolvingMap.delete(id);
			return output;
		}
	};
}
