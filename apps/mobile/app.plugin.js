const { withGradleProperties } = require("expo/config-plugins");

module.exports = function withAnarlogAndroidArchitectures(config) {
  return withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) =>
        item.type !== "property" || item.key !== "reactNativeArchitectures",
    );
    // The bundled CloudSync library does not support 32-bit x86.
    config.modResults.push({
      type: "property",
      key: "reactNativeArchitectures",
      value: "arm64-v8a,armeabi-v7a,x86_64",
    });
    return config;
  });
};
