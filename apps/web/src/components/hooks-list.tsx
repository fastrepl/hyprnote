import { MDXContent } from "@content-collections/mdx/react";
import { allHooks } from "content-collections";

export function HooksList() {
  const hooks = allHooks.sort((a, b) => a.name.localeCompare(b.name));

  if (hooks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8 mt-8">
      {hooks.map((hook) => (
        <section key={hook.slug} className="border-t pt-6">
          <h2 id={hook.name} className="scroll-mt-20">
            {hook.name}
          </h2>
          {hook.description && (
            <p className="mt-2 text-neutral-600">{hook.description}</p>
          )}
          {hook.args && hook.args.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Arguments</h3>
              <div className="space-y-2">
                {hook.args.map((arg) => (
                  <div
                    key={arg.name}
                    className="border-l-2 border-neutral-200 pl-4"
                  >
                    <div className="font-mono text-sm">
                      <span className="font-semibold">{arg.name}</span>
                      <span className="text-neutral-500">
                        {" "}
                        : {arg.type_name}
                      </span>
                    </div>
                    {arg.description && (
                      <p className="text-sm text-neutral-600 mt-1">
                        {arg.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4">
            <MDXContent code={hook.mdx} />
          </div>
        </section>
      ))}
    </div>
  );
}
