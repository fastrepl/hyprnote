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
import { SharedCustomEndpointProps } from "./shared";

const openaiModels = [
  "gpt-4",
  "gpt-4-turbo",
  "gpt-4o", 
  "gpt-4o-mini",
  "gpt-3.5-turbo"
];

const geminiModels = [
  "gemini-1.5-pro",
  "gemini-1.5-flash", 
  "gemini-1.0-pro"
];

export function LLMCustomView({
  customLLMEnabled,
  selectedLLMModel,
  setSelectedLLMModel,
  setCustomLLMEnabledMutation,
  configureCustomEndpoint,
  openaiApiKey,
  setOpenaiApiKeyState,
  selectedOpenaiModel,
  setSelectedOpenaiModel,
  geminiApiKey,
  setGeminiApiKeyState,
  selectedGeminiModel,
  setSelectedGeminiModel,
  openAccordion,
  setOpenAccordion,
  customLLMConnection,
  getCustomLLMModel,
  availableLLMModels,
  form,
  isLocalEndpoint,
}: SharedCustomEndpointProps) {
  // Provider detection based on stored connection
  useEffect(() => {
    if (customLLMConnection.data?.api_base) {
      const apiBase = customLLMConnection.data.api_base;
      const isOpenai = apiBase.includes('openai.com');
      const isGemini = apiBase.includes('googleapis.com');
      
      setOpenAccordion(
        isOpenai ? 'openai' : 
        isGemini ? 'gemini' : 
        'custom'
      );
    } else if (customLLMEnabled.data) {
      setOpenAccordion('custom'); // Default to custom if enabled but no connection
    } else {
      setOpenAccordion(null);
    }
  }, [customLLMConnection.data, customLLMEnabled.data, setOpenAccordion]);

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
            openAccordion === 'openai'
              ? "border-blue-500 ring-2 ring-blue-500 bg-blue-50"
              : "border-neutral-200 bg-white hover:border-neutral-300",
          )}
        >
          <div
            className="p-4"
            onClick={() => {
              const newState = openAccordion === 'openai' ? null : 'openai';
              setOpenAccordion(newState);
              if (newState === 'openai') {
                // CRITICAL: Enable custom LLM when OpenAI is selected
                setCustomLLMEnabledMutation.mutate(true);
                setSelectedLLMModel("");
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-medium">
                  <Trans>OpenAI</Trans>
                </span>
                <p className="text-xs font-normal text-neutral-500 mt-1">
                  <Trans>Use OpenAI's GPT models with your API key</Trans>
                </p>
              </div>
              <div className="text-neutral-400">
                {openAccordion === 'openai' ? '−' : '+'}
              </div>
            </div>
          </div>

          {openAccordion === 'openai' && (
            <div className="px-4 pb-4 border-t">
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    <Trans>API Key</Trans>
                  </label>
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={openaiApiKey}
                    onChange={(e) => {
                      setOpenaiApiKeyState(e.target.value);
                      if (e.target.value && selectedOpenaiModel) {
                        configureCustomEndpoint({
                          provider: 'openai',
                          api_base: '', // Will be auto-set
                          api_key: e.target.value,
                          model: selectedOpenaiModel,
                        });
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    <Trans>Model</Trans>
                  </label>
                  <Select
                    value={selectedOpenaiModel}
                    onValueChange={(value) => {
                      setSelectedOpenaiModel(value);
                      if (openaiApiKey && value) {
                        configureCustomEndpoint({
                          provider: 'openai',
                          api_base: '', // Will be auto-set
                          api_key: openaiApiKey,
                          model: value,
                        });
                      }
                    }}
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
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Gemini Accordion */}
        <div
          className={cn(
            "border rounded-lg transition-all duration-150 ease-in-out cursor-pointer",
            openAccordion === 'gemini'
              ? "border-blue-500 ring-2 ring-blue-500 bg-blue-50"
              : "border-neutral-200 bg-white hover:border-neutral-300",
          )}
        >
          <div
            className="p-4"
            onClick={() => {
              const newState = openAccordion === 'gemini' ? null : 'gemini';
              setOpenAccordion(newState);
              if (newState === 'gemini') {
                // CRITICAL: Enable custom LLM when Gemini is selected
                setCustomLLMEnabledMutation.mutate(true);
                setSelectedLLMModel("");
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-medium">
                  <Trans>Google Gemini</Trans>
                </span>
                <p className="text-xs font-normal text-neutral-500 mt-1">
                  <Trans>Use Google's Gemini models with your API key</Trans>
                </p>
              </div>
              <div className="text-neutral-400">
                {openAccordion === 'gemini' ? '−' : '+'}
              </div>
            </div>
          </div>

          {openAccordion === 'gemini' && (
            <div className="px-4 pb-4 border-t">
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    <Trans>API Key</Trans>
                  </label>
                  <Input
                    type="password"
                    placeholder="AIza..."
                    value={geminiApiKey}
                    onChange={(e) => {
                      setGeminiApiKeyState(e.target.value);
                      if (e.target.value && selectedGeminiModel) {
                        configureCustomEndpoint({
                          provider: 'gemini',
                          api_base: '', // Will be auto-set
                          api_key: e.target.value,
                          model: selectedGeminiModel,
                        });
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    <Trans>Model</Trans>
                  </label>
                  <Select
                    value={selectedGeminiModel}
                    onValueChange={(value) => {
                      setSelectedGeminiModel(value);
                      if (geminiApiKey && value) {
                        configureCustomEndpoint({
                          provider: 'gemini',
                          api_base: '', // Will be auto-set
                          api_key: geminiApiKey,
                          model: value,
                        });
                      }
                    }}
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
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Custom Endpoint Accordion */}
        <div
          className={cn(
            "border rounded-lg transition-all duration-150 ease-in-out cursor-pointer",
            openAccordion === 'custom'
              ? "border-blue-500 ring-2 ring-blue-500 bg-blue-50"
              : "border-neutral-200 bg-white hover:border-neutral-300",
          )}
        >
          <div
            className="p-4"
            onClick={() => {
              const newState = openAccordion === 'custom' ? null : 'custom';
              setOpenAccordion(newState);
              if (newState === 'custom') {
                // CRITICAL: Enable custom LLM when Custom is selected
                setCustomLLMEnabledMutation.mutate(true);
                setSelectedLLMModel("");
              }
            }}
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
                {openAccordion === 'custom' ? '−' : '+'}
              </div>
            </div>
          </div>

          {openAccordion === 'custom' && (
            <div className="px-4 pb-4 border-t">
              <div className="mt-4">
                <Form {...form}>
                  <form className="space-y-4">
                    <FormField
                      control={form.control}
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
                              disabled={openAccordion !== 'custom'}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("api_base") && !isLocalEndpoint() && (
                      <FormField
                        control={form.control}
                        name="api_key"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">
                              <Trans>API Key</Trans>
                            </FormLabel>
                            <FormDescription className="text-xs">
                              <Trans>Enter the API key for your custom LLM endpoint</Trans>
                            </FormDescription>
                            <FormControl>
                              <Input
                                {...field}
                                type="password"
                                placeholder="sk-..."
                                disabled={openAccordion !== 'custom'}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            <Trans>Model Name</Trans>
                          </FormLabel>
                          <FormDescription className="text-xs">
                            <Trans>
                              Select a model from the dropdown (if available) or manually enter the model name required by
                              your endpoint.
                            </Trans>
                          </FormDescription>
                          <FormControl>
                            {availableLLMModels.isLoading && !field.value
                              ? (
                                <div className="py-1 text-sm text-neutral-500">
                                  <Trans>Loading available models...</Trans>
                                </div>
                              )
                              : availableLLMModels.data && availableLLMModels.data.length > 0
                              ? (
                                <Select
                                  defaultValue={field.value}
                                  onValueChange={(value: string) => {
                                    field.onChange(value);
                                  }}
                                  disabled={openAccordion !== 'custom'}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select model" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableLLMModels.data.map((model) => (
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
                                  placeholder="Enter model name (e.g., gpt-4, llama3.2:3b)"
                                  disabled={openAccordion !== 'custom'}
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