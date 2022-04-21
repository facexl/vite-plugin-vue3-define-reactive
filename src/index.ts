

import { parse,babelParse } from 'vue/compiler-sfc'
import { astParse } from './parse'
import type { Plugin } from 'vite'

const fileRegex = /\.vue$/

// Special compiler macros
export const DEFINE_REACTIVE = 'defineReactive'

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
    transform(src, id):any {
      if (fileRegex.test(id)) {
        return {
          code: transformDefineReactiveMacro(src,options),
        }
      }
    }
  }
}


export const transformDefineReactiveMacro = function(src:string,options:userOptions):string | void{

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

    const plugins:Array<string> = []

    if(scriptSetup.attrs.lang==='ts'){
        plugins.push('typescript', 'decorators-legacy')
    }

    const scriptAst = babelParse(content, {
        plugins:plugins as any,
        sourceType: 'module'
    }).program

    log('after babelParse ast',scriptAst)

    const nodeBody = scriptAst.body as any

    const targets = astParse(nodeBody)

    if(!targets.length){
        log('ast hit nothing')
        return
    }

    const resTargets = targets.map(target=>{
        const needIdentifier = target.type==='ExpressionStatement'
        const newIdentifier = `${default_var_name}${target.source.start}`
        return {
            needIdentifier,
            newIdentifier,
            source:target.source,
            args:target.args,
            finallyStr:`\n const ${JSON.stringify(target.args).replace(/\[/,'{').replace(/\]/,'}').replace(/\"/g,'')} = toRefs(${needIdentifier?newIdentifier:target.id})\n`
        }
    }) as any

    log('resTargets',resTargets)

    const combinResTargets:Array<string> = resTargets.reduce((a,b)=>{
        a = a.concat(b.args)
        return a
    },[])

    if([...new Set(combinResTargets)].length!==combinResTargets.length){
        throw new Error(`${DEFINE_REACTIVE} args use duplicate key,${combinResTargets}`)
    }

    let finallyScript = scriptSetup.content

    // 倒序为了从后面修改字符串 避免影响到 ast 坐标  
    resTargets.reverse().forEach(it=>{
        if(it.needIdentifier){
            finallyScript = finallyScript.substring(0,it.source.start)+`\n const ${it.newIdentifier}=`+finallyScript.substring(it.source.start,finallyScript.length)
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
                    .concat(descriptor['customBlocks'].map(it=>revertTopTags(it)))
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

