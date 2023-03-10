import { once } from 'native-run/utils/fn'
import { describe, expect, it, vi } from 'vitest'

describe('utils/fn', () => {
  describe('once', () => {
    it('should call function once despite multiple calls', () => {
      const mock = vi.fn()
      const fn = once(mock)
      fn()
      fn()
      expect(mock).toHaveBeenCalledTimes(1)
    })

    it('should call function with original parameters', () => {
      const mock = vi.fn()
      const fn = once(mock)
      fn(5, 'foobar', { foo: 'bar' })
      expect(mock).toHaveBeenCalledTimes(1)
      expect(mock).toHaveBeenCalledWith(5, 'foobar', { foo: 'bar' })
    })

    it('should return the exact same object', () => {
      const expected = {}
      const mock = vi.fn(() => expected)
      const fn = once(mock)
      const r = fn()
      expect(mock).toHaveBeenCalledTimes(1)
      expect(r).toBe(expected)
    })
  })
})
