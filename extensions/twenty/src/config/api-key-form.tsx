import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { ops as twenty } from "../client";

const apiKeySchema = z.object({
  apiKey: z.string().min(2, "API key must be at least 2 characters"),
});

export default function ApiKeyForm() {
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      apiKey: "",
    },
  });

  const getKeyQuery = useQuery({
    queryKey: ["vault", "twenty-api-key"],
    queryFn: () => twenty.getApiKey(),
    refetchOnWindowFocus: false,
  });

  const setKeyMutation = useMutation({
    mutationFn: async (form: z.infer<typeof apiKeySchema>) => {
      await twenty.setApiKey(form.apiKey);
      return form;
    },
    onSuccess: (form) => {
      setIsEditing(false);
      queryClient.setQueryData(["vault", "twenty-api-key"], form.apiKey);
    },
    onError: console.error,
  });

  const hasStoredKey = Boolean(getKeyQuery.data);
  const isDirty = form.formState.isDirty;
  const showEditMode = isEditing || !hasStoredKey || isDirty;

  const handleSubmit = form.handleSubmit((values) => {
    setKeyMutation.mutate(values);
  });

  return (
    <div>
      {getKeyQuery.isPending ? (
        <div className="mt-3 flex items-center">
          <Spinner className="mr-2 h-4 w-4" />
          <span className="text-sm text-gray-500">
            Checking for existing API key...
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="flex items-center space-x-2">
            {!showEditMode ? (
              <>
                {hasStoredKey && (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="size-5 text-green-500" />
                    <p className="text-sm font-medium text-gray-700">
                      API key configured
                    </p>
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  Change
                </Button>
              </>
            ) : (
              <>
                <Input
                  type="password"
                  placeholder={
                    hasStoredKey
                      ? "Enter new Twenty API key"
                      : "Enter your Twenty API key"
                  }
                  className="focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-64"
                  {...form.register("apiKey")}
                />

                <Button
                  type="submit"
                  disabled={
                    setKeyMutation.isPending || (!isDirty && hasStoredKey)
                  }
                >
                  {setKeyMutation.isPending && (
                    <Spinner className="mr-2 h-4 w-4" />
                  )}
                  {setKeyMutation.isPending ? "Saving..." : "Save"}
                </Button>

                {hasStoredKey && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </>
            )}
          </div>

          {form.formState.errors.apiKey && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.apiKey.message}
            </p>
          )}

          {setKeyMutation.isSuccess && (
            <p className="mt-2 text-sm text-green-600">
              API key saved successfully!
            </p>
          )}
        </form>
      )}
    </div>
  );
}
