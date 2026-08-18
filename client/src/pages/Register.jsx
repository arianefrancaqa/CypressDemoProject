import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage, apiErrorDetails } from "../api/client";

function Register() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState([]);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setFieldErrors([]);
    setSuccess(false);
    try {
      await register({ name, email, password });
      setSuccess(true);
    } catch (err) {
      setError(apiErrorMessage(err));
      setFieldErrors(apiErrorDetails(err));
    }
  }

  return (
    <div>
      <h1>Register</h1>
      <form onSubmit={handleSubmit} data-testid="register-form">
        <label htmlFor="register-name">Name</label>
        <input
          id="register-name"
          data-testid="register-name-input"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          data-testid="register-email-input"
          type="text"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          data-testid="register-password-input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <button type="submit" data-testid="register-submit-button">
          Register
        </button>
      </form>

      {success && (
        <p data-testid="register-success">Account created successfully. Please log in.</p>
      )}

      {error && <p data-testid="register-error">{error}</p>}

      {fieldErrors.length > 0 && (
        <ul data-testid="register-field-errors">
          {fieldErrors.map((detail) => (
            <li key={detail.field} data-testid={`register-field-error-${detail.field}`}>
              {detail.field}: {detail.message}
            </li>
          ))}
        </ul>
      )}

      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}

export default Register;
