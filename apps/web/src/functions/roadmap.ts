import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSupabaseServerClient } from "@/functions/supabase";

export type RoadmapItem = {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in-progress" | "done";
  labels: string[];
  github_issues: string[];
  created_at: string;
  updated_at: string;
  vote_count: number;
  user_has_voted: boolean;
};

export const fetchRoadmapItems = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = getSupabaseServerClient();

    const { data: items, error: itemsError } = await supabase
      .from("roadmap_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (itemsError) {
      throw itemsError;
    }

    const { data: voteCounts } = await supabase.rpc("get_roadmap_vote_counts");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userVotes: string[] = [];
    if (user) {
      const { data: votes } = await supabase
        .from("roadmap_votes")
        .select("roadmap_item_id")
        .eq("user_id", user.id);

      userVotes = (votes || []).map((v) => v.roadmap_item_id);
    }

    const voteCountMap = new Map<string, number>();
    if (voteCounts) {
      for (const vc of voteCounts) {
        voteCountMap.set(vc.roadmap_item_id, Number(vc.vote_count));
      }
    }

    const result: RoadmapItem[] = (items || []).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      status: item.status as "todo" | "in-progress" | "done",
      labels: item.labels || [],
      github_issues: item.github_issues || [],
      created_at: item.created_at,
      updated_at: item.updated_at,
      vote_count: voteCountMap.get(item.id) || 0,
      user_has_voted: userVotes.includes(item.id),
    }));

    return result;
  },
);

const fetchRoadmapItemInput = z.object({
  id: z.string().uuid(),
});

export const fetchRoadmapItem = createServerFn({ method: "GET" })
  .inputValidator(fetchRoadmapItemInput)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();

    const { data: item, error: itemError } = await supabase
      .from("roadmap_items")
      .select("*")
      .eq("id", data.id)
      .single();

    if (itemError || !item) {
      return null;
    }

    const { data: voteCounts } = await supabase.rpc("get_roadmap_vote_counts");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userHasVoted = false;
    if (user) {
      const { data: vote } = await supabase
        .from("roadmap_votes")
        .select("id")
        .eq("user_id", user.id)
        .eq("roadmap_item_id", data.id)
        .single();

      userHasVoted = !!vote;
    }

    const voteCount =
      voteCounts?.find(
        (vc: { roadmap_item_id: string; vote_count: number }) =>
          vc.roadmap_item_id === item.id,
      )?.vote_count || 0;

    const result: RoadmapItem = {
      id: item.id,
      title: item.title,
      description: item.description,
      status: item.status as "todo" | "in-progress" | "done",
      labels: item.labels || [],
      github_issues: item.github_issues || [],
      created_at: item.created_at,
      updated_at: item.updated_at,
      vote_count: Number(voteCount),
      user_has_voted: userHasVoted,
    };

    return result;
  });

const voteInput = z.object({
  roadmapItemId: z.string().uuid(),
});

export const toggleVote = createServerFn({ method: "POST" })
  .inputValidator(voteInput)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: true, message: "You must be logged in to vote" };
    }

    const { data: existingVote } = await supabase
      .from("roadmap_votes")
      .select("id")
      .eq("user_id", user.id)
      .eq("roadmap_item_id", data.roadmapItemId)
      .single();

    if (existingVote) {
      const { error } = await supabase
        .from("roadmap_votes")
        .delete()
        .eq("id", existingVote.id);

      if (error) {
        return { error: true, message: error.message };
      }

      return { success: true, voted: false };
    } else {
      const { error } = await supabase.from("roadmap_votes").insert({
        user_id: user.id,
        roadmap_item_id: data.roadmapItemId,
      });

      if (error) {
        return { error: true, message: error.message };
      }

      return { success: true, voted: true };
    }
  });
