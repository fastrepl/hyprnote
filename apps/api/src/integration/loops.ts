import { env } from "../env";

interface LoopsContact {
  id: string;
  email: string;
  source?: string;
  firstName?: string;
  lastName?: string;
  userGroup?: string;
  subscribed: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getContactByEmail(
  email: string,
): Promise<LoopsContact | null> {
  if (!env.LOOPS_API_KEY) {
    throw new Error("LOOPS_API_KEY not configured");
  }

  const response = await fetch(
    `https://app.loops.so/api/v1/contacts/find?email=${encodeURIComponent(email)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.LOOPS_API_KEY}`,
      },
    },
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch contact: ${response.statusText}`);
  }

  const contacts = await response.json();
  if (Array.isArray(contacts) && contacts.length > 0) {
    return contacts[0] as LoopsContact;
  }
  return null;
}
