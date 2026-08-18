import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as accountsApi from "../api/accounts";
import * as transactionsApi from "../api/transactions";
import { apiErrorMessage, apiErrorDetails } from "../api/client";
import TransactionForm from "../components/TransactionForm";

function AccountDetail() {
  const { accountId } = useParams();
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState([]);
  const [loading, setLoading] = useState(true);

  function loadAll() {
    setLoading(true);
    Promise.all([
      accountsApi.getAccount(accountId),
      accountsApi.getBalance(accountId),
      transactionsApi.listTransactions(accountId),
    ])
      .then(([accountData, balanceData, transactionsData]) => {
        setAccount(accountData);
        setBalance(balanceData.balance);
        setTransactions(transactionsData);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  async function handleAddTransaction(fields) {
    setError("");
    setFieldErrors([]);
    try {
      await transactionsApi.createTransaction(accountId, fields);
      loadAll();
    } catch (err) {
      setError(apiErrorMessage(err));
      setFieldErrors(apiErrorDetails(err));
    }
  }

  async function handleDeleteTransaction(id) {
    setError("");
    try {
      await transactionsApi.deleteTransaction(id);
      loadAll();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function handleDeleteAccount() {
    setError("");
    try {
      await accountsApi.deleteAccount(accountId);
      navigate("/");
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  if (loading) {
    return (
      <main id="main-content">
        <p data-testid="loading">Loading...</p>
      </main>
    );
  }
  if (!account) {
    return (
      <main id="main-content">
        <p data-testid="account-detail-error">{error}</p>
      </main>
    );
  }

  return (
    <main id="main-content">
      <h1 data-testid="account-detail-name">{account.name}</h1>
      <p data-testid="account-balance">Balance: {balance}</p>

      <button type="button" data-testid="delete-account-button" onClick={handleDeleteAccount}>
        Delete account
      </button>

      {error && <p data-testid="account-detail-error">{error}</p>}

      {fieldErrors.length > 0 && (
        <ul data-testid="transaction-field-errors">
          {fieldErrors.map((detail) => (
            <li key={detail.field} data-testid={`transaction-field-error-${detail.field}`}>
              {detail.field}: {detail.message}
            </li>
          ))}
        </ul>
      )}

      <TransactionForm onSubmit={handleAddTransaction} />

      <ul data-testid="transaction-list">
        {transactions.map((transaction) => (
          <li key={transaction.id} data-testid={`transaction-item-${transaction.id}`}>
            {transaction.date} - {transaction.description} - {transaction.type} -{" "}
            {transaction.amount}
            <button
              type="button"
              data-testid={`delete-transaction-${transaction.id}`}
              onClick={() => handleDeleteTransaction(transaction.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {transactions.length === 0 && (
        <p data-testid="no-transactions-message">No transactions yet.</p>
      )}
    </main>
  );
}

export default AccountDetail;
