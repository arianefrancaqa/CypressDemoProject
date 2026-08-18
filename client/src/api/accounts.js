import { client } from "./client";

function listAccounts() {
  return client.get("/accounts").then((res) => res.data);
}

function createAccount({ name }) {
  return client.post("/accounts", { name }).then((res) => res.data);
}

function getAccount(id) {
  return client.get(`/accounts/${id}`).then((res) => res.data);
}

function updateAccount(id, { name }) {
  return client.put(`/accounts/${id}`, { name }).then((res) => res.data);
}

function deleteAccount(id) {
  return client.delete(`/accounts/${id}`);
}

function getBalance(id) {
  return client.get(`/accounts/${id}/balance`).then((res) => res.data);
}

export { listAccounts, createAccount, getAccount, updateAccount, deleteAccount, getBalance };
