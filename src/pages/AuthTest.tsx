import { useAuth } from "@/contexts/AuthContext";

const AuthTest = () => {
  const { user, loading, signIn, signOut } = useAuth();

  const handleTestLogin = async () => {
    try {
      await signIn("test@example.com", "password123");
    } catch (error) {
      console.error("Test login failed:", error);
    }
  };

  const handleTestLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Test logout failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Auth Test Page</h1>
        
        <div className="space-y-4">
          <div>
            <strong>Loading:</strong> {loading ? "Yes" : "No"}
          </div>
          
          <div>
            <strong>User:</strong> {user ? user.email : "Not logged in"}
          </div>
          
          <div className="space-y-2">
            <button
              onClick={handleTestLogin}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              disabled={loading}
            >
              Test Login
            </button>
            
            <button
              onClick={handleTestLogout}
              className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
              disabled={loading}
            >
              Test Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthTest;
