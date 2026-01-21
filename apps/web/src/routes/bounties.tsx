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

  useEffect(() => {
    const hideZendesk = () => {
      if (typeof window !== "undefined" && (window as any).zE) {
        try {
          (window as any).zE("messenger", "hide");
        } catch {
          // Ignore errors
        }
      }
    };

    hideZendesk();
    const interval = setInterval(hideZendesk, 100);
    const timeout = setTimeout(() => clearInterval(interval), 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      if (typeof window !== "undefined" && (window as any).zE) {
        try {
          (window as any).zE("messenger", "show");
        } catch {
          // Ignore errors
        }
      }
    };
  }, []);

  const sortedBounties = [...allBounties].sort((a, b) => b.amount - a.amount);
  const openBounties = sortedBounties.filter((b) => b.status === "open");
  const claimedBounties = sortedBounties.filter((b) => b.status === "claimed");
  const paidBounties = sortedBounties.filter((b) => b.status === "paid");

  const totalOpen = openBounties.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="min-h-screen bg-white text-stone-900 font-mono text-sm">
      <div className="max-w-[1024px] mx-auto px-5 py-5">
        <h1 className="text-2xl font-bold mb-1">hyprnote bounties</h1>

        <nav className="flex gap-2 text-sm mb-6">
          <a
            href="https://hyprnote.com"
            className="text-stone-500 hover:text-stone-900 underline"
          >
            home
          </a>
          <span className="text-stone-400">·</span>
          <a
            href="https://github.com/fastrepl/hyprnote"
            className="text-stone-500 hover:text-stone-900 underline"
          >
            github
          </a>
          <span className="text-stone-400">·</span>
          <a
            href="https://discord.gg/hyprnote"
            className="text-stone-500 hover:text-stone-900 underline"
          >
            discord
          </a>
        </nav>

        <p className="mb-4 text-stone-700">
          We offer cash bounties for contributions to Hyprnote. Pick an issue,
          submit a PR, and get paid.
        </p>

        <div className="text-stone-700 mb-6">
          <p>* Submit your solution as a PR referencing the issue</p>
          <p>* Multiple submissions are allowed</p>
          <p>* Payment is made after PR is merged</p>
        </div>

        <p className="mb-8">
          <span className="text-stone-900 font-bold">${totalOpen}</span> in open
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

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-stone-200 rounded ${className || ""}`} />
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
    open: "bg-stone-800",
    claimed: "bg-stone-500",
    paid: "bg-stone-400",
  };

  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <span
          className={`px-2 py-0.5 text-xs text-white rounded ${statusColors[status]}`}
        >
          {status.toUpperCase()}
        </span>
      </div>

      <div className="border border-stone-300 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-300 bg-stone-100">
              <th className="text-left px-4 py-2 font-medium w-20">$</th>
              <th className="text-left px-4 py-2 font-medium w-24">issue</th>
              <th className="text-left px-4 py-2 font-medium">title</th>
            </tr>
          </thead>
          <tbody>
            {bounties.map((bounty) => {
              const issue = issues[bounty.issue];
              return (
                <tr
                  key={bounty.slug}
                  className="border-b border-stone-200 last:border-b-0 hover:bg-stone-50"
                >
                  <td className="px-4 py-3 text-stone-900 font-bold">
                    ${bounty.amount}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`https://github.com/fastrepl/hyprnote/issues/${bounty.issue}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-600 hover:text-stone-900 underline"
                    >
                      #{bounty.issue}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {loading ? (
                      <Skeleton className="h-4 w-64" />
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
                      <span className="text-stone-500">{bounty.title}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {bounties.map((bounty) => {
          const issue = issues[bounty.issue];

          return (
            <div key={bounty.slug} className="pl-4 border-l-2 border-stone-300">
              <p className="text-xs text-stone-500 mb-1">
                #{bounty.issue} - {bounty.title}
              </p>
              {loading ? (
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-3 w-full max-w-lg" />
                  <Skeleton className="h-3 w-3/4 max-w-md" />
                </div>
              ) : (
                <p className="text-sm text-stone-600 whitespace-pre-wrap line-clamp-3">
                  {bounty.content || issue?.body?.slice(0, 200)}
                  {(bounty.content?.length || 0) > 200 ||
                  (issue?.body?.length || 0) > 200
                    ? "..."
                    : ""}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
