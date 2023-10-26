module.exports = {
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      diagnostics: {
        // warnOnly: true,
      },
      tsconfig: {
        types: [
          "node",
          "jest",
        ],
      },
    },
  },
};
