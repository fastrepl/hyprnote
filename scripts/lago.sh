if [ -z "$1" ]; then
    echo "Error: API key argument is required"
    echo "Usage: $0 <api_key>"
    exit 1
fi

API_KEY="$1"
LAGO_URL="http://localhost:3000"

curl --location --request POST "$LAGO_URL/api/v1/webhook_endpoints" \
  --header "Authorization: Bearer $API_KEY" \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "webhook_endpoint": {
      "webhook_url": "http://localhost:5000/webhook/lago",
      "signature_algo": "hmac"
    }
}'

echo "Make sure to add 'Stripe integration' using Lago frontend if you are targeting production."
