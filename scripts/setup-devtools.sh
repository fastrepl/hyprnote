#!/usr/bin/env bash
set -euo pipefail

if ! command -v dprint &> /dev/null; then
  curl -fsSL https://dprint.dev/install.sh | sh
  export PATH="$HOME/.dprint/bin:$PATH"
fi

if ! command -v supabase &> /dev/null; then
  curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz
  sudo mv supabase /usr/local/bin/supabase
fi

if ! command -v stripe &> /dev/null; then
  curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg > /dev/null
  echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee /etc/apt/sources.list.d/stripe.list
  sudo apt update
  sudo apt-get install -y stripe
fi
