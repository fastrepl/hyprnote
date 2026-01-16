import { ConfigureProviders } from "./configure";

export function SettingsCalendar() {
  return (
    <div className="space-y-6">
      {/* <Container title="Event Fetching Status">
        <CalendarStatus />
      </Container> */}

      <Container title="Configure Providers">
        <ConfigureProviders />
      </Container>
    </div>
  );
}

function Container({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold font-serif">{title}</h3>
      {children}
    </div>
  );
}
