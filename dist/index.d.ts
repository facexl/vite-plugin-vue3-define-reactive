import { Plugin } from 'vite';

declare const DEFINE_REACTIVE = "defineReactive";
interface userOptions {
    debug?: Boolean;
    needImport?: Boolean;
}
declare function defineReactiveVitePlugin(userOptions: userOptions): Plugin;
declare const transformDefineReactiveMacro: (src: string, options: userOptions) => string | void;

export { DEFINE_REACTIVE, defineReactiveVitePlugin as default, transformDefineReactiveMacro };
