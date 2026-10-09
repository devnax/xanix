import { createSession, useSession } from "../../../dist";

export const session = createSession({
  secret: "my-secret",
  verify: async (info) => {
    // Implement your verification logic here
    return true;
  },
  getUser: async (info) => {
    // Implement your user retrieval logic here
    return { id: "user-id", name: "John Doe" };
  },
});

export const useAuth = () => {
  return useSession(session);
};
