import { Link } from "@tanstack/react-router";

export function MDXLink({
  href,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (!href) {
    return <span {...props}>{children}</span>;
  }

  const isHyprnoteUrl = href.startsWith("https://hyprnote.com");
  const isInternalPath = href.startsWith("/") || href.startsWith(".");
  const isAnchor = href.startsWith("#");

  if (isHyprnoteUrl) {
    const relativePath = href.replace("https://hyprnote.com", "") || "/";
    return (
      <Link to={relativePath} {...props}>
        {children}
      </Link>
    );
  }

  if (isAnchor) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }

  if (isInternalPath) {
    return (
      <Link to={href} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}
