import { Trans } from "@lingui/react/macro";

export default function Billing() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-2 font-semibold">
          <Trans>Team</Trans>
        </h2>
        <p className="text-sm text-neutral-400">
          Hyprnote is for personal use at the moment.
        </p>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">
          <Trans>Billing</Trans>
        </h2>
        <p className="text-sm text-neutral-400">
          Hyprnote is free to use until the public release.
        </p>
      </div>
    </div>
  );
}
