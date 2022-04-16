declare global {
    const defineReactive:<T extends {
        [key:string]:any
    }>(obj:T)=>T
}
export {}
