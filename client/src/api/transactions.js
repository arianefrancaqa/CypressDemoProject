import { client } from "./client";

function listTransactions(accountId) {
  return client.get(`/accounts/${accountId}/transactions`).then((res) => res.data);
}

function createTransaction(accountId, { description, amount, type, date }) {
  return client
    .post(`/accounts/${accountId}/transactions`, { description, amount, type, date })
    .then((res) => res.data);
}

function updateTransaction(id, fields) {
  return client.put(`/transactions/${id}`, fields).then((res) => res.data);
}

function deleteTransaction(id) {
  return client.delete(`/transactions/${id}`);
}

export { listTransactions, createTransaction, updateTransaction, deleteTransaction };
