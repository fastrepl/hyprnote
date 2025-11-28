__hypr_extension.activate = function (context) {
  hypr.log.info(
    `Activating ${context.manifest.name} v${context.manifest.version}`,
  );
  hypr.log.info(`Extension path: ${context.extensionPath}`);
  hypr.log.info(`API version: ${context.manifest.apiVersion}`);
};

__hypr_extension.deactivate = function () {
  hypr.log.info("Deactivating Calendar extension");
};

__hypr_extension.getInfo = function () {
  return {
    name: "Calendar Extension",
    version: "0.1.0",
    description: "Calendar view extension for viewing events and sessions",
  };
};
