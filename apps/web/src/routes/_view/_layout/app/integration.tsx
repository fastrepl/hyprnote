import Nango from "@nangohq/frontend";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { nangoCreateConnectSession } from "../../../../functions/nango";

export const Route = createFileRoute("/_view/_layout/app/integration")({
  component: Component,
});

const nango = new Nango();

function Component() {
  const getSessionToken = useServerFn(nangoCreateConnectSession);

  const handleConnect = async () => {
    const connect = nango.openConnectUI({
      onEvent: (event) => {
        if (event.type === "close") {
          console.log("Connect UI closed");
        } else if (event.type === "connect") {
          console.log("Connection successful!");
        }
      },
    });

    const { sessionToken } = await getSessionToken({
      data: {
        userId: "user_123",
        userEmail: "user@example.com",
        userName: "User Name",
        organizationId: "org_123",
        allowedIntegrations: ["github", "notion", "slack"],
      },
    });
    connect.setSessionToken(sessionToken);
  };

  return (
    <div>
      <button onClick={handleConnect}>Connect</button>
    </div>
  );
}
