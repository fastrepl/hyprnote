```bash
# REPO="SOMEWHERE" ($HOME/repos/hyprnote inside Devin)
infisical export \
  --env=dev \
  --secret-overriding=false \
  --format=dotenv-export \
  --output-file="$REPO/apps/restate/.env" \
  --projectId=f7a16b54-2e47-44a0-9eca-df4de6911f43
```
