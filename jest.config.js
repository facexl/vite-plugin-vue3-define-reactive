module.exports = {
    testEnvironment: 'jsdom',
    preset: 'ts-jest',
    globals: {
        'ts-jest': {
          tsconfig: {
            target: 'esnext',
            sourceMap: true
          }
        }
    },
}