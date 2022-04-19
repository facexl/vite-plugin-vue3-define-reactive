# vite-plugin-vue3-define-reactive
a special compiler macros `defineReactive`

## Usage

```shell

yarn add vite-plugin-vue3-define-reactive 

or 

npm install vite-plugin-vue3-define-reactive

```  

In your `vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import defineReactive from 'vite-plugin-vue3-define-reactive'
export default defineConfig({
  plugins: [
      defineReactive(),
  ],
})

```
### without 

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

### with  

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
    return {
        ...toRefs(state)
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
</script>
```

Infact,your code will transform before vue complie.

transform like this:

```javascript
<script setup>
import { reactive,toRefs } from 'vue'
const state = reactive({
    a:1,
    b:2,
    c:3
})

state.c = 7

const { a,b,c } = toRefs(state)
</script>

```
