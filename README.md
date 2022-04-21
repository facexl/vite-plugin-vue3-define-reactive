# vite-plugin-vue3-define-reactive
a special compiler macros `defineReactive` for `vue3 script-setup`


## without 

```javascript
<template>
    <div>{{a}}</div>
    <div>{{b}}</div>
    <div>{{c}}</div>
</template>
<script setup>
import { ref } from 'vue';
const a = ref(0);
const b = ref(1);
const c = ref(2)

c.value = 3

</script>  

```

## with  
示例1：
```javascript
<template>
    <div>{{a}}</div>
    <div>{{b}}</div>
    <div>{{c}}</div>
</template>
<script setup>
const state = defineReactive({
    a:0,
    b:1,
    c:2
})

state.c = 3 // no .value

</script> 

```  

## without 

```javascript
<template>
    <div>{{a}}</div>
</template>
<script setup>
import { ref } from 'vue'
const a = ref(1)
const b = ref(2)
</script>

```

## with 
示例2：
```javascript
<template>
    <div>{{a}}</div>
</template>
<script setup>
defineReactive({
    a:1,
    b:2
})
</script>

```

#### In fact, your code will transform before vue complie:

### 示例1：

```javascript
    <template>
        <div>{{a}}</div>
        <div>{{b}}</div>
        <div>{{c}}</div>
    </template>
      <script setup>
       import { toRefs,reactive } from 'vue' 
       
              const state = reactive({
                  a:0,
                  b:1,
                  c:2
              })
              
              state.c = 3 // no .value
              
              
       const {a,b,c} = toRefs(state)
      </script>

```

### 示例2：

```javascript
      <template>
              <div>{{a}}</div>
          </template>
      <script setup>
       import { toRefs,reactive } from 'vue' 
       
          
       const auto_identifier__v_5=reactive({
              a:1,
              b:2
          })
          
       const {a,b} = toRefs(auto_identifier__v_5)
      </script>
```

## Usage

```shell

yarn add vite-plugin-vue3-define-reactive 

or 

npm install vite-plugin-vue3-define-reactive

```  

In your `vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import defineReactive from 'vite-plugin-vue3-define-reactive'
export default defineConfig({
  plugins: [
      defineReactive(),
      vue()
  ],
})

```

### type 

Create a new file in your src folder and write this for type hints.

```javascript
declare global {
    const defineReactive:<T extends {
        [key:string]:any
    }>(obj:T)=>T
}
export {}

```

### by the way  

if before `script-setup version` you write vue3 code like this:

```javascript 
import { toRefs,reactive } from 'vue';
<script>
setup(){
    const state = reactive({
        a:1,
        b:2,
        c:3
    })
    state.c = 7
    const handleClick = ()=>{}
    return {
        ...toRefs(state),
        handleClick
    }
}
</script>

```  
this is helpful for refactor you project to `script-setup`:

```javascript 
<script setup>
    const state =defineReactive({
        a:1,
        b:2,
        c:3
    })
    state.c = 7
    const handleClick = ()=>{}
</script>
```

