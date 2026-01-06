import { createFileRoute } from "@tanstack/react-router";
import { allBounties } from "content-collections";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/bounties")({
  component: BountiesPage,
  head: () => ({
    meta: [
      { title: "Bounties - Hyprnote" },
      {
        name: "description",
        content: "Open bounties for contributing to Hyprnote",
      },
    ],
  }),
});

interface GitHubIssue {
  title: string;
  body: string;
  state: string;
  html_url: string;
  labels: Array<{ name: string; color: string }>;
}

function BountiesPage() {
  const [issues, setIssues] = useState<Record<number, GitHubIssue>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchIssues() {
      const issueNumbers = allBounties.map((b) => b.issue);
      const fetchedIssues: Record<number, GitHubIssue> = {};

      await Promise.all(
        issueNumbers.map(async (issueNumber) => {
          try {
            const response = await fetch(
              `https://api.github.com/repos/fastrepl/hyprnote/issues/${issueNumber}`,
            );
            if (response.ok) {
              const data = await response.json();
              fetchedIssues[issueNumber] = data;
            }
          } catch (error) {
            console.error(`Failed to fetch issue ${issueNumber}:`, error);
          }
        }),
      );

      setIssues(fetchedIssues);
      setLoading(false);
    }

    fetchIssues();
  }, []);

  const sortedBounties = [...allBounties].sort((a, b) => b.amount - a.amount);
  const openBounties = sortedBounties.filter((b) => b.status === "open");
  const claimedBounties = sortedBounties.filter((b) => b.status === "claimed");
  const paidBounties = sortedBounties.filter((b) => b.status === "paid");

  const totalOpen = openBounties.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-mono">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">hyprnote bounties</h1>

        <nav className="flex gap-2 text-sm mb-8">
          <a
            href="https://hyprnote.com"
            className="text-neutral-500 hover:text-neutral-900"
          >
            home
          </a>
          <span className="text-neutral-300">-</span>
          <a
            href="https://github.com/fastrepl/hyprnote"
            className="text-neutral-500 hover:text-neutral-900"
          >
            github
          </a>
          <span className="text-neutral-300">-</span>
          <a
            href="https://discord.gg/hyprnote"
            className="text-neutral-500 hover:text-neutral-900"
          >
            discord
          </a>
        </nav>

        <p className="mb-6 text-neutral-600">
          We offer cash bounties for contributions to Hyprnote. Pick an issue,
          submit a PR, and get paid.
        </p>

        <ul className="text-sm text-neutral-600 mb-8 space-y-1">
          <li>* Submit your solution as a PR referencing the issue</li>
          <li>* Multiple submissions are allowed</li>
          <li>* Payment is made after PR is merged</li>
        </ul>

        <p className="text-lg mb-12">
          <span className="text-green-600 font-bold">${totalOpen}</span> in open
          bounties
        </p>

        {openBounties.length > 0 && (
          <BountySection
            title="open bounties"
            bounties={openBounties}
            issues={issues}
            loading={loading}
            status="open"
          />
        )}

        {claimedBounties.length > 0 && (
          <BountySection
            title="claimed bounties"
            bounties={claimedBounties}
            issues={issues}
            loading={loading}
            status="claimed"
          />
        )}

        {paidBounties.length > 0 && (
          <BountySection
            title="paid bounties"
            bounties={paidBounties}
            issues={issues}
            loading={loading}
            status="paid"
          />
        )}
      </div>
    </div>
  );
}

function BountySection({
  title,
  bounties,
  issues,
  loading,
  status,
}: {
  title: string;
  bounties: typeof allBounties;
  issues: Record<number, GitHubIssue>;
  loading: boolean;
  status: "open" | "claimed" | "paid";
}) {
  const statusColors = {
    open: "bg-green-500",
    claimed: "bg-yellow-500",
    paid: "bg-neutral-400",
  };

  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <span
          className={`px-2 py-0.5 text-xs text-white rounded ${statusColors[status]}`}
        >
          {status.toUpperCase()}
        </span>
      </div>

      <div className="border border-neutral-200 rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="text-left px-4 py-2 font-medium">$</th>
              <th className="text-left px-4 py-2 font-medium">issue</th>
              <th className="text-left px-4 py-2 font-medium">title</th>
            </tr>
          </thead>
          <tbody>
            {bounties.map((bounty) => {
              const issue = issues[bounty.issue];
              return (
                <tr
                  key={bounty.slug}
                  className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50"
                >
                  <td className="px-4 py-3 text-green-600 font-bold">
                    ${bounty.amount}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`https://github.com/fastrepl/hyprnote/issues/${bounty.issue}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      #{bounty.issue}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {loading ? (
                      <span className="text-neutral-400">loading...</span>
                    ) : issue ? (
                      <a
                        href={issue.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {issue.title}
                      </a>
                    ) : (
                      <span className="text-neutral-500">{bounty.title}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {bounties.map((bounty) => {
        const issue = issues[bounty.issue];
        if (!issue || loading) return null;

        return (
          <div
            key={bounty.slug}
            className="mt-4 pl-4 border-l-2 border-neutral-200"
          >
            <p className="text-xs text-neutral-500 mb-1">
              #{bounty.issue} - {bounty.title}
            </p>
            <p className="text-sm text-neutral-600 whitespace-pre-wrap line-clamp-3">
              {bounty.content || issue.body?.slice(0, 200)}
              {(bounty.content?.length || 0) > 200 ||
              (issue.body?.length || 0) > 200
                ? "..."
                : ""}
            </p>
          </div>
        );
      })}
    </section>
  );
}
