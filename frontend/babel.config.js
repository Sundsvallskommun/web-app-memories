module.exports = function (api) {
  const isJest = api.caller((caller) => caller?.name === 'babel-jest');
  return {
    presets: ['@babel/preset-env', '@babel/preset-react', 'next/babel'],
    plugins:
      isJest ?
        [] // no istanbul for Jest
      : ['istanbul'], // include for Cypress
  };
};
