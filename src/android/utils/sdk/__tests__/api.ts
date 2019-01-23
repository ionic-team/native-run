import { APISchema, findUnsatisfiedPackages } from '../api';

describe('android/utils/sdk/api', () => {

  describe('findUnsatisfiedPackages', () => {

    const FooPackage = {
      path: 'foo',
      location: '/Users/me/Android/sdk/foo',
      name: 'Foo',
      version: '1',
    };

    const BarPackage = {
      path: 'bar',
      location: '/Users/me/Android/sdk/bar',
      name: 'Bar',
      version: '1.0.0',
    };

    const BarPackageInvalidVersion = {
      path: 'bar',
      location: '/Users/me/Android/sdk/bar',
      name: 'Bar',
      version: '2.0.0',
    };

    const FooPackageSchema = { name: 'Foo', path: 'foo', version: '1' };
    const BarPackageSchema = { name: 'Bar', path: 'bar', version: /^1\.\d+\.\d+$/ };

    const schema: APISchema = {
      level: '99999',
      packages: [FooPackageSchema, BarPackageSchema],
      loadPartialAVDSchematic: (() => {}) as any,
    };

    it('should return all package schemas for empty packages', () => {
      const result = findUnsatisfiedPackages([], schema);
      expect(result).toEqual(schema.packages);
    });

    it('should return unsatisfied packages for missing', () => {
      const api = [FooPackage];
      const result = findUnsatisfiedPackages(api, schema);
      expect(result).toEqual([BarPackageSchema]);
    });

    it('should return unsatisfied packages for invalid version', () => {
      const api = [FooPackage, BarPackageInvalidVersion];
      const result = findUnsatisfiedPackages(api, schema);
      expect(result).toEqual([BarPackageSchema]);
    });

    it('should return empty array if everything is satisfied', () => {
      const api = [FooPackage, BarPackage];
      const result = findUnsatisfiedPackages(api, schema);
      expect(result).toEqual([]);
    });

  });

});
