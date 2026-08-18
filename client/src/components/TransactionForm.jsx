import { useState } from "react";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function TransactionForm({ onSubmit }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [date, setDate] = useState(todayIsoDate());

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({ description, amount: Number(amount), type, date });
    setDescription("");
    setAmount("");
    setType("expense");
    setDate(todayIsoDate());
  }

  return (
    <form onSubmit={handleSubmit} data-testid="transaction-form">
      <label htmlFor="transaction-description">Description</label>
      <input
        id="transaction-description"
        data-testid="transaction-description-input"
        type="text"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />

      <label htmlFor="transaction-amount">Amount</label>
      <input
        id="transaction-amount"
        data-testid="transaction-amount-input"
        type="number"
        step="0.01"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
      />

      <label htmlFor="transaction-type">Type</label>
      <select
        id="transaction-type"
        data-testid="transaction-type-select"
        value={type}
        onChange={(event) => setType(event.target.value)}
      >
        <option value="income">Income</option>
        <option value="expense">Expense</option>
      </select>

      <label htmlFor="transaction-date">Date</label>
      <input
        id="transaction-date"
        data-testid="transaction-date-input"
        type="date"
        value={date}
        onChange={(event) => setDate(event.target.value)}
      />

      <button type="submit" data-testid="transaction-form-submit">
        Add transaction
      </button>
    </form>
  );
}

export default TransactionForm;
