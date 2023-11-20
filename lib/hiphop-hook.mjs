/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/lib/hiphop-hook.mjs            */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Fri Nov 17 08:15:59 2023                          */
/*    Last change :  Mon Nov 20 07:43:11 2023 (serrano)                */
/*    Copyright   :  2023 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    HipHop loader/resolver hooks.                                    */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    The module                                                       */
/*---------------------------------------------------------------------*/
import { readFile, writeFile, lstat } from 'node:fs/promises';
import { existsSync } from 'fs';
import { dirname, basename, extname, resolve as resolvePath } from 'node:path';
import { cwd } from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compile as hiphop } from "./hhc-compiler.mjs";

/*---------------------------------------------------------------------*/
/*    HipHop extension                                                 */
/*---------------------------------------------------------------------*/
const extensionsRegex = /\.(hh\.m?js)$/;

/*---------------------------------------------------------------------*/
/*    resolve ...                                                      */
/*---------------------------------------------------------------------*/
/* export async function resolve(url, context, nextResolve) {          */
/*    if (extensionsRegex.test(url)) {                                 */
/*       const format = await getPackageType(url);                     */
/*                                                                     */
/*       const { url: rawSource } = await nextResolve(url, { ...context, format }); */
/*       const transformedSource = await compile(url);      */
/*                                                                     */
/*       return {                                                      */
/* 	 shortCircuit: true,                                           */
/* 	 url: "file://" + transformedSource                            */
/*       };                                                            */
/*    }                                                                */
/*                                                                     */
/*    return nextResolve(url);                                         */
/* }                                                                   */

/*---------------------------------------------------------------------*/
/*    load ...                                                         */
/*---------------------------------------------------------------------*/
export async function load(url, context, nextLoad) {
   if (extensionsRegex.test(url)) {
      return nextLoad("file://" + await compile(url));
   } else {
      return nextLoad(url);
   }
}

/*---------------------------------------------------------------------*/
/*    getPackageType ...                                               */
/*---------------------------------------------------------------------*/
async function getPackageType(url) {
   // `url` is only a file path during the first iteration when passed the
   // resolved url from the load() hook
   // an actual file path from load() will contain a file extension as it's
   // required by the spec
   // this simple truthy check for whether `url` contains a file extension will
   // work for most projects but does not cover some edge-cases (such as
   // extensionless files or a url ending in a trailing space)
   const isFilePath = !!extname(url);
   // If it is a file path, get the directory it's in
   const dir = isFilePath ?
      dirname(typeof url === "string" ? url : fileURLToPath(url)):
      url;
   // Compose a file path to a package.json in the same directory,
   // which may or may not exist
   const packagePath = resolvePath(dir, 'package.json');
   // Try to read the possibly nonexistent package.json
   const type = await readFile(packagePath, { encoding: 'utf8' })
      .then((filestring) => JSON.parse(filestring).type)
      .catch((err) => {
	 if (err?.code !== 'ENOENT') console.error(err);
      });
   // Ff package.json existed and contained a `type` field with a value, voila
   if (type) return type;
   // Otherwise, (if not at the root) continue checking the next directory up
   // If at the root, stop and return false
   return dir.length > 1 && getPackageType(resolvePath(dir, '..'));
} 

/*---------------------------------------------------------------------*/
/*    compile ...                                                      */
/*---------------------------------------------------------------------*/
async function compile(url) {
   const path = fileURLToPath(url);
   const target = dirname(path) + "/._" + basename(path).replace(extensionsRegex, ".mjs");

   if (await newer(target, path)) {
      return target;
   } else {
      try {
	 const source = hiphop(path);
	 await writeFile(target, source);
	 return target;
      } catch (err) {
	 console.error(err);
      }
   }
}

/*---------------------------------------------------------------------*/
/*    newer ...                                                        */
/*---------------------------------------------------------------------*/
async function newer(target, source) {
   if (!existsSync(target)) {
      return false;
   } else {
      const tstat = await lstat(target);
      const sstat = await lstat(source);

      return (tstat.ctime > sstat.mtime);
   }
}

   
