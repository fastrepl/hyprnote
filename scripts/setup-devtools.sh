#!/usr/bin/env bash
set -euo pipefail

echo "Installing development tools for Devin..."

# Install dprint
# Reference: https://dprint.dev/install/
echo "Installing dprint..."
if ! command -v dprint &> /dev/null; then
  curl -fsSL https://dprint.dev/install.sh | sh
  export PATH="$HOME/.dprint/bin:$PATH"
  echo "dprint installed successfully!"
else
  echo "dprint is already installed"
fi

# Install Supabase CLI
# Reference: https://supabase.com/docs/guides/local-development/cli/getting-started
echo "Installing Supabase CLI..."
if ! command -v supabase &> /dev/null; then
  # Using the official installation script for Linux
  curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz
  sudo mv supabase /usr/local/bin/supabase
  echo "Supabase CLI installed successfully!"
else
  echo "Supabase CLI is already installed"
fi

# Install Stripe CLI
# Reference: https://docs.stripe.com/stripe-cli/install?install-method=apt
echo "Installing Stripe CLI..."
if ! command -v stripe &> /dev/null; then
  # Add Stripe's GPG key and repository
  curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg > /dev/null
  echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee /etc/apt/sources.list.d/stripe.list
  sudo apt update
  sudo apt-get install -y stripe
  echo "Stripe CLI installed successfully!"
else
  echo "Stripe CLI is already installed"
fi

echo "All development tools installed successfully!"
