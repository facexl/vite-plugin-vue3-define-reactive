import { DEFINE_REACTIVE } from './index'

interface astParseItem{
    id?:string,
    calleeName:string,
    args:Array<string>,
    type:string,
    source:any
}

export const astParse =  function(nodeBody){
    let res:Array<astParseItem> =  []
    nodeBody.forEach(it=>{
        if(it.type==='VariableDeclaration'){
            res = res.concat(getVariableCallee(it,DEFINE_REACTIVE))
        }
        if(it.type==='ExpressionStatement'){
            const temp = getExpressionStatementCall(it,DEFINE_REACTIVE)
            if(temp){
                res.push(temp)
            }
        }
    })
    return res
}


// type.startsWith('TS') TSAsExpression TSNonNullExpression TSTypeAssertion...
function getVariableCallee(nodeBodyItem,targetCallName){
    let res:Array<astParseItem> =  []
    nodeBodyItem.declarations.forEach(it=>{
        if(it.init){
            const calleeRes = walk(it.init)
            if(calleeRes){
                res.push({
                    id:it.id.name,
                    calleeName:calleeRes.name,
                    args:calleeRes.args,
                    type:'VariableDeclaration',
                    source:nodeBodyItem
                })
            }
        }
    })
    return res
    function walk(obj){
        if(obj.type==='CallExpression'){
            if(obj.callee && obj.callee.name===targetCallName){
                if(!obj.arguments || obj.arguments.length===0){
                    throw new Error(`${targetCallName} must have args`)
                }
                return {
                    name:obj.callee.name,
                    args:getCalleeArgs(obj.arguments)
                }
            }
        }
        if(obj.type.startsWith('TS') && obj.expression){
            return walk(obj.expression)
        }
        if(obj.type==='FunctionExpression'){
            return false
        }
        return false
    }
}

function getCalleeArgs(args){
    return walk(args[0])
    function walk(obj){
        if(obj.type.startsWith('TS')){
            return walk(obj.expression)
        }
        if(obj.type==="ObjectExpression"){
            return obj.properties.map(it=>{
                if(it.type!=='ObjectProperty' || it.key.type!=="Identifier"){
                    throw new Error(`unexpected error of args`)
                }
                return it.key.name
            })
        }
        throw new Error(`${DEFINE_REACTIVE} arg must be ObjectExpression`)
    }
}

function getExpressionStatementCall(nodeBodyItem,targetCallName){
    return walk(nodeBodyItem.expression)
    function walk(obj){
        if(obj.type.startsWith('TS')){
            return walk(obj.expression)
        }
        if(obj.type==="CallExpression"){
            if(obj.callee.name===targetCallName){
                if(!obj.arguments || obj.arguments.length===0){
                    throw new Error(`${targetCallName} must have args`)
                }
                return {
                    calleeName:obj.callee.name,
                    args:getCalleeArgs(obj.arguments),
                    type:'ExpressionStatement',
                    source:nodeBodyItem
                }
            }
        }
        return false
    }
}
