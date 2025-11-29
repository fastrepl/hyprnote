```bash
# REPO="SOMEWHERE" ($HOME/repos/hyprnote inside Devin)
infisical export \
  --env=dev \
  --secret-overriding=false \
  --format=dotenv-export \
  --output-file="$REPO/apps/api/.env" \
  --projectId=0dd35732-265e-41e1-86d5-abeda08e568d
```
