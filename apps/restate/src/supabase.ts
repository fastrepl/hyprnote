interface SupabaseEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

function getSupabaseConfig(env: SupabaseEnv): {
  url: string;
  serviceRoleKey: string;
} {
  const url = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("SUPABASE_URL env var is required");
  }
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY env var is required");
  }

  return { url: url.replace(/\/+$/, ""), serviceRoleKey };
}

export async function createSignedUrl(
  env: SupabaseEnv,
  fileId: string,
  expiresInSeconds: number = 3600,
): Promise<string> {
  const { url, serviceRoleKey } = getSupabaseConfig(env);

  const response = await fetch(
    `${url}/storage/v1/object/sign/audio-files/${encodeURIComponent(fileId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create signed URL: ${response.status} ${body}`);
  }

  const data = (await response.json()) as { signedURL: string };

  if (!data.signedURL) {
    throw new Error("Signed URL not returned from Supabase");
  }

  if (data.signedURL.startsWith("http")) {
    return data.signedURL;
  }
  return `${url}/storage/v1${data.signedURL}`;
}

export async function deleteFile(
  env: SupabaseEnv,
  fileId: string,
): Promise<void> {
  const { url, serviceRoleKey } = getSupabaseConfig(env);

  const response = await fetch(
    `${url}/storage/v1/object/audio-files/${encodeURIComponent(fileId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to delete file: ${response.status} ${body}`);
  }
}
