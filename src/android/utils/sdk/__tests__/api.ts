import type { APISchemaPackage } from '../api';
import { findPackageBySchema, findUnsatisfiedPackages } from '../api';

describe('android/utils/sdk/api', () => {
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
  const BarPackageSchema = {
    name: 'Bar',
    path: 'bar',
    version: /^1\.\d+\.\d+$/,
  };

  describe('findUnsatisfiedPackages', () => {
    const schemaPackages: APISchemaPackage[] = [
      FooPackageSchema,
      BarPackageSchema,
    ];

    it('should return all package schemas for empty packages', () => {
      const result = findUnsatisfiedPackages([], schemaPackages);
      expect(result).toEqual(schemaPackages);
    });

    it('should return unsatisfied packages for missing', () => {
      const api = [FooPackage];
      const result = findUnsatisfiedPackages(api, schemaPackages);
      expect(result).toEqual([BarPackageSchema]);
    });

    it('should return unsatisfied packages for invalid version', () => {
      const api = [FooPackage, BarPackageInvalidVersion];
      const result = findUnsatisfiedPackages(api, schemaPackages);
      expect(result).toEqual([BarPackageSchema]);
    });

    it('should return empty array if everything is satisfied', () => {
      const api = [FooPackage, BarPackage];
      const result = findUnsatisfiedPackages(api, schemaPackages);
      expect(result).toEqual([]);
    });
  });

  describe('findPackageBySchema', () => {
    it('should not find package in empty api', () => {
      const pkg = findPackageBySchema([], FooPackageSchema);
      expect(pkg).toBeUndefined();
    });

    it('should not find package for invalid version', () => {
      const pkg = findPackageBySchema(
        [FooPackage, BarPackageInvalidVersion],
        BarPackageSchema,
      );
      expect(pkg).toBeUndefined();
    });

    it('should find foo package by schema', () => {
      const pkg = findPackageBySchema(
        [FooPackage, BarPackage],
        FooPackageSchema,
      );
      expect(pkg).toBe(FooPackage);
    });
  });
});
