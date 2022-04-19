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
    })
})