export function extractWebsiteUrl(email?: string | null): string | null {
  if (!email) return null;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urlMatches = email.match(urlRegex);

  if (urlMatches) {
    const personalDomains = [
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "outlook.com",
      "icloud.com",
      "aol.com",
      "protonmail.com",
      "mail.com",
      "zoho.com",
      "yandex.com",
      "gmx.com",
      "tutanota.com",
    ];

    const validUrls = urlMatches.filter(url => {
      return !personalDomains.some(domain => url.includes(domain));
    });

    if (validUrls.length > 0) return validUrls[0];
  }

  const emailRegex = /@([a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/;
  const emailMatch = email.match(emailRegex);

  if (emailMatch) {
    const domain = emailMatch[1];
    const personalDomains = [
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "outlook.com",
      "icloud.com",
      "aol.com",
      "protonmail.com",
      "mail.com",
      "zoho.com",
      "yandex.com",
      "gmx.com",
      "tutanota.com",
    ];

    if (!personalDomains.includes(domain)) {
      return `https://${domain}`;
    }
  }

  return null;
}
