import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  { name: "Contact Us", href: "#" },
  { name: "LinkedIn", href: "#" },
  { name: "X", href: "#" },
];

export default function Footer() {
  return (
    <footer className="border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center mb-4 md:mb-0">
            <Image
              src="/icon.svg"
              alt="HyprNote Logo"
              width={32}
              height={32}
              className="mr-2"
            />
            <span className="text-2xl font-racing-sans">HYPRNOTE</span>
          </div>

          <ul className="flex gap-6">
            {footerLinks.map((link) => (
              <li key={link.name}>
                <Link
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 The Lepton Company. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/terms"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
