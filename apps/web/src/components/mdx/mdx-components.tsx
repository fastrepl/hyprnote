import { Columns, Info } from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";

import { Accordion, Card, Note, Step, Steps, Tip } from "@hypr/ui/docs";

import { CtaCard } from "@/components/cta-card";
import { Image } from "@/components/image";

import { DeeplinksList } from "../deeplinks-list";
import { HooksList } from "../hooks-list";
import { OpenAPIDocs } from "../openapi-docs";
import { Callout } from "./callout";
import { CodeBlock } from "./code-block";
import { GithubEmbed } from "./github-embed";
import { MDXLink } from "./link";
import { Mermaid } from "./mermaid";
import { Tweet } from "./tweet";

const GLOBAL_HEADER_HEIGHT = 69;

function Table({ className, ...props }: React.ComponentProps<"table">) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const clonedHeaderRef = useRef<HTMLDivElement>(null);
  const [showFixedHeader, setShowFixedHeader] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!tableRef.current || !wrapperRef.current) return;

      const thead = tableRef.current.querySelector("thead");
      if (!thead) return;

      const wrapperRect = wrapperRef.current.getBoundingClientRect();
      const theadRect = thead.getBoundingClientRect();

      const shouldShowFixed =
        theadRect.top < GLOBAL_HEADER_HEIGHT &&
        wrapperRect.bottom > GLOBAL_HEADER_HEIGHT + thead.offsetHeight;

      setShowFixedHeader(shouldShowFixed);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!showFixedHeader || !tableRef.current || !wrapperRef.current) {
      return;
    }

    const handleHorizontalScroll = () => {
      if (!wrapperRef.current || !clonedHeaderRef.current) return;

      const clonedWrapper = clonedHeaderRef.current.querySelector(
        ".cloned-table-wrapper",
      ) as HTMLElement;
      if (clonedWrapper) {
        clonedWrapper.scrollLeft = wrapperRef.current.scrollLeft;
      }
    };

    wrapperRef.current.addEventListener("scroll", handleHorizontalScroll);

    return () => {
      wrapperRef.current?.removeEventListener("scroll", handleHorizontalScroll);
    };
  }, [showFixedHeader]);

  useEffect(() => {
    if (!showFixedHeader || !tableRef.current || !wrapperRef.current) {
      return;
    }

    const thead = tableRef.current.querySelector("thead");
    if (!thead || !clonedHeaderRef.current) return;

    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    const clonedWrapper = clonedHeaderRef.current.querySelector(
      ".cloned-table-wrapper",
    ) as HTMLElement;
    const clonedTable = clonedHeaderRef.current.querySelector(
      "table",
    ) as HTMLTableElement;

    if (!clonedWrapper || !clonedTable) return;

    clonedWrapper.style.width = `${wrapperRect.width}px`;
    clonedWrapper.style.left = `${wrapperRect.left}px`;

    clonedTable.style.width = `${tableRef.current.offsetWidth}px`;

    const originalThs = thead.querySelectorAll("th");
    const clonedThs = clonedTable.querySelectorAll("th");

    originalThs.forEach((th, index) => {
      if (clonedThs[index]) {
        (clonedThs[index] as HTMLElement).style.width = `${th.offsetWidth}px`;
      }
    });
  }, [showFixedHeader]);

  return (
    <>
      <div ref={wrapperRef} className="overflow-x-auto">
        <table
          ref={tableRef}
          {...props}
          className={`whitespace-nowrap ${className ?? ""}`}
        >
          {props.children}
        </table>
      </div>
      {showFixedHeader && tableRef.current && (
        <div
          ref={clonedHeaderRef}
          style={{
            position: "fixed",
            top: `${GLOBAL_HEADER_HEIGHT}px`,
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          <div className="cloned-table-wrapper overflow-x-hidden">
            <table
              className={`whitespace-nowrap ${className ?? ""}`}
              style={{
                tableLayout: "fixed",
              }}
            >
              <thead>
                {(() => {
                  const originalThead =
                    tableRef.current?.querySelector("thead");
                  if (!originalThead) return null;

                  return Array.from(originalThead.querySelectorAll("tr")).map(
                    (tr, rowIndex) => (
                      <tr key={rowIndex}>
                        {Array.from(tr.querySelectorAll("th")).map(
                          (th, cellIndex) => (
                            <th
                              key={cellIndex}
                              className="bg-white dark:bg-gray-950"
                              style={{
                                padding: window
                                  .getComputedStyle(th)
                                  .getPropertyValue("padding"),
                                textAlign: window
                                  .getComputedStyle(th)
                                  .getPropertyValue("text-align") as any,
                                borderBottom: window
                                  .getComputedStyle(th)
                                  .getPropertyValue("border-bottom"),
                              }}
                            >
                              {th.textContent}
                            </th>
                          ),
                        )}
                      </tr>
                    ),
                  );
                })()}
              </thead>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

export type MDXComponents = {
  [key: string]: ComponentType<any>;
};

export const defaultMDXComponents: MDXComponents = {
  a: MDXLink,
  Accordion,
  Card,
  Callout,
  Columns,
  CtaCard,
  DeeplinksList,
  GithubEmbed,
  HooksList,
  Image,
  img: Image,
  Info,
  mermaid: Mermaid,
  Mermaid,
  Note,
  OpenAPIDocs,
  pre: CodeBlock,
  Step,
  Steps,
  table: Table,
  Tip,
  Tweet,
};

export function createMDXComponents(
  customComponents?: Partial<MDXComponents>,
): MDXComponents {
  return {
    ...defaultMDXComponents,
    ...(customComponents || {}),
  } as MDXComponents;
}
