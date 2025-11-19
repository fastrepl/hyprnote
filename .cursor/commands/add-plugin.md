```bash
npx @tauri-apps/cli plugin new NAME \
--no-example \
--directory ./plugins/NAME
```

- Base on the instruction, decide `NAME`, and run the above command.
- `plugins/analytics` is well maintained plugin, so follow its style & convention. This including removing `rollup.config.js` & `README.md`, and updating `tsconfig.json` & `package.json`.
- If not specified, keep the single `ping` fn in `ext.rs`, and also in `commands.rs`.
- After all code written, binding should be generated. `pnpm -F @hypr/plugin-<NAME> codegen`.
- `Cargo.toml`, `apps/desktop/src-tauri/Cargo.toml`, `apps/desktop/package.json`, and `apps/desktop/src-tauri/capabilities/default.json` should be updated as final step.
