import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloLink,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { auth } from "../config/firebase";

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_API_URL || "http://localhost:5002/graphql",
});

// Attach Firebase JWT to every request
const authLink = setContext(async (_, { headers }) => {
  const user = auth.currentUser;
  let token = "";
  if (user) {
    try {
      token = await user.getIdToken();
    } catch {
      // Token refresh failed — user will be redirected to login by AuthContext
    }
  }
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: "cache-and-network" },
  },
});
