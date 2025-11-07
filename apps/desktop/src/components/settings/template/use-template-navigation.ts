import { useCallback } from "react";
import { Route as SettingsRoute } from "../../../routes/app/settings/_layout";
import * as main from "../../../store/tinybase/main";

export function useTemplateNavigation() {
  const search = SettingsRoute.useSearch();
  const navigate = SettingsRoute.useNavigate();
  const { user_id } = main.UI.useValues(main.STORE_ID);

  const setRow = main.UI.useSetRowCallback(
    "templates",
    (p: { id: string; user_id: string; created_at: string; title: string; description: string; sections: any[] }) =>
      p.id,
    (p: { id: string; user_id: string; created_at: string; title: string; description: string; sections: any[] }) => ({
      user_id: p.user_id,
      created_at: p.created_at,
      title: p.title,
      description: p.description,
      sections: JSON.stringify(p.sections),
    } satisfies main.TemplateStorage),
    [],
    main.STORE_ID,
  );

  const goToList = useCallback(() => {
    navigate({ search: (prev) => ({ ...prev, templateId: undefined }) });
  }, [navigate]);

  const goToEdit = useCallback((id: string) => {
    navigate({ search: (prev) => ({ ...prev, templateId: id }) });
  }, [navigate]);

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
    (template: { title: string; description: string; sections: main.TemplateSection[] }) => {
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
