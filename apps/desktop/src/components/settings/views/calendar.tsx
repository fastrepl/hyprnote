import { type CalendarIntegration } from "@/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@hypr/ui/components/ui/accordion";
import {
  AppleCalendarIntegrationDetails,
  CalendarIconWithText,
  CloudCalendarIntegrationDetails,
} from "../components/calendar";

const supportedIntegrations: CalendarIntegration[] = [
  "apple-calendar",
  // "google-calendar",
  // "outlook-calendar",
];

export default function Calendar() {
  return (
    <div className="-mt-3">
      <ul className="flex flex-col px-1">
        {supportedIntegrations.map((type) => (
          <li key={type}>
            <Integration type={type} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Integration({ type }: { type: CalendarIntegration }) {
  return (
    <Accordion type="single" collapsible defaultValue={"apple"}>
      <AccordionItem value="apple">
        <AccordionTrigger>
          <CalendarIconWithText type={type} />
        </AccordionTrigger>
        <AccordionContent className="px-2">
          {type === "apple-calendar"
            ? <AppleCalendarIntegrationDetails />
            : <CloudCalendarIntegrationDetails type={type} />}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
