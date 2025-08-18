import { env } from "./env.js";

// https://keygen.sh/docs/api/licenses/#licenses-actions-validate-key
export const validateKey = async (licenseKey: string) => {
  try {
    const response = await fetch(
      `https://api.keygen.sh/v1/accounts/${env.KEYGEN_ACCOUNT_ID}/licenses/actions/validate-key`,
      {
        method: "POST",
        headers: {
          // https://keygen.sh/docs/api/authentication/#license-authentication
          "Authorization": `License ${licenseKey}`,
        },
        body: JSON.stringify({
          "meta": {
            "key": licenseKey,
          },
        }),
      },
    ).then((res) =>
      // https://keygen.sh/docs/api/licenses/#licenses-object-attrs-status
      res.json() as Promise<
        { data: { attributes: { status: "ACTIVE" | "INACTIVE" | "EXPIRING" | "EXPIRED" | "SUSPENDED" | "BANNED" } } }
      >
    );

    const status = response.data.attributes.status;
    return status === "ACTIVE" || status === "EXPIRING";
  } catch (e) {
    console.log(e);
    return false;
  }
};
