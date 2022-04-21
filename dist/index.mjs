var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};

// src/index.ts
import { parse, babelParse } from "vue/compiler-sfc";

// src/parse.ts
var astParse = function(nodeBody) {
  let res = [];
  nodeBody.forEach((it) => {
    if (it.type === "VariableDeclaration") {
      res = res.concat(getVariableCallee(it, DEFINE_REACTIVE));
    }
    if (it.type === "ExpressionStatement") {
      const temp = getExpressionStatementCall(it, DEFINE_REACTIVE);
      if (temp) {
        res.push(temp);
      }
    }
  });
  return res;
};
function getVariableCallee(nodeBodyItem, targetCallName) {
  let res = [];
  nodeBodyItem.declarations.forEach((it) => {
    if (it.init) {
      const calleeRes = walk(it.init);
      if (calleeRes) {
        res.push({
          id: it.id.name,
          calleeName: calleeRes.name,
          args: calleeRes.args,
          type: "VariableDeclaration",
          source: nodeBodyItem
        });
      }
    }
  });
  return res;
  function walk(obj) {
    if (obj.type === "CallExpression") {
      if (obj.callee && obj.callee.name === targetCallName) {
        if (!obj.arguments || obj.arguments.length === 0) {
          throw new Error(`${targetCallName} must have args`);
        }
        return {
          name: obj.callee.name,
          args: getCalleeArgs(obj.arguments)
        };
      }
    }
    if (obj.type.startsWith("TS") && obj.expression) {
      return walk(obj.expression);
    }
    if (obj.type === "FunctionExpression") {
      return false;
    }
    return false;
  }
}
function getCalleeArgs(args) {
  return walk(args[0]);
  function walk(obj) {
    if (obj.type.startsWith("TS")) {
      return walk(obj.expression);
    }
    if (obj.type === "ObjectExpression") {
      return obj.properties.map((it) => {
        if (it.type !== "ObjectProperty" || it.key.type !== "Identifier") {
          throw new Error(`unexpected error of args`);
        }
        return it.key.name;
      });
    }
    throw new Error(`${DEFINE_REACTIVE} arg must be ObjectExpression`);
  }
}
function getExpressionStatementCall(nodeBodyItem, targetCallName) {
  return walk(nodeBodyItem.expression);
  function walk(obj) {
    if (obj.type.startsWith("TS")) {
      return walk(obj.expression);
    }
    if (obj.type === "CallExpression") {
      if (obj.callee.name === targetCallName) {
        if (!obj.arguments || obj.arguments.length === 0) {
          throw new Error(`${targetCallName} must have args`);
        }
        return {
          calleeName: obj.callee.name,
          args: getCalleeArgs(obj.arguments),
          type: "ExpressionStatement",
          source: nodeBodyItem
        };
      }
    }
    return false;
  }
}

// src/index.ts
var fileRegex = /\.vue$/;
var DEFINE_REACTIVE = "defineReactive";
var default_imports = ["toRefs", "reactive"];
var default_var_name = "auto_identifier__v_";
function defineReactiveVitePlugin(userOptions) {
  const options = __spreadValues({
    debug: false,
    needImport: true
  }, userOptions);
  return {
    name: DEFINE_REACTIVE,
    transform(src, id) {
      if (fileRegex.test(id)) {
        return {
          code: transformDefineReactiveMacro(src, options)
        };
      }
    }
  };
}
var transformDefineReactiveMacro = function(src, options) {
  if (!src.includes(DEFINE_REACTIVE))
    return;
  const log = function(a, b) {
    options.debug && console.log(...arguments);
  };
  const { descriptor } = parse(src);
  log("after vue/compiler-sfc parse:", descriptor);
  let { scriptSetup } = descriptor;
  if (!scriptSetup) {
    throw new Error(`${DEFINE_REACTIVE} only use in script setup`);
  }
  let content = scriptSetup.content;
  const plugins = [];
  if (scriptSetup.attrs.lang === "ts") {
    plugins.push("typescript", "decorators-legacy");
  }
  const scriptAst = babelParse(content, {
    plugins,
    sourceType: "module"
  }).program;
  log("after babelParse ast", scriptAst);
  const nodeBody = scriptAst.body;
  const targets = astParse(nodeBody);
  if (!targets.length) {
    log("ast hit nothing");
    return;
  }
  log("targets", targets);
  const resTargets = targets.map((target) => {
    const needIdentifier = target.type === "ExpressionStatement";
    const newIdentifier = `${default_var_name}${target.source.start}`;
    return {
      needIdentifier,
      newIdentifier,
      source: target.source,
      args: target.args,
      finallyStr: `
 const {${target.args.join(",")}} = toRefs(${needIdentifier ? newIdentifier : target.id})
`
    };
  });
  log("resTargets", resTargets);
  const combinResTargets = resTargets.reduce((a, b) => {
    a = a.concat(b.args);
    return a;
  }, []);
  if ([...new Set(combinResTargets)].length !== combinResTargets.length) {
    throw new Error(`${DEFINE_REACTIVE} args use duplicate key,${combinResTargets}`);
  }
  let finallyScript = scriptSetup.content;
  resTargets.reverse().forEach((it) => {
    if (it.needIdentifier) {
      finallyScript = finallyScript.substring(0, it.source.start) + `
 const ${it.newIdentifier}=` + finallyScript.substring(it.source.start, finallyScript.length);
    }
    finallyScript = finallyScript + it.finallyStr;
  });
  const reg = new RegExp(DEFINE_REACTIVE, "g");
  finallyScript = finallyScript.replace(reg, "reactive");
  if (options.needImport) {
    const identifiers = nodeBody.filter((it) => it.type === "ImportDeclaration").reduce((a, b) => {
      a = a.concat(b.specifiers.map((item) => item.local.name));
      return a;
    }, []);
    log("all imports identifiers", identifiers);
    let resImportStr = "";
    default_imports.forEach((it) => {
      if (!identifiers.includes(it)) {
        if (resImportStr) {
          resImportStr = resImportStr + `,${it}`;
        } else {
          resImportStr = it;
        }
      }
    });
    if (resImportStr) {
      finallyScript = `
 import { ${resImportStr} } from 'vue' 
 ${finallyScript}`;
    }
  }
  const result = ["template", "script", "scriptSetup"].filter((it) => descriptor[it]).map((it) => revertTopTags(descriptor[it], it === "scriptSetup" ? finallyScript : "")).concat(descriptor["styles"].map((it) => revertTopTags(it))).concat(descriptor["customBlocks"].map((it) => revertTopTags(it))).sort((a, b) => +a.offset - +b.offset).map((it) => it.content).join("\n");
  log("transform result:", result);
  return result;
};
function revertTopTags(obj, content) {
  const res = Object.keys(obj.attrs).reduce((a, b) => {
    const str = obj.attrs[b] === true ? ` ${b}` : ` ${b}="${obj.attrs[b]}"`;
    a = a + str;
    return a;
  }, "");
  return {
    content: `<${obj.type}${res}>${content || obj.content}</${obj.type}>`,
    offset: obj.loc.start.offset
  };
}
export {
  DEFINE_REACTIVE,
  defineReactiveVitePlugin as default,
  transformDefineReactiveMacro
};
