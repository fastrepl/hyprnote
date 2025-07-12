/**
 * Canny API integration for feedback collection
 */

interface CannyUser {
  id: string;
  email: string;
  name: string;
}

interface CannyPost {
  id: string;
}

interface CreateUserRequest {
  apiKey: string;
  email: string;
  name: string;
  userID?: string;
}

interface CreatePostRequest {
  apiKey: string;
  authorID: string;
  boardID: string;
  title: string;
  details: string;
  categoryID?: string;
  customFields?: Record<string, any>;
}

import { fetch } from "@hypr/utils";

const CANNY_API_BASE = "https://canny.io/api/v1";

class CannyAPI {
  private apiKey: string;
  private featureRequestsBoardID: string;
  private bugReportsBoardID: string;

  constructor(apiKey: string, featureRequestsBoardID: string, bugReportsBoardID: string) {
    this.apiKey = apiKey;
    this.featureRequestsBoardID = featureRequestsBoardID;
    this.bugReportsBoardID = bugReportsBoardID;
  }

  /**
   * Create or update a user in Canny
   */
  async createOrUpdateUser(email: string, name: string, userID?: string): Promise<CannyUser> {
    const response = await fetch(`${CANNY_API_BASE}/users/create_or_update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey: this.apiKey,
        email,
        name,
        userID,
      } as CreateUserRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Canny user creation error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        requestBody: {
          apiKey: this.apiKey.substring(0, 8) + "...",
          email,
          name,
          userID,
        },
      });
      throw new Error(`Failed to create or update user: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Create a new post in Canny
   */
  async createPost(
    authorID: string,
    title: string,
    details: string,
    boardID: string,
    options?: {
      categoryID?: string;
      customFields?: Record<string, any>;
    },
  ): Promise<CannyPost> {
    const response = await fetch(`${CANNY_API_BASE}/posts/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey: this.apiKey,
        authorID,
        boardID,
        title,
        details,
        categoryID: options?.categoryID,
        customFields: options?.customFields,
      } as CreatePostRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Canny post creation error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        requestBody: {
          apiKey: this.apiKey.substring(0, 8) + "...",
          authorID,
          boardID,
          title,
          details: details.substring(0, 100) + "...",
          categoryID: options?.categoryID,
          customFields: options?.customFields,
        },
      });
      throw new Error(`Failed to create post: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Submit feedback to Canny
   */
  async submitFeedback(
    email: string,
    title: string,
    details: string,
    feedbackType: string,
    userName?: string,
  ): Promise<{ postId: string; userId: string }> {
    const user = await this.createOrUpdateUser(
      email,
      userName || email.split("@")[0] || "Anonymous User",
    );

    const boardID = feedbackType === "idea" ? this.featureRequestsBoardID : this.bugReportsBoardID;

    const post = await this.createPost(
      user.id,
      title,
      details,
      boardID,
    );

    return {
      postId: post.id,
      userId: user.id,
    };
  }
}

// Initialize Canny API instance
export function createCannyClient(): CannyAPI | null {
  const apiKey = import.meta.env.VITE_CANNY_API_KEY;
  const featureRequestsBoardID = import.meta.env.VITE_CANNY_FEATURE_REQUESTS_BOARD_ID;
  const bugReportsBoardID = import.meta.env.VITE_CANNY_BUG_REPORTS_BOARD_ID;

  console.log("Canny API key:", apiKey);
  console.log("Canny feature requests board ID:", featureRequestsBoardID);
  console.log("Canny bug reports board ID:", bugReportsBoardID);

  if (!apiKey || !featureRequestsBoardID || !bugReportsBoardID) {
    console.warn("Canny API key or board ID not configured");
    return null;
  }

  return new CannyAPI(apiKey, featureRequestsBoardID, bugReportsBoardID);
}

export default CannyAPI;
