import { useState } from "react";

function AccountForm({ initialName = "", onSubmit, submitLabel = "Create account" }) {
  const [name, setName] = useState(initialName);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(name);
  }

  return (
    <form onSubmit={handleSubmit} data-testid="account-form">
      <label htmlFor="account-name">Account name</label>
      <input
        id="account-name"
        data-testid="account-name-input"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <button type="submit" data-testid="account-form-submit">
        {submitLabel}
      </button>
    </form>
  );
}

export default AccountForm;
