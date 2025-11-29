import { MDXContent } from "@content-collections/mdx/react";
import { Icon } from "@iconify-icon/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { allShortcuts, allTemplates } from "content-collections";
import { useCallback, useEffect, useMemo, useState } from "react";

import { cn } from "@hypr/utils";

import { DownloadButton } from "@/components/download-button";
import { SlashSeparator } from "@/components/slash-separator";

type GalleryType = "template" | "shortcut";

type GallerySearch = {
  type?: GalleryType;
  category?: string;
};

export const Route = createFileRoute("/_view/gallery/")({
  component: Component,
  validateSearch: (search: Record<string, unknown>): GallerySearch => {
    return {
      type:
        search.type === "template" || search.type === "shortcut"
          ? search.type
          : undefined,
      category:
        typeof search.category === "string" ? search.category : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Templates & Shortcuts Gallery - Hyprnote" },
      {
        name: "description",
        content:
          "Discover our library of AI meeting templates and shortcuts. Get structured summaries, extract action items, and more with Hyprnote's AI-powered tools.",
      },
      {
        property: "og:title",
        content: "Templates & Shortcuts Gallery - Hyprnote",
      },
      {
        property: "og:description",
        content:
          "Browse our collection of AI meeting templates and shortcuts. From engineering standups to sales discovery calls, find the perfect tool for your workflow.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/gallery" },
    ],
  }),
});

type GalleryItem =
  | { type: "template"; item: (typeof allTemplates)[0] }
  | { type: "shortcut"; item: (typeof allShortcuts)[0] };

function Component() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  const selectedType = search.type || null;
  const selectedCategory = search.category || null;

  const setSelectedType = (type: GalleryType | null) => {
    navigate({
      search: {
        type: type || undefined,
        category: selectedCategory || undefined,
      },
      resetScroll: false,
    });
  };

  const setSelectedCategory = (category: string | null) => {
    navigate({
      search: {
        type: selectedType || undefined,
        category: category || undefined,
      },
      resetScroll: false,
    });
  };

  const handleItemClick = (item: GalleryItem) => {
    setSelectedItem(item);
    window.history.pushState(
      {},
      "",
      `/gallery/${item.type}/${item.type === "template" ? item.item.slug : item.item.slug}`,
    );
  };

  const handleModalClose = useCallback(() => {
    setSelectedItem(null);
    const params = new URLSearchParams();
    if (selectedType) params.set("type", selectedType);
    if (selectedCategory) params.set("category", selectedCategory);
    const queryString = params.toString();
    window.history.pushState(
      {},
      "",
      `/gallery${queryString ? `?${queryString}` : ""}`,
    );
  }, [selectedType, selectedCategory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedItem) {
        handleModalClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItem, handleModalClose]);

  useEffect(() => {
    if (selectedItem) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedItem]);

  const allItems: GalleryItem[] = useMemo(() => {
    const templates: GalleryItem[] = allTemplates.map((t) => ({
      type: "template" as const,
      item: t,
    }));
    const shortcuts: GalleryItem[] = allShortcuts.map((s) => ({
      type: "shortcut" as const,
      item: s,
    }));
    return [...templates, ...shortcuts];
  }, []);

  const itemsByCategory = useMemo(() => {
    return allItems.reduce(
      (acc, item) => {
        const category = item.item.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      },
      {} as Record<string, GalleryItem[]>,
    );
  }, [allItems]);

  const categories = Object.keys(itemsByCategory).sort();

  const filteredItems = useMemo(() => {
    let items = allItems;

    if (selectedType) {
      items = items.filter((i) => i.type === selectedType);
    }

    if (selectedCategory) {
      items = items.filter((i) => i.item.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.item.title.toLowerCase().includes(query) ||
          i.item.description.toLowerCase().includes(query) ||
          i.item.category.toLowerCase().includes(query),
      );
    }

    return items;
  }, [allItems, searchQuery, selectedType, selectedCategory]);

  const filteredCategories = useMemo(() => {
    if (!selectedType) return categories;
    const items = allItems.filter((i) => i.type === selectedType);
    const cats = new Set(items.map((i) => i.item.category));
    return Array.from(cats).sort();
  }, [allItems, selectedType, categories]);

  const filteredItemsByCategory = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => {
        const category = item.item.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      },
      {} as Record<string, GalleryItem[]>,
    );
  }, [filteredItems]);

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <ContributeBanner />
        <HeroSection
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
        />
        <QuoteSection />
        <MobileCategoriesSection
          categories={filteredCategories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
        <GallerySection
          categories={filteredCategories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          itemsByCategory={filteredItemsByCategory}
          filteredItems={filteredItems}
          onItemClick={handleItemClick}
        />
        <SlashSeparator />
        <CTASection />
      </div>

      {selectedItem && (
        <ItemModal item={selectedItem} onClose={handleModalClose} />
      )}
    </div>
  );
}

function ContributeBanner() {
  return (
    <a
      href="https://github.com/fastrepl/hyprnote/tree/main/apps/web/content"
      target="_blank"
      rel="noopener noreferrer"
      className={cn([
        "group flex items-center justify-center gap-2 text-center cursor-pointer",
        "bg-stone-50/70 border-b border-stone-100 hover:bg-stone-100/70",
        "py-3 px-4",
        "font-serif text-sm text-stone-700",
        "transition-colors",
      ])}
    >
      <Icon icon="mdi:github" className="text-base" />
      <span>
        <strong>Community-driven:</strong> Have an idea?{" "}
        <span className="group-hover:underline group-hover:decoration-dotted group-hover:underline-offset-2">
          Contribute on GitHub
        </span>
      </span>
    </a>
  );
}

function HeroSection({
  searchQuery,
  setSearchQuery,
  selectedType,
  setSelectedType,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedType: GalleryType | null;
  setSelectedType: (type: GalleryType | null) => void;
}) {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <section className="flex flex-col items-center text-center gap-8 py-24 px-4 laptop:px-0">
        <div className="space-y-6 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600">
            Gallery
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600">
            Templates are AI instructions for summarizing meetings. Shortcuts
            are quick commands for the AI chat assistant. Browse and discover
            tools for your workflow.
          </p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-stone-100 rounded-full">
          <button
            onClick={() => setSelectedType(null)}
            className={cn([
              "px-4 py-2 text-sm font-medium rounded-full transition-colors cursor-pointer",
              selectedType === null
                ? "bg-white text-stone-800 shadow-sm"
                : "text-stone-600 hover:text-stone-800",
            ])}
          >
            All
          </button>
          <button
            onClick={() => setSelectedType("template")}
            className={cn([
              "px-4 py-2 text-sm font-medium rounded-full transition-colors cursor-pointer",
              selectedType === "template"
                ? "bg-white text-stone-800 shadow-sm"
                : "text-stone-600 hover:text-stone-800",
            ])}
          >
            Templates
          </button>
          <button
            onClick={() => setSelectedType("shortcut")}
            className={cn([
              "px-4 py-2 text-sm font-medium rounded-full transition-colors cursor-pointer",
              selectedType === "shortcut"
                ? "bg-white text-stone-800 shadow-sm"
                : "text-stone-600 hover:text-stone-800",
            ])}
          >
            Shortcuts
          </button>
        </div>

        <div className="w-full max-w-xs">
          <div className="relative flex items-center border-2 border-neutral-200 focus-within:border-stone-500 rounded-full overflow-hidden transition-all duration-200">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 text-sm outline-none bg-white text-center placeholder:text-center"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function QuoteSection() {
  return (
    <div className="py-4 px-4 text-center border-y border-neutral-100 bg-white bg-[linear-gradient(to_right,#f5f5f5_1px,transparent_1px),linear-gradient(to_bottom,#f5f5f5_1px,transparent_1px)] bg-size-[24px_24px] bg-position-[12px_12px,12px_12px]">
      <p className="text-base text-stone-600 font-serif italic">
        "Curated by Hyprnote and the community"
      </p>
    </div>
  );
}

function MobileCategoriesSection({
  categories,
  selectedCategory,
  setSelectedCategory,
}: {
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
}) {
  return (
    <div className="lg:hidden border-b border-neutral-100 bg-stone-50">
      <div className="flex overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn([
            "px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-r border-neutral-100 cursor-pointer",
            selectedCategory === null
              ? "bg-stone-600 text-white"
              : "text-stone-600 hover:bg-stone-100",
          ])}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={cn([
              "px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-r border-neutral-100 last:border-r-0 cursor-pointer",
              selectedCategory === category
                ? "bg-stone-600 text-white"
                : "text-stone-600 hover:bg-stone-100",
            ])}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}

function GallerySection({
  categories,
  selectedCategory,
  setSelectedCategory,
  itemsByCategory,
  filteredItems,
  onItemClick,
}: {
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  itemsByCategory: Record<string, GalleryItem[]>;
  filteredItems: GalleryItem[];
  onItemClick: (item: GalleryItem) => void;
}) {
  return (
    <div className="px-6 pt-8 pb-12 lg:pt-12 lg:pb-20">
      <div className="flex gap-8">
        <DesktopSidebar
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          itemsByCategory={itemsByCategory}
          totalCount={filteredItems.length}
        />
        <GalleryGrid filteredItems={filteredItems} onItemClick={onItemClick} />
      </div>
    </div>
  );
}

function DesktopSidebar({
  categories,
  selectedCategory,
  setSelectedCategory,
  itemsByCategory,
  totalCount,
}: {
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  itemsByCategory: Record<string, GalleryItem[]>;
  totalCount: number;
}) {
  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-[85px]">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">
          Categories
        </h3>
        <nav className="space-y-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn([
              "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
              selectedCategory === null
                ? "bg-stone-100 text-stone-800"
                : "text-stone-600 hover:bg-stone-50",
            ])}
          >
            All
            <span className="ml-2 text-xs text-neutral-400">
              ({totalCount})
            </span>
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn([
                "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                selectedCategory === category
                  ? "bg-stone-100 text-stone-800"
                  : "text-stone-600 hover:bg-stone-50",
              ])}
            >
              {category}
              <span className="ml-2 text-xs text-neutral-400">
                ({itemsByCategory[category]?.length || 0})
              </span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function GalleryGrid({
  filteredItems,
  onItemClick,
}: {
  filteredItems: GalleryItem[];
  onItemClick: (item: GalleryItem) => void;
}) {
  if (filteredItems.length === 0) {
    return (
      <section className="flex-1 min-w-0">
        <div className="text-center py-12">
          <Icon
            icon="mdi:file-search"
            className="text-6xl text-neutral-300 mb-4 mx-auto"
          />
          <p className="text-neutral-600">
            No items found matching your search.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 min-w-0">
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <ItemCard
            key={`${item.type}-${item.item.slug}`}
            item={item}
            onClick={() => onItemClick(item)}
          />
        ))}
        <ContributeCard />
      </div>
    </section>
  );
}

function ItemCard({
  item,
  onClick,
}: {
  item: GalleryItem;
  onClick: () => void;
}) {
  const isTemplate = item.type === "template";

  return (
    <button
      onClick={onClick}
      className="group p-4 border border-neutral-200 rounded-sm bg-white hover:shadow-md hover:border-neutral-300 transition-all text-left cursor-pointer flex flex-col items-start"
    >
      <div className="mb-4 w-full">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={cn([
              "text-xs px-2 py-0.5 rounded-full font-medium",
              isTemplate
                ? "bg-blue-50 text-blue-600"
                : "bg-purple-50 text-purple-600",
            ])}
          >
            {isTemplate ? "Template" : "Shortcut"}
          </span>
          <span className="text-xs text-neutral-400">{item.item.category}</span>
        </div>
        <h3 className="font-serif text-lg text-stone-600 mb-1 group-hover:text-stone-800 transition-colors">
          {item.item.title}
        </h3>
        <p className="text-sm text-neutral-600 line-clamp-2">
          {item.item.description}
        </p>
      </div>
      {isTemplate && "targets" in item.item && (
        <div className="pt-4 border-t border-neutral-100 w-full">
          <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">
            For
          </div>
          <div className="flex flex-wrap gap-2">
            {item.item.targets.slice(0, 3).map((target) => (
              <span
                key={target}
                className="text-xs px-2 py-1 bg-stone-50 text-stone-600 rounded"
              >
                {target}
              </span>
            ))}
            {item.item.targets.length > 3 && (
              <span className="text-xs px-2 py-1 text-neutral-500">
                +{item.item.targets.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </button>
  );
}

function ContributeCard() {
  return (
    <div className="p-4 border border-dashed border-neutral-300 rounded-sm bg-stone-50/50 flex flex-col items-center justify-center text-center">
      <h3 className="font-serif text-lg text-stone-600 mb-2">Contribute</h3>
      <p className="text-sm text-neutral-500 mb-4">
        Have an idea? Submit a PR and help the community.
      </p>
      <a
        href="https://github.com/fastrepl/hyprnote/tree/main/apps/web/content"
        target="_blank"
        rel="noopener noreferrer"
        className={cn([
          "group px-4 h-10 inline-flex items-center justify-center gap-2 w-fit",
          "bg-linear-to-t from-neutral-800 to-neutral-700 text-white rounded-full",
          "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
          "transition-all cursor-pointer text-sm",
        ])}
      >
        <Icon icon="mdi:github" className="text-base" />
        Open on GitHub
      </a>
    </div>
  );
}

function CTASection() {
  return (
    <section className="py-16 px-6 text-center">
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-600">
          Ready to transform your meetings?
        </h2>
        <p className="text-lg text-neutral-600">
          Download Hyprnote and start using these templates and shortcuts to
          capture perfect meeting notes with AI.
        </p>
        <div className="flex flex-col items-center gap-4 pt-4">
          <DownloadButton />
          <p className="text-sm text-neutral-500">
            Free to use. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
}

function ItemModal({
  item,
  onClose,
}: {
  item: GalleryItem;
  onClose: () => void;
}) {
  const isTemplate = item.type === "template";

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-4 sm:inset-8 lg:inset-16 flex items-start justify-center overflow-y-auto">
        <div
          className={cn([
            "relative w-full max-w-2xl my-8",
            "bg-[url('/api/images/texture/white-leather.png')]",
            "rounded-sm shadow-2xl",
          ])}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={cn([
              "absolute inset-0 rounded-sm",
              "bg-[url('/api/images/texture/paper.png')] opacity-30",
            ])}
          />
          <div className="relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-stone-600 hover:text-stone-800 transition-colors cursor-pointer z-10"
            >
              <Icon icon="mdi:close" className="text-lg" />
            </button>

            <div className="p-6 sm:p-8">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={cn([
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    isTemplate
                      ? "bg-blue-50 text-blue-600"
                      : "bg-purple-50 text-purple-600",
                  ])}
                >
                  {isTemplate ? "Template" : "Shortcut"}
                </span>
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                  {item.item.category}
                </span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl text-stone-700 mb-3">
                {item.item.title}
              </h2>
              <p className="text-neutral-600 mb-4">{item.item.description}</p>

              {isTemplate && "targets" in item.item && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {item.item.targets.map((target) => (
                    <span
                      key={target}
                      className="text-xs px-2 py-1 bg-white/80 text-stone-600 rounded border border-stone-200/50"
                    >
                      {target}
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-6">
                {isTemplate && "sections" in item.item && (
                  <div>
                    <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wider mb-3">
                      Template Sections
                    </h3>
                    <div className="space-y-3">
                      {item.item.sections.map((section, index) => (
                        <div
                          key={section.title}
                          className="p-3 rounded-lg bg-white/80 border border-stone-200/50"
                        >
                          <div className="flex items-center gap-3 mb-1">
                            <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-600 text-xs font-medium flex items-center justify-center">
                              {index + 1}
                            </span>
                            <h4 className="font-medium text-stone-700 text-sm">
                              {section.title}
                            </h4>
                          </div>
                          <p className="text-xs text-neutral-600 ml-8">
                            {section.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="prose prose-stone prose-sm prose-headings:font-serif prose-headings:font-semibold prose-h2:text-base prose-h2:mt-6 prose-h2:mb-3 prose-p:text-neutral-600 prose-p:text-sm max-w-none">
                  <MDXContent code={item.item.mdx} />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-stone-200/50">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <DownloadButton />
                  <p className="text-sm text-neutral-500 text-center sm:text-left">
                    Download Hyprnote to use this{" "}
                    {isTemplate ? "template" : "shortcut"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
