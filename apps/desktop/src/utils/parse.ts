export const extractTextFromHtml = (
  html: string | null | undefined,
): string => {
  if (!html) return "";

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  const brElements = tempDiv.getElementsByTagName("br");
  for (const br of Array.from(brElements)) {
    br.replaceWith("\n");
  }

  const pElements = tempDiv.getElementsByTagName("p");
  for (const p of Array.from(pElements)) {
    p.innerHTML = p.innerHTML + "\n";
  }

  const textContent = tempDiv.textContent || tempDiv.innerText || "";

  return textContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
};
