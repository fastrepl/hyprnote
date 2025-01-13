import os
from dotenv import load_dotenv

from lago_python_client.client import Client
from lago_python_client.models import WebhookEndpoint, Plan


def run():
    client = Client(
        api_url=os.getenv("LAGO_API_BASE"), api_key=os.getenv("LAGO_API_KEY")
    )

    client.webhook_endpoints.create(
        WebhookEndpoint(
            webhook_url=os.getenv("SERVER_API_BASE") + "/webhook/lago",
            signature_algo="hmac",
        )
    )

    client.plans.create(
        Plan(
            code="hyprnote-pro",
            name="Hyprnote Pro",
            invoice_display_name="Hyprnote Pro",
            interval="monthly",
            amount_cents=3000,
            amount_currency="USD",
            trial_period=0,
            pay_in_advance=True,
            bill_charges_monthly=True,
        )
    )


if __name__ == "__main__":
    load_dotenv(".env.local")
    run()
