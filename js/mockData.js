/**
 * CampusHub 1.0 — Initial State (empty, all data comes from Supabase)
 * Used as fallback only when Supabase is unavailable.
 */

export const INITIAL_STATE = {
  registeredUsers: [],
  currentUser: null,
  projects: [],
  resources: [],
  collaborationPosts: [],
  requests: [],
  updateBoard: [],
  chats: {}
};
