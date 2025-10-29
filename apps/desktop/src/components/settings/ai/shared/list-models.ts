export type ListModelsResult = { models: string[]; ignored: string[] };

export async function listOpenAIModels(baseUrl: string, apiKey: string): Promise<ListModelsResult> {
  if (!baseUrl) {
    return { models: [], ignored: [] };
  }

  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      return { models: [], ignored: [] };
    }

    const { data } = await response.json() as { data: { id: string }[] };

    const models: string[] = [];
    const ignored: string[] = [];

    for (const model of data) {
      const id = model.id.toLowerCase();
      if (
        id.includes("embed")
        || id.includes("tts")
        || id.includes("whisper")
        || id.includes("dall-e")
        || id.includes("audio")
        || id.includes("image")
      ) {
        ignored.push(model.id);
      } else {
        models.push(model.id);
      }
    }

    return { models, ignored };
  } catch (error) {
    return { models: [], ignored: [] };
  }
}

export async function listAnthropicModels(baseUrl: string, apiKey: string): Promise<ListModelsResult> {
  if (!baseUrl) {
    return { models: [], ignored: [] };
  }

  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      return { models: [], ignored: [] };
    }

    const { data } = await response.json() as { data: { id: string }[] };

    const models: string[] = [];
    const ignored: string[] = [];

    for (const model of data) {
      const id = model.id.toLowerCase();
      if (
        id.includes("embed")
        || id.includes("tts")
        || id.includes("whisper")
        || id.includes("dall-e")
        || id.includes("audio")
        || id.includes("image")
      ) {
        ignored.push(model.id);
      } else {
        models.push(model.id);
      }
    }

    return { models, ignored };
  } catch (error) {
    return { models: [], ignored: [] };
  }
}

export async function listOpenRouterModels(baseUrl: string, apiKey: string): Promise<ListModelsResult> {
  if (!baseUrl) {
    return { models: [], ignored: [] };
  }

  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      return { models: [], ignored: [] };
    }

    const { data } = await response.json() as {
      data: {
        id: string;
        supported_parameters?: string[];
        architecture?: {
          input_modalities?: string[];
          output_modalities?: string[];
        };
      }[];
    };

    const models: string[] = [];
    const ignored: string[] = [];

    for (const model of data) {
      const id = model.id.toLowerCase();

      if (["audio", "image", "code", "embed"].some((keyword) => id.includes(keyword))) {
        ignored.push(model.id);
        continue;
      }

      if (
        Array.isArray(model.architecture?.input_modalities)
        && !model.architecture.input_modalities.includes("text")
      ) {
        ignored.push(model.id);
        continue;
      }

      if (!model.supported_parameters) {
        models.push(model.id);
        continue;
      }

      if (["tools", "tool_choice"].every((parameter) => model.supported_parameters?.includes(parameter))) {
        models.push(model.id);
      } else {
        ignored.push(model.id);
      }
    }

    return { models, ignored };
  } catch (error) {
    return { models: [], ignored: [] };
  }
}

export async function listOllamaModels(baseUrl: string, _apiKey: string): Promise<ListModelsResult> {
  if (!baseUrl) {
    return { models: [], ignored: [] };
  }

  try {
    const apiBaseUrl = baseUrl.replace(/\/v1\/?$/, "");

    const [tagsResponse, runningResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/api/tags`),
      fetch(`${apiBaseUrl}/api/ps`),
    ]);

    if (!tagsResponse.ok) {
      return { models: [], ignored: [] };
    }

    const { models: allModels } = await tagsResponse.json() as {
      models: { name: string; digest: string }[];
    };

    const runningModels = new Set<string>();
    if (runningResponse.ok) {
      const { models: running } = await runningResponse.json() as {
        models?: { name: string }[];
      };
      if (running) {
        for (const model of running) {
          runningModels.add(model.name);
        }
      }
    }

    const modelDetailsPromises = allModels.map(async (model) => {
      try {
        const showResponse = await fetch(`${apiBaseUrl}/api/show`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: model.name }),
        });

        if (!showResponse.ok) {
          return { name: model.name, include: true, isRunning: runningModels.has(model.name) };
        }

        const details = await showResponse.json() as {
          capabilities?: string[];
        };

        const hasCompletion = details.capabilities?.includes("completion") ?? true;

        return {
          name: model.name,
          include: hasCompletion,
          isRunning: runningModels.has(model.name),
        };
      } catch {
        return { name: model.name, include: true, isRunning: runningModels.has(model.name) };
      }
    });

    const modelDetails = await Promise.all(modelDetailsPromises);

    const runningModelsList: string[] = [];
    const otherModelsList: string[] = [];
    const ignored: string[] = [];

    for (const detail of modelDetails) {
      if (detail.include) {
        if (detail.isRunning) {
          runningModelsList.push(detail.name);
        } else {
          otherModelsList.push(detail.name);
        }
      } else {
        ignored.push(detail.name);
      }
    }

    return {
      models: [...runningModelsList, ...otherModelsList],
      ignored,
    };
  } catch (error) {
    return { models: [], ignored: [] };
  }
}

export async function listLMStudioModels(baseUrl: string, apiKey: string): Promise<ListModelsResult> {
  if (!baseUrl) {
    return { models: [], ignored: [] };
  }

  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      return { models: [], ignored: [] };
    }

    const { data } = await response.json() as { data: { id: string }[] };

    const models: string[] = [];
    const ignored: string[] = [];

    for (const model of data) {
      const id = model.id.toLowerCase();
      if (
        id.includes("embed")
        || id.includes("tts")
        || id.includes("whisper")
        || id.includes("dall-e")
        || id.includes("audio")
        || id.includes("image")
      ) {
        ignored.push(model.id);
      } else {
        models.push(model.id);
      }
    }

    return { models, ignored };
  } catch (error) {
    return { models: [], ignored: [] };
  }
}

export async function listGenericModels(baseUrl: string, apiKey: string): Promise<ListModelsResult> {
  if (!baseUrl) {
    return { models: [], ignored: [] };
  }

  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      return { models: [], ignored: [] };
    }

    const { data } = await response.json() as { data: { id: string }[] };

    const models: string[] = [];
    const ignored: string[] = [];

    for (const model of data) {
      const id = model.id.toLowerCase();
      if (
        id.includes("embed")
        || id.includes("tts")
        || id.includes("whisper")
        || id.includes("dall-e")
        || id.includes("audio")
        || id.includes("image")
      ) {
        ignored.push(model.id);
      } else {
        models.push(model.id);
      }
    }

    return { models, ignored };
  } catch (error) {
    return { models: [], ignored: [] };
  }
}
