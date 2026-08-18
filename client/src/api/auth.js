import { client } from "./client";

function register({ name, email, password }) {
  return client.post("/auth/register", { name, email, password }).then((res) => res.data);
}

function login({ email, password }) {
  return client.post("/auth/login", { email, password }).then((res) => res.data);
}

function me() {
  return client.get("/auth/me").then((res) => res.data);
}

export { register, login, me };
