import { transformDefineReactiveMacro } from '../index'

describe('transformDefineReactiveMacro', () => {
    test('should expose all params key top level declarations', () => {
      const content = transformDefineReactiveMacro(`
        <script setup>
            const state = defineReactive({
                showApp:false,
                loading:false
            })
        </script>
      `,{
            needImport:true
        })
      expect(content).toMatch('const {showApp,loading} = toRefs(state)')
      expect(content).toMatchSnapshot()
    })
    test('should import missing dependencies', () => {
        const content = transformDefineReactiveMacro(`
          <script setup>
              import { toRefs } from 'vue'
              defineReactive({
                  showApp:false,
                  loading:false
              })
          </script>
        `,{
              needImport:true
          })
        expect(content).toMatch(`import { reactive } from 'vue'`)
        expect(content).toMatchSnapshot()
    })
    test('should auto declare new variable', () => {
        const content = transformDefineReactiveMacro(`
          <script setup>
              defineReactive({
                  showApp:false,
                  loading:false
              })
          </script>
        `,{})
        expect(content).toMatch(`auto_identifier__v_15`)
        expect(content).toMatchSnapshot()
    })
    test('ts', () => {
        const content = transformDefineReactiveMacro(`
        <script setup lang="ts">
        const state = defineReactive({
            a:2 as number
        } as any) as any
        let x,y,z;
        const r = function(){}
        const r2 = (function(){})()
        let a  = 1
        const b = 2
        function c() {}
        class d {}
        defineReactive({
            r:1
        }) as any
    </script>
        `,{
        })
        expect(content).toMatch(`const {a} = toRefs(state)`)
        expect(content).toMatchSnapshot()
    })
})