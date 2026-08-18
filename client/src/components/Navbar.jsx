import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  if (!user) return null;

  return (
    <nav data-testid="navbar">
      <Link to="/" data-testid="nav-dashboard-link">
        Dashboard
      </Link>
      {user.role === "admin" && (
        <Link to="/admin/users" data-testid="nav-admin-link">
          Users
        </Link>
      )}
      <span data-testid="nav-user-name">{user.name}</span>
      <button type="button" data-testid="nav-logout-button" onClick={handleLogout}>
        Logout
      </button>
    </nav>
  );
}

export default Navbar;
