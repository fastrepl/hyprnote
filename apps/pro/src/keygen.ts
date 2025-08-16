import ky from "ky";

import { env } from "@env";

// https://keygen.sh/docs/api/licenses/#licenses-actions-validate-key
export const validateKey = async (licenseKey: string) => {
  try {
    const response = await ky.get<
      // https://keygen.sh/docs/api/licenses/#licenses-object-attrs-status
      { data: { attributes: { status: "ACTIVE" | "INACTIVE" | "EXPIRING" | "EXPIRED" | "SUSPENDED" | "BANNED" } } }
    >(
      `https://api.keygen.sh/v1/accounts/${env.KEYGEN_ACCOUNT_ID}/licenses/actions/validate-key`,
      {
        method: "POST",
        headers: {
          "Accept": "application/vnd.api+json",
          // https://keygen.sh/docs/api/authentication/#license-authentication
          "Authorization": `License ${licenseKey}`,
        },
        body: JSON.stringify({
          "meta": {
            "key": licenseKey,
          },
        }),
      },
    ).json();

    const status = response.data.attributes.status;
    return status === "ACTIVE" || status === "EXPIRING";
  } catch (e) {
    return false;
  }
};
