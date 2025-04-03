import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { CheckCircle } from "lucide-react";
import { getApiKey, setApiKey } from "../client";

const apiKeySchema = z.object({
  apiKey: z.string().min(2, "API key must be at least 2 characters"),
});

type ApiKeyFormValues = z.infer<typeof apiKeySchema>;

export const ApiKeyForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [existingKey, setExistingKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      apiKey: "",
    },
  });

  useEffect(() => {
    const checkExistingKey = async () => {
      try {
        const key = await getApiKey();
        setExistingKey(key);
      } catch (error) {
        setExistingKey(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingKey();
  }, [submitSuccess]);

  const handleSubmit = async (values: ApiKeyFormValues) => {
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      await setApiKey(values.apiKey);
      setSubmitSuccess(true);
      setExistingKey(values.apiKey);
      setIsEditing(false);

      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Failed to save API key:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="flex w-80 items-center space-x-2">
          {existingKey && !isEditing
            ? (
              <>
                <Input
                  type="text"
                  value="••••••••••••••••"
                  disabled
                  className="bg-gray-50 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  Change
                </Button>
              </>
            )
            : (
              <>
                <Input
                  type="password"
                  placeholder="Enter your Twenty API key"
                  className="focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  {...form.register("apiKey")}
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Spinner />}
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </>
            )}
        </div>

        {form.formState.errors.apiKey && (
          <p className="mt-1 text-sm text-red-600">
            {form.formState.errors.apiKey.message}
          </p>
        )}

        {submitSuccess && (
          <p className="mt-2 text-sm text-green-600">
            API key saved successfully!
          </p>
        )}
      </form>

      {isLoading
        ? (
          <div className="mt-3 flex items-center">
            <Spinner className="mr-2 h-4 w-4" />
            <span className="text-sm text-gray-500">Checking for existing API key...</span>
          </div>
        )
        : existingKey && !isEditing
        ? (
          <div className="mt-3 flex items-start">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-700">API key configured</p>
              <p className="text-xs text-gray-500">Your Twenty API key is securely stored</p>
            </div>
          </div>
        )
        : null}
    </div>
  );
};

export default ApiKeyForm;
