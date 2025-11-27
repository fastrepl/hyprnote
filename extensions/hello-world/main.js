__hypr_extension.greet = function (name) {
  hypr.log(`Hello, ${name}!`);
  return `Hello, ${name}!`;
};

__hypr_extension.add = function (a, b) {
  const result = a + b;
  hypr.log(`${a} + ${b} = ${result}`);
  return result;
};

__hypr_extension.getInfo = function () {
  return {
    name: "Hello World Extension",
    version: "0.1.0",
    description: "A minimal example extension",
  };
};
