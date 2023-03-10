export function once<T extends (...args: any[]) => any>(fn: T): T {
  let called = false
  let r: any

  const wrapper: any = (...args: any[]): any => {
    if (!called) {
      called = true
      r = fn(...args)
    }

    return r
  }

  return wrapper
}
