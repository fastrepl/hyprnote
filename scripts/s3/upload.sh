# CREDENTIALS_FILE="$HOME/hyprnote-r2.toml"
CREDENTIALS_FILE="$HOME/hyprnote-tigris.toml"
# ENDPOINT_URL="https://3db5267cdeb5f79263ede3ec58090fe0.r2.cloudflarestorage.com"
ENDPOINT_URL="https://hyprnote-models.t3.storage.dev/hypo-llm/?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=tid_jMCCPSPwjkhTVegMJMCLU_uamBoBNYeuKYZVnoCiWlVvyDTkRX%2F20250721%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20250721T235903Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=aa0f515992dd70d1ab5a270543b7947020ff9726c8ee5314910c1b9acafc7066"
# BUCKET="hyprnote-cache"
BUCKET="hyprnote-models"

FROM_PATH="$HOME/dev/hyprnote/.cache/"
TO_PATH="v0/"

AWS_REGION=auto s5cmd \
    --log trace \
    --credentials-file "$CREDENTIALS_FILE" \
    --endpoint-url "$ENDPOINT_URL" \
    cp "$FROM_PATH" "s3://$BUCKET/$TO_PATH"
