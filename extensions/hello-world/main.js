__hypr_extension.activate = function (context) {
  hypr.log.info(
    `Activating ${context.manifest.name} v${context.manifest.version}`,
  );
  hypr.log.info(`Extension path: ${context.extensionPath}`);
  hypr.log.info(`API version: ${context.manifest.apiVersion}`);
};

__hypr_extension.deactivate = function () {
  hypr.log.info("Deactivating Hello World extension");
};

__hypr_extension.greet = function (name) {
  hypr.log.info(`Hello, ${name}!`);
  return `Hello, ${name}!`;
};

__hypr_extension.add = function (a, b) {
  const result = a + b;
  hypr.log.info(`${a} + ${b} = ${result}`);
  return result;
};

__hypr_extension.getInfo = function () {
  return {
    name: "Hello World Extension",
    version: "0.1.0",
    description: "A minimal example extension demonstrating Pattern A",
  };
};
