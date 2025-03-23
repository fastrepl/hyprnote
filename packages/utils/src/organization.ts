export function extractWebsiteUrl(description?: string | null): string | null {
  if (!description) return null;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = description.match(urlRegex);

  if (!matches) return null;

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

  const validUrls = matches.filter(url => {
    return !personalDomains.some(domain => url.includes(domain));
  });

  return validUrls.length > 0 ? validUrls[0] : null;
}
