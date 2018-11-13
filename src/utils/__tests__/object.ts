import { sort } from '../object';

describe('utils/object', () => {

  describe('sort', () => {

    it('should return the same object', () => {
      const obj = { c: 3, b: 2, a: 1 };
      const result = sort(obj);
      expect(result).toBe(obj);
      expect(obj).toEqual({ c: 3, b: 2, a: 1 });
    });

    it('should sort the keys', () => {
      const obj = { c: 3, b: 2, a: 1 };
      expect(Object.keys(obj)).toEqual(['c', 'b', 'a']);
      sort(obj);
      expect(Object.keys(obj)).toEqual(['a', 'b', 'c']);
    });

  });

});
