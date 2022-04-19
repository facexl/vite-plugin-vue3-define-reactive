import { Plugin } from 'vite';

interface userOptions {
    debug?: Boolean;
    needImport?: Boolean;
}
declare function defineReactiveVitePlugin(userOptions: userOptions): Plugin;
declare const transformDefineReactiveMacro: (src: string, options: userOptions) => string | void;

export { defineReactiveVitePlugin as default, transformDefineReactiveMacro };
