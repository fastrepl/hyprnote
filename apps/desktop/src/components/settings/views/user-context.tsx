import { Button } from "@hypr/ui/components/ui/button";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import { toast } from "@hypr/ui/components/ui/toast";
import { load } from "@tauri-apps/plugin-store";
import React, { useEffect, useRef, useState } from "react";

export default function UserContext() {
  const [isLoading, setIsLoading] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [userContext, setUserContext] = useState<{ value: string } | null>(null);

  const showUserContextToast = (content: string) => {
    toast({
      id: "user-context",
      title: "User Context",
      content: content,
      dismissible: true,
    });
  };

  const getStore = async () => {
    return await load("store.json", { autoSave: false });
  };

  const getUserContext = async (): Promise<{ value: string } | null> => {
    let store = await getStore();
    let userContext = await store.get("user_context");

    return userContext as { value: string } | null;
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      let store = await getStore();

      if (!store) {
        showUserContextToast("Failed to retrieve user store");
        setIsLoading(false);
        return;
      }

      if (!textAreaRef?.current?.value) {
        showUserContextToast("Failed to save user context");
        setIsLoading(false);
        return;
      }

      store.set("user_context", { value: textAreaRef?.current?.value });
      await store.save();
      showUserContextToast("User context saved successfully");
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.log("Failed to save user context with error ", error);
    }
  };

  useEffect(() => {
    getUserContext().then((val) => {
      setUserContext(val);
    }).catch((e) => {
      console.log(e);
    });
  }, []);

  return (
    <div className="flex-1 ">
      <div className="mb-2">
        <p className="text-black ">User Context</p>
      </div>
      <Textarea
        className="h-full"
        ref={textAreaRef}
        placeholder={`${userContext?.value || "Enter details about yourself"}`}
      >
      </Textarea>

      <div className="mt-2 flex flex-row w-full justify-center">
        <Button
          isLoading={isLoading}
          className="w-3/4"
          onClick={handleSave}
        >
          <span className="text-white">Save</span>
        </Button>
      </div>
    </div>
  );
}
