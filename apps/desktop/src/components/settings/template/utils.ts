import { useCallback } from "react";

import {
  type Template,
  templateSchema,
  type TemplateSection,
  type TemplateStorage,
} from "@hypr/store";

import { Route as SettingsRoute } from "../../../routes/app/settings/_layout";
import * as main from "../../../store/tinybase/main";

export function useTemplateNavigation() {
  const search = SettingsRoute.useSearch();
  const navigate = SettingsRoute.useNavigate();
  const { user_id } = main.UI.useValues(main.STORE_ID);

  const setRow = main.UI.useSetRowCallback(
    "templates",
    (p: {
      id: string;
      user_id: string;
      created_at: string;
      title: string;
      description: string;
      sections: any[];
    }) => p.id,
    (p: {
      id: string;
      user_id: string;
      created_at: string;
      title: string;
      description: string;
      sections: any[];
    }) =>
      ({
        user_id: p.user_id,
        created_at: p.created_at,
        title: p.title,
        description: p.description,
        sections: JSON.stringify(p.sections),
      }) satisfies TemplateStorage,
    [],
    main.STORE_ID,
  );

  const goToList = useCallback(() => {
    navigate({ search: (prev) => ({ ...prev, templateId: undefined }) });
  }, [navigate]);

  const goToEdit = useCallback(
    (id: string) => {
      navigate({ search: (prev) => ({ ...prev, templateId: id }) });
    },
    [navigate],
  );

  const createAndEdit = useCallback(() => {
    if (!user_id) {
      return;
    }

    const newId = crypto.randomUUID();
    const now = new Date().toISOString();

    setRow({
      id: newId,
      user_id,
      created_at: now,
      title: "",
      description: "",
      sections: [],
    });

    navigate({ search: (prev) => ({ ...prev, templateId: newId }) });
  }, [user_id, setRow, navigate]);

  const cloneAndEdit = useCallback(
    (template: {
      title: string;
      description: string;
      sections: TemplateSection[];
    }) => {
      if (!user_id) {
        return;
      }

      const newId = crypto.randomUUID();
      const now = new Date().toISOString();

      setRow({
        id: newId,
        user_id,
        created_at: now,
        title: template.title,
        description: template.description,
        sections: template.sections.map((section) => ({ ...section })),
      });

      navigate({ search: (prev) => ({ ...prev, templateId: newId }) });
    },
    [navigate, setRow, user_id],
  );

  return {
    templateId: search.templateId,
    goToList,
    goToEdit,
    createAndEdit,
    cloneAndEdit,
  };
}

export function normalizeTemplateWithId(id: string, template: unknown) {
  return {
    id,
    ...normalizeTemplatePayload(template),
  };
}

export function normalizeTemplatePayload(template: unknown): Template {
  const record = (
    template && typeof template === "object" ? template : {}
  ) as Record<string, unknown>;

  const base = {
    user_id: typeof record.user_id === "string" ? record.user_id : "",
    created_at: typeof record.created_at === "string" ? record.created_at : "",
    title: typeof record.title === "string" ? record.title : "",
    description:
      typeof record.description === "string" ? record.description : "",
    sections: normalizeSections(record.sections),
  };

  return templateSchema.parse(base);
}

export function filterTemplatesByQuery(
  templates: Array<Template & { id: string }>,
  query: string,
): Array<Template & { id: string }> {
  if (!query) {
    return templates;
  }

  const normalizedQuery = query.toLowerCase();

  return templates.filter((template) => {
    const title = template.title?.toLowerCase() ?? "";
    const description = template.description?.toLowerCase() ?? "";

    return (
      title.includes(normalizedQuery) || description.includes(normalizedQuery)
    );
  });
}

function normalizeSections(source: unknown): TemplateSection[] {
  if (typeof source === "string") {
    try {
      return normalizeSections(JSON.parse(source));
    } catch {
      return [];
    }
  }

  if (!Array.isArray(source)) {
    return [];
  }

  return source.map((section) => normalizeSection(section));
}

function normalizeSection(section: unknown): TemplateSection {
  const record = (
    section && typeof section === "object" ? section : {}
  ) as Record<string, unknown>;

  return {
    title: typeof record.title === "string" ? record.title : "",
    description:
      typeof record.description === "string" ? record.description : "",
  };
}
