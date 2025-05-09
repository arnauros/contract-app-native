# Firebase Authentication Structure

This directory contains a consolidated authentication system for the application. The structure has been simplified to avoid duplication and prevent race conditions.

## Core Files

The authentication system consists of four main files:

1. **firebase.ts**

   - Initializes Firebase app and exports services (auth, db, etc.)
   - Ensures Firebase is only initialized once
   - Exports `app`, `auth`, and `db` instances

2. **authUtils.ts**

   - Contains all authentication utility functions
   - Sign in, sign up, sign out, etc.
   - Error handling for authentication operations

3. **../context/AuthProvider.tsx**

   - React context provider for authentication state
   - Manages user state, loading state, and errors
   - Sets up auth state listener using `onAuthStateChanged`

4. **../hooks/useAuth.ts**
   - Custom hook to access authentication state
   - Provides stable authentication states to prevent UI flickers
   - Type guards for authentication checks

## Usage Examples

### Setting up the Auth Provider

In your root layout or app component:

```tsx
import { AuthProvider } from "@/lib/context/AuthProvider";

export default function RootLayout({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
```

### Using the Auth Hook

In any component:

```tsx
import { useAuth } from "@/lib/hooks/useAuth";
import { signIn, signOut } from "@/lib/firebase/authUtils";

export default function MyComponent() {
  const { user, loading, loggedIn } = useAuth();

  const handleLogin = async () => {
    const result = await signIn("user@example.com", "password");
    if (result.error) {
      console.error(result.error.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {loggedIn ? (
        <>
          <p>Welcome, {user?.email}</p>
          <button onClick={() => signOut()}>Sign Out</button>
        </>
      ) : (
        <button onClick={handleLogin}>Sign In</button>
      )}
    </div>
  );
}
```

## Protected Routes

For protecting routes, use the useAuth hook in your page components:

```tsx
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedPage() {
  const { loggedIn, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !loggedIn) {
      router.push("/login");
    }
  }, [loggedIn, loading, router]);

  if (loading) return <div>Loading...</div>;
  if (!loggedIn) return null;

  return <div>Protected Content</div>;
}
```
