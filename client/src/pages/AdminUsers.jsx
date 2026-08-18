import { useEffect, useState } from "react";
import * as usersApi from "../api/users";
import { apiErrorMessage } from "../api/client";

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi
      .listUsers()
      .then(setUsers)
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main id="main-content">
        <p data-testid="loading">Loading...</p>
      </main>
    );
  }

  return (
    <main id="main-content">
      <h1>Users</h1>
      {error && <p data-testid="admin-users-error">{error}</p>}
      <ul data-testid="user-list">
        {users.map((user) => (
          <li key={user.id} data-testid={`user-item-${user.id}`}>
            {user.name} - {user.email} - {user.role}
          </li>
        ))}
      </ul>
    </main>
  );
}

export default AdminUsers;
