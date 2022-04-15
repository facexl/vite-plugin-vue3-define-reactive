

import { parse,babelParse } from 'vue/compiler-sfc'
import type { Plugin } from 'vite'
// import { str } from './testStr'

const fileRegex = /\.vue$/

// Special compiler macros
const DEFINE_REACTIVE = 'defineReactive'

const default_imports = ['toRefs','reactive']

const default_var_name = 'auto_identifier__v_'

interface userOptions{
    debug?:Boolean,
    needImport?:Boolean
}

export default function defineReactiveVitePlugin(userOptions:userOptions):Plugin {
  const options = {
      debug:false,
      needImport:true,
      ...userOptions
  }
  return {
    name: DEFINE_REACTIVE,
    transform(src, id) {
      if (fileRegex.test(id)) {
        return {
          code: compileFileToJS(src,options),
        }
      }
    }
  }
}

// compileFileToJS(str,{
//     needImport:true,
//     debug:true
// })

function compileFileToJS(src:string,options:userOptions):string{

    if(!src.includes(DEFINE_REACTIVE))return

    const log = function(a:any,b?:any){
        options.debug && console.log(...arguments as any)
    }

    const { descriptor } = parse(src)

    log('after vue/compiler-sfc parse:',descriptor)

    let { scriptSetup } = descriptor

    if(!scriptSetup){
        throw new Error(`${DEFINE_REACTIVE} only use in script setup`)
    }

    let content = scriptSetup.content

    const scriptAst = babelParse(content, {
        plugins:[],
        sourceType: 'module'
    }).program

    log('babelParse 转换的 ast',scriptAst)

    const nodeBody = scriptAst.body as any

    const targets = nodeBody.filter(it=>{
        return it.type==='VariableDeclaration' && it.declarations.length===1 && it.declarations[0].type==="VariableDeclarator" && it.declarations[0].init.type==="CallExpression" && it.declarations[0].init.callee.name===DEFINE_REACTIVE||
        it.type==='ExpressionStatement' && it.expression && it.expression.callee.name===DEFINE_REACTIVE
    })

    if(!targets.length){
        log('ast hit nothing')
        return
    }

    const resTargets = targets.map(target=>{
        const needIdentifier = target.type==='ExpressionStatement'
        let targetArguments = [];
        if(needIdentifier){
            targetArguments = target.expression.arguments
        }else{
            targetArguments = target.declarations[0].init.arguments
        }
        if(targetArguments.length!==1){
            throw new Error(`${DEFINE_REACTIVE} only one arg`)
        }
        if(targetArguments[0].type!=="ObjectExpression"){
            throw new Error(`${DEFINE_REACTIVE} arg must be ObjectExpression`)
        }
        const targetArgumentsProperties = targetArguments[0].properties
        if(targetArgumentsProperties.find(it=>it.key.type!=='Identifier')){
            throw new Error(`${DEFINE_REACTIVE} arg's key error`)
        }
        // defineReactive 参数内部 key
        const argumentsKeys = targetArgumentsProperties.map(it=>it.key.name) 
        const newIdentifier = `${default_var_name}${target.start}`
        return {
            needIdentifier,
            newIdentifier,
            target,
            argumentsKeys,
            finallyStr:targetArgumentsProperties.length?`\n const ${JSON.stringify(argumentsKeys).replace(/\[/,'{').replace(/\]/,'}').replace(/\"/g,'')} = toRefs(${needIdentifier?newIdentifier:target.declarations[0].id.name})\n`:''
        }
    })

    log('resTargets',resTargets)

    const combinResTargets = resTargets.reduce((a,b)=>{
        a = a.concat(b.argumentsKeys)
        return a
    },[])

    if([...new Set(combinResTargets)].length!==combinResTargets.length){
        throw new Error(`${DEFINE_REACTIVE} args use duplicate key`)
    }

    // 顶层变量
    // 这个应该不准确  
    const allVariableDeclaration = nodeBody.filter(it=>it.type==='VariableDeclaration').reduce((a,b)=>{
        if(b.declarations[0].id.type==='Identifier'){
            a.push(b.declarations[0].id.name)
        }
        if(b.declarations[0].id.type==='ObjectPattern'){
            a = a.concat(b.declarations[0].id.properties.map(it=>it.value.name))
        }
        return a
    },[])

    // 变量声明检查
    for(let i=0;i<allVariableDeclaration.length;i++){
        if(combinResTargets.includes(allVariableDeclaration[i])){
            throw new Error(`duplicate variable: ${allVariableDeclaration[i]} 、${DEFINE_REACTIVE} : ${allVariableDeclaration[i]}`)
        }
    }

    let finallyScript = scriptSetup.content

    // 倒序为了从后面修改字符串 避免影响到 ast 坐标  
    resTargets.reverse().forEach(it=>{
        if(it.needIdentifier){
            finallyScript = finallyScript.substring(0,it.target.start)+`\n const ${it.newIdentifier}=`+finallyScript.substring(it.target.start,finallyScript.length)
        }
        finallyScript = finallyScript + it.finallyStr
    })

    const reg = new RegExp(DEFINE_REACTIVE,'g')

    finallyScript = finallyScript.replace(reg,'reactive') 

    // 拼接 import 
    if(options.needImport){
        const identifiers = nodeBody.filter(it=>it.type==='ImportDeclaration').reduce((a,b)=>{
            a = a.concat(
                b.specifiers.map(item=>item.local.name)
            )
            return a
        },[])
        log('all imports identifiers',identifiers)
        let resImportStr = ''
        default_imports.forEach(it=>{
            if(!identifiers.includes(it)){
                if(resImportStr){
                    resImportStr = resImportStr + `,${it}`
                }else{
                    resImportStr = it
                }
            }
        })
        if(resImportStr){
            finallyScript = `\n import { ${resImportStr} } from 'vue' \n ${finallyScript}`
        }
    }

    const result = ['template','script','scriptSetup']
                    .filter(it=>descriptor[it])
                    .map(it=>revertTopTags(descriptor[it],it==='scriptSetup'?finallyScript:''))
                    .concat(descriptor['styles'].map(it=>revertTopTags(it)))
                    .sort((a,b)=>(+a.offset) - (+b.offset))
                    .map(it=>it.content)
                    .join('\n')

    log('transform result:',result)

    return result
}

function revertTopTags(
    obj:{
        attrs:{
            [key:string]:string | Boolean
        },
        type:string,
        content:string,
        loc:{
            start:{
                offset:Number
            }
        }
    },
    content?:string
):{
    content:string,
    offset:Number
}{
    const res = Object.keys(obj.attrs).reduce((a,b)=>{
        const str = obj.attrs[b]===true?` ${b}`:` ${b}="${obj.attrs[b]}"`
        a = a + str
        return a
    },'')
    return {
        content:`<${obj.type}${res}>${content || obj.content}</${obj.type}>`,
        offset:obj.loc.start.offset
    }
}
