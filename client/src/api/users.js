import { client } from "./client";

function listUsers() {
  return client.get("/users").then((res) => res.data);
}

export { listUsers };
