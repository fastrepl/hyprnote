import { Trans } from "@lingui/react/macro";
import { useEffect } from "react";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@hypr/ui/components/ui/form";
import { Input } from "@hypr/ui/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { cn } from "@hypr/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import useDebouncedCallback from "beautiful-react-hooks/useDebouncedCallback";
import { useState } from "react";
import { SharedCustomEndpointProps } from "./shared";

const openaiModels = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4.1-nano",
  "gpt-4.1",
  "chatgpt-4o-latest",
];

const geminiModels = [
  "gemini-2.5-pro",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
];

const openrouterModels = [
  "x-ai/grok-4",
  "openai/gpt-4o-mini",
  "openai/gpt-4o",
  "openai/gpt-4.1",
  "openai/gpt-4.1-nano",
  "openai/chatgpt-4o-latest",
  "anthropic/claude-sonnet-4",
  "moonshotai/kimi-k2",
  "mistralai/mistral-small-3.2-24b-instruct",
];

export function LLMCustomView({
  customLLMEnabled,
  selectedLLMModel,
  setSelectedLLMModel,
  setCustomLLMEnabledMutation,
  configureCustomEndpoint,
  openAccordion,
  setOpenAccordion,
  customLLMConnection,
  getCustomLLMModel,
  openaiForm,
  geminiForm,
  openrouterForm,
  customForm,
  isLocalEndpoint,
}: SharedCustomEndpointProps) {
  // Watch forms and submit when complete and valid
  useEffect(() => {
    const subscription = openaiForm.watch((values) => {
      // Manual validation: OpenAI key starts with "sk-" and model is selected
      if (values.api_key && values.api_key.startsWith("sk-") && values.model) {
        configureCustomEndpoint({
          provider: "openai",
          api_base: "", // Will be auto-set
          api_key: values.api_key,
          model: values.model,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [openaiForm, configureCustomEndpoint]);

  useEffect(() => {
    const subscription = geminiForm.watch((values) => {
      // Manual validation: Gemini key starts with "AIza" and model is selected
      if (values.api_key && values.api_key.startsWith("AIza") && values.model) {
        configureCustomEndpoint({
          provider: "gemini",
          api_base: "", // Will be auto-set
          api_key: values.api_key,
          model: values.model,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [geminiForm, configureCustomEndpoint]);

  useEffect(() => {
    const subscription = openrouterForm.watch((values) => {
      // Manual validation: OpenRouter key starts with "sk-" and model is selected
      if (values.api_key && values.api_key.startsWith("sk-") && values.model) {
        configureCustomEndpoint({
          provider: "openrouter",
          api_base: "", // Will be auto-set
          api_key: values.api_key,
          model: values.model,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [openrouterForm, configureCustomEndpoint]);

  useEffect(() => {
    const subscription = customForm.watch((values) => {
      // Manual validation: URL and model are present
      if (values.api_base && values.model) {
        try {
          // Basic URL validation
          new URL(values.api_base);
          configureCustomEndpoint({
            provider: "others",
            api_base: values.api_base,
            api_key: values.api_key,
            model: values.model,
          });
        } catch {
          // invalid URL
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [customForm, configureCustomEndpoint]);

  const handleAccordionClick = (provider: "openai" | "gemini" | "openrouter" | "others") => {
    if (!customLLMEnabled.data) {
      setCustomLLMEnabledMutation.mutate(true);
      setOpenAccordion(provider);
      return;
    }

    // Don't allow deselecting - only allow switching between providers
    // If clicking on the same provider, keep it selected
    if (openAccordion === provider) {
      return; // Do nothing, keep current selection
    }

    // Switch to the new provider
    setOpenAccordion(provider);

    // Enable custom LLM and clear local model selection
    setCustomLLMEnabledMutation.mutate(true);
    setSelectedLLMModel("");
  };

  // temporary fix for fetching models smoothly
  const [debouncedApiBase, setDebouncedApiBase] = useState("");
  const [debouncedApiKey, setDebouncedApiKey] = useState("");

  const updateDebouncedValues = useDebouncedCallback(
    (apiBase: string, apiKey: string) => {
      setDebouncedApiBase(apiBase);
      setDebouncedApiKey(apiKey);
    },
    [],
    2000,
  );

  // Watch for form changes
  useEffect(() => {
    const apiBase = customForm.watch("api_base");
    const apiKey = customForm.watch("api_key");

    updateDebouncedValues(apiBase || "", apiKey || "");
  }, [customForm.watch("api_base"), customForm.watch("api_key"), updateDebouncedValues]);

  const othersModels = useQuery({
    queryKey: ["others-direct-models", debouncedApiBase, debouncedApiKey?.slice(0, 8)],
    queryFn: async (): Promise<string[]> => {
      const apiBase = debouncedApiBase;
      const apiKey = debouncedApiKey;

      const url = new URL(apiBase);
      url.pathname += url.pathname.endsWith("/") ? "models" : "/models";

      console.log("onquery");
      console.log(url.toString());

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (apiKey && apiKey.trim().length > 0) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const response = await tauriFetch(url.toString(), {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.data || !Array.isArray(data.data)) {
        throw new Error("Invalid response format");
      }

      const models = data.data
        .map((model: any) => model.id)
        .filter((id: string) => {
          const excludeKeywords = ["dall-e", "codex", "whisper"];
          return !excludeKeywords.some(keyword => id.includes(keyword));
        });

      return models;
    },
    enabled: (() => {
      const isLocal = debouncedApiBase?.includes("localhost") || debouncedApiBase?.includes("127.0.0.1");

      try {
        return Boolean(debouncedApiBase && new URL(debouncedApiBase) && (isLocal || debouncedApiKey));
      } catch {
        return false;
      }
    })(),
    retry: 1,
    refetchInterval: false,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">
          <Trans>Custom Endpoints</Trans>
        </h2>
      </div>

      <div className="max-w-2xl space-y-4">
        {/* OpenAI Accordion */}
        <div
          className={cn(
            "border rounded-lg transition-all duration-150 ease-in-out cursor-pointer",
            openAccordion === "openai" && customLLMEnabled.data
              ? "border-blue-500 ring-2 ring-blue-500 bg-blue-50"
              : "border-neutral-200 bg-white hover:border-neutral-300",
            !customLLMEnabled.data && "opacity-60",
          )}
        >
          <div
            className="p-4"
            onClick={() => handleAccordionClick("openai")}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M20.5624 10.1875C20.8124 9.5 20.8749 8.8125 20.8124 8.125C20.7499 7.4375 20.4999 6.75 20.1874 6.125C19.6249 5.1875 18.8124 4.4375 17.8749 4C16.8749 3.5625 15.8124 3.4375 14.7499 3.6875C14.2499 3.1875 13.6874 2.75 13.0624 2.4375C12.4374 2.125 11.6874 2 10.9999 2C9.9374 2 8.8749 2.3125 7.9999 2.9375C7.1249 3.5625 6.4999 4.4375 6.1874 5.4375C5.4374 5.625 4.8124 5.9375 4.1874 6.3125C3.6249 6.75 3.1874 7.3125 2.8124 7.875C2.24991 8.8125 2.06241 9.875 2.18741 10.9375C2.31241 12 2.7499 13 3.4374 13.8125C3.1874 14.5 3.1249 15.1875 3.1874 15.875C3.2499 16.5625 3.4999 17.25 3.8124 17.875C4.3749 18.8125 5.1874 19.5625 6.1249 20C7.1249 20.4375 8.1874 20.5625 9.2499 20.3125C9.7499 20.8125 10.3124 21.25 10.9374 21.5625C11.5624 21.875 12.3124 22 12.9999 22C14.0624 22 15.1249 21.6875 15.9999 21.0625C16.8749 20.4375 17.4999 19.5625 17.8124 18.5625C18.4999 18.4375 19.1874 18.125 19.7499 17.6875C20.3124 17.25 20.8124 16.75 21.1249 16.125C21.6874 15.1875 21.8749 14.125 21.7499 13.0625C21.6249 12 21.2499 11 20.5624 10.1875ZM13.0624 20.6875C12.0624 20.6875 11.3124 20.375 10.6249 19.8125C10.6249 19.8125 10.6874 19.75 10.7499 19.75L14.7499 17.4375C14.8749 17.375 14.9374 17.3125 14.9999 17.1875C15.0624 17.0625 15.0624 17 15.0624 16.875V11.25L16.7499 12.25V16.875C16.8124 19.0625 15.0624 20.6875 13.0624 20.6875ZM4.9999 17.25C4.5624 16.5 4.3749 15.625 4.5624 14.75C4.5624 14.75 4.6249 14.8125 4.6874 14.8125L8.6874 17.125C8.8124 17.1875 8.8749 17.1875 8.9999 17.1875C9.1249 17.1875 9.2499 17.1875 9.3124 17.125L14.1874 14.3125V16.25L10.1249 18.625C9.2499 19.125 8.2499 19.25 7.3124 19C6.3124 18.75 5.4999 18.125 4.9999 17.25ZM3.9374 8.5625C4.3749 7.8125 5.0624 7.25 5.8749 6.9375V7.0625V11.6875C5.8749 11.8125 5.8749 11.9375 5.9374 12C5.9999 12.125 6.0624 12.1875 6.1874 12.25L11.0624 15.0625L9.3749 16.0625L5.3749 13.75C4.4999 13.25 3.8749 12.4375 3.6249 11.5C3.3749 10.5625 3.4374 9.4375 3.9374 8.5625ZM17.7499 11.75L12.8749 8.9375L14.5624 7.9375L18.5624 10.25C19.1874 10.625 19.6874 11.125 19.9999 11.75C20.3124 12.375 20.4999 13.0625 20.4374 13.8125C20.3749 14.5 20.1249 15.1875 19.6874 15.75C19.2499 16.3125 18.6874 16.75 17.9999 17V12.25C17.9999 12.125 17.9999 12 17.9374 11.9375C17.9374 11.9375 17.8749 11.8125 17.7499 11.75ZM19.4374 9.25C19.4374 9.25 19.3749 9.1875 19.3124 9.1875L15.3124 6.875C15.1874 6.8125 15.1249 6.8125 14.9999 6.8125C14.8749 6.8125 14.7499 6.8125 14.6874 6.875L9.8124 9.6875V7.75L13.8749 5.375C14.4999 5 15.1874 4.875 15.9374 4.875C16.6249 4.875 17.3124 5.125 17.9374 5.5625C18.4999 6 18.9999 6.5625 19.2499 7.1875C19.4999 7.8125 19.5624 8.5625 19.4374 9.25ZM8.9374 12.75L7.2499 11.75V7.0625C7.2499 6.375 7.4374 5.625 7.8124 5.0625C8.1874 4.4375 8.7499 4 9.3749 3.6875C9.9999 3.375 10.7499 3.25 11.4374 3.375C12.1249 3.4375 12.8124 3.75 13.3749 4.1875C13.3749 4.1875 13.3124 4.25 13.2499 4.25L9.2499 6.5625C9.1249 6.625 9.0624 6.6875 8.9999 6.8125C8.9374 6.9375 8.9374 7 8.9374 7.125V12.75ZM9.8124 10.75L11.9999 9.5L14.1874 10.75V13.25L11.9999 14.5L9.8124 13.25V10.75Z">
                    </path>
                  </svg>
                  <span className="font-medium">
                    <Trans>OpenAI</Trans>
                  </span>
                </div>
                <p className="text-xs font-normal text-neutral-500 mt-1">
                  <Trans>Use OpenAI's GPT models with your API key</Trans>
                </p>
              </div>
              <div className="text-neutral-400">
                {openAccordion === "openai" && customLLMEnabled.data ? "−" : "+"}
              </div>
            </div>
          </div>

          {openAccordion === "openai" && customLLMEnabled.data && (
            <div className="px-4 pb-4 border-t">
              <div className="mt-4">
                <Form {...openaiForm}>
                  <form className="space-y-4">
                    <FormField
                      control={openaiForm.control}
                      name="api_key"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            <Trans>API Key</Trans>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="sk-..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={openaiForm.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            <Trans>Model</Trans>
                          </FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select OpenAI model" />
                              </SelectTrigger>
                              <SelectContent>
                                {openaiModels.map((model) => (
                                  <SelectItem key={model} value={model}>
                                    {model}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </div>
            </div>
          )}
        </div>

        {/* Gemini Accordion */}
        <div
          className={cn(
            "border rounded-lg transition-all duration-150 ease-in-out cursor-pointer",
            openAccordion === "gemini" && customLLMEnabled.data
              ? "border-blue-500 ring-2 ring-blue-500 bg-blue-50"
              : "border-neutral-200 bg-white hover:border-neutral-300",
            !customLLMEnabled.data && "opacity-60",
          )}
        >
          <div
            className="p-4"
            onClick={() => handleAccordionClick("gemini")}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M23.9996 12.0235C17.5625 12.4117 12.4114 17.563 12.0232 24H11.9762C11.588 17.563 6.4369 12.4117 0 12.0235V11.9765C6.4369 11.5883 11.588 6.43719 11.9762 0H12.0232C12.4114 6.43719 17.5625 11.5883 23.9996 11.9765V12.0235Z">
                    </path>
                  </svg>
                  <span className="font-medium">
                    <Trans>Google Gemini</Trans>
                  </span>
                </div>
                <p className="text-xs font-normal text-neutral-500 mt-1">
                  <Trans>Use Google's Gemini models with your API key</Trans>
                </p>
              </div>
              <div className="text-neutral-400">
                {openAccordion === "gemini" && customLLMEnabled.data ? "−" : "+"}
              </div>
            </div>
          </div>

          {openAccordion === "gemini" && customLLMEnabled.data && (
            <div className="px-4 pb-4 border-t">
              <div className="mt-4">
                <Form {...geminiForm}>
                  <form className="space-y-4">
                    <FormField
                      control={geminiForm.control}
                      name="api_key"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            <Trans>API Key</Trans>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="AIza..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={geminiForm.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            <Trans>Model</Trans>
                          </FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select Gemini model" />
                              </SelectTrigger>
                              <SelectContent>
                                {geminiModels.map((model) => (
                                  <SelectItem key={model} value={model}>
                                    {model}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </div>
            </div>
          )}
        </div>

        {/* OpenRouter Accordion */}
        <div
          className={cn(
            "border rounded-lg transition-all duration-150 ease-in-out cursor-pointer",
            openAccordion === "openrouter" && customLLMEnabled.data
              ? "border-blue-500 ring-2 ring-blue-500 bg-blue-50"
              : "border-neutral-200 bg-white hover:border-neutral-300",
            !customLLMEnabled.data && "opacity-60",
          )}
        >
          <div
            className="p-4"
            onClick={() => handleAccordionClick("openrouter")}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <svg
                    fill="currentColor"
                    fill-rule="evenodd"
                    height="1em"
                    style={{ flex: "none", lineHeight: 1 }}
                    viewBox="0 0 24 24"
                    width="1em"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                  >
                    <title>OpenRouter</title>
                    <path d="M16.804 1.957l7.22 4.105v.087L16.73 10.21l.017-2.117-.821-.03c-1.059-.028-1.611.002-2.268.11-1.064.175-2.038.577-3.147 1.352L8.345 11.03c-.284.195-.495.336-.68.455l-.515.322-.397.234.385.23.53.338c.476.314 1.17.796 2.701 1.866 1.11.775 2.083 1.177 3.147 1.352l.3.045c.694.091 1.375.094 2.825.033l.022-2.159 7.22 4.105v.087L16.589 22l.014-1.862-.635.022c-1.386.042-2.137.002-3.138-.162-1.694-.28-3.26-.926-4.881-2.059l-2.158-1.5a21.997 21.997 0 00-.755-.498l-.467-.28a55.927 55.927 0 00-.76-.43C2.908 14.73.563 14.116 0 14.116V9.888l.14.004c.564-.007 2.91-.622 3.809-1.124l1.016-.58.438-.274c.428-.28 1.072-.726 2.686-1.853 1.621-1.133 3.186-1.78 4.881-2.059 1.152-.19 1.974-.213 3.814-.138l.02-1.907z">
                    </path>
                  </svg>
                  <span className="font-medium">
                    <Trans>OpenRouter</Trans>
                  </span>
                </div>
                <p className="text-xs font-normal text-neutral-500 mt-1">
                  <Trans>Access multiple AI models through OpenRouter with your API key</Trans>
                </p>
              </div>
              <div className="text-neutral-400">
                {openAccordion === "openrouter" && customLLMEnabled.data ? "−" : "+"}
              </div>
            </div>
          </div>

          {openAccordion === "openrouter" && customLLMEnabled.data && (
            <div className="px-4 pb-4 border-t">
              <div className="mt-4">
                <Form {...openrouterForm}>
                  <form className="space-y-4">
                    <FormField
                      control={openrouterForm.control}
                      name="api_key"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            <Trans>API Key</Trans>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="sk-..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={openrouterForm.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            <Trans>Model</Trans>
                          </FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select OpenRouter model" />
                              </SelectTrigger>
                              <SelectContent>
                                {openrouterModels.map((model) => (
                                  <SelectItem key={model} value={model}>
                                    {model}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </div>
            </div>
          )}
        </div>

        {/* Custom Endpoint Accordion */}
        <div
          className={cn(
            "border rounded-lg transition-all duration-150 ease-in-out cursor-pointer",
            openAccordion === "others" && customLLMEnabled.data
              ? "border-blue-500 ring-2 ring-blue-500 bg-blue-50"
              : "border-neutral-200 bg-white hover:border-neutral-300",
            !customLLMEnabled.data && "opacity-60",
          )}
        >
          <div
            className="p-4"
            onClick={() => handleAccordionClick("others")}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-medium">
                  <Trans>Others</Trans>
                </span>
                <p className="text-xs font-normal text-neutral-500 mt-1">
                  <Trans>Connect to a self-hosted or third-party LLM endpoint (OpenAI API compatible)</Trans>
                </p>
              </div>
              <div className="text-neutral-400">
                {openAccordion === "others" && customLLMEnabled.data ? "−" : "+"}
              </div>
            </div>
          </div>

          {openAccordion === "others" && customLLMEnabled.data && (
            <div className="px-4 pb-4 border-t">
              <div className="mt-4">
                <Form {...customForm}>
                  <form className="space-y-4">
                    <FormField
                      control={customForm.control}
                      name="api_base"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            <Trans>API Base URL</Trans>
                          </FormLabel>
                          <FormDescription className="text-xs">
                            <Trans>Enter the base URL for your custom LLM endpoint</Trans>
                          </FormDescription>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="http://localhost:11434/v1"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customForm.control}
                      name="api_key"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            <Trans>API Key</Trans>
                            {customForm.watch("api_base") && isLocalEndpoint() && (
                              <span className="text-xs font-normal text-neutral-500 ml-2">
                                <Trans>(Optional for localhost)</Trans>
                              </span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="sk-..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customForm.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            <Trans>Model Name</Trans>
                          </FormLabel>
                          <FormDescription className="text-xs">
                            <Trans>
                              Select a model from the dropdown (if available) or manually enter the model name required
                              by your endpoint.
                            </Trans>
                          </FormDescription>
                          <FormControl>
                            {othersModels.isLoading && !field.value
                              ? (
                                <div className="py-1 text-sm text-neutral-500">
                                  <Trans>Loading available models...</Trans>
                                </div>
                              )
                              : othersModels.data && othersModels.data.length > 0
                              ? (
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select model" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {othersModels.data.map((model) => (
                                      <SelectItem key={model} value={model}>
                                        {model}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )
                              : (
                                <Input
                                  {...field}
                                  placeholder="Enter model name (endpoint has no discoverable models)"
                                />
                              )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
