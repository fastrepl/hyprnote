import { defineRule } from "oxlint";

const rule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce await on Tauri IPC commands to prevent race conditions and freezes",
    },
    fixable: "code",
    messages: {
      missingAwait:
        "Tauri command '{{name}}' must be awaited. Unawaited IPC calls can cause race conditions and freezes.",
    },
  },
  createOnce(context) {
    let tauriCommandImports;

    return {
      before() {
        tauriCommandImports = new Set();
      },

      ImportDeclaration(node) {
        const source = node.source.value;

        const isTauriCommands =
          source.startsWith("@hypr/plugin-") || source.endsWith("/tauri.gen");

        if (isTauriCommands) {
          for (const specifier of node.specifiers) {
            if (
              specifier.type === "ImportSpecifier" &&
              specifier.imported.name === "commands"
            ) {
              tauriCommandImports.add(specifier.local.name);
            }
          }
        }
      },

      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.type === "Identifier" &&
          tauriCommandImports.has(node.callee.object.name)
        ) {
          const methodName = node.callee.property.name;
          const current = node.parent;

          if (current.type === "AwaitExpression") {
            return;
          }

          if (
            current.type === "ReturnStatement" ||
            current.type === "ArrowFunctionExpression"
          ) {
            return;
          }

          if (current.type === "ArrayExpression") {
            return;
          }

          context.report({
            node,
            messageId: "missingAwait",
            data: { name: methodName },
            fix(fixer) {
              if (current.type === "ExpressionStatement") {
                const sourceCode =
                  context.sourceCode || context.getSourceCode();
                const callText = sourceCode.getText(node);
                return fixer.replaceText(node, `await ${callText}`);
              }
              return null;
            },
          });
        }
      },
    };
  },
});

const plugin = {
  meta: {
    name: "hypr",
    version: "1.0.0",
  },
  rules: {
    "await-tauri-commands": rule,
  },
};

export default plugin;
