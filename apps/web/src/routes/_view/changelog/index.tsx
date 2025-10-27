import { createFileRoute, Link } from "@tanstack/react-router";

import { allChangelogs, type Changelog } from "content-collections";

export const Route = createFileRoute("/_view/changelog/")({
  component: Component,
});

function Component() {
  return (
    <ul>
      {allChangelogs.map((changelog) => <ChangelogComponent key={changelog._meta.filePath} changelog={changelog} />)}
    </ul>
  );
}

function ChangelogComponent({ changelog }: { changelog: Changelog }) {
  return (
    <li>
      <Link to="/changelog/$slug" params={{ slug: changelog.slug }}>
        {changelog.version}
      </Link>
    </li>
  );
}
