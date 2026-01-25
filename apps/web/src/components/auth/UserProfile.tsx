// User profile component showing authenticated user info
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from '../../services/auth';

export function UserProfile() {
  const { user, loading } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  if (loading) {
    return <div className="user-profile">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="user-profile">
      <div className="user-info">
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        {user.displayName && (
          <p>
            <strong>Name:</strong> {user.displayName}
          </p>
        )}
        <p>
          <strong>UID:</strong> {user.uid}
        </p>
      </div>
      <button onClick={handleSignOut} className="btn-secondary">
        Sign Out
      </button>
    </div>
  );
}
