import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as accountsApi from "../api/accounts";
import { apiErrorMessage } from "../api/client";
import AccountForm from "../components/AccountForm";

function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function loadAccounts() {
    setLoading(true);
    accountsApi
      .listAccounts()
      .then(setAccounts)
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  async function handleCreate(name) {
    setError("");
    try {
      await accountsApi.createAccount({ name });
      loadAccounts();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <h1>Your accounts</h1>

      <AccountForm onSubmit={handleCreate} />

      {error && <p data-testid="dashboard-error">{error}</p>}

      {loading ? (
        <p data-testid="loading">Loading...</p>
      ) : (
        <ul data-testid="account-list">
          {accounts.map((account) => (
            <li key={account.id} data-testid={`account-item-${account.id}`}>
              <Link to={`/accounts/${account.id}`} data-testid={`account-link-${account.id}`}>
                {account.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!loading && accounts.length === 0 && (
        <p data-testid="no-accounts-message">No accounts yet. Create one above.</p>
      )}
    </div>
  );
}

export default Dashboard;
