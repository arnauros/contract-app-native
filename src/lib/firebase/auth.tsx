import { auth } from "./config";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  getAuth,
  AuthError,
  signInAnonymously,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";

// Create auth context
type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  return useContext(AuthContext);
}

const handleAuthError = (error: AuthError) => {
  console.error("Auth error:", error);
  return {
    error: {
      code: error.code,
      message: error.message,
    },
  };
};

export const signIn = async (email: string, password: string) => {
  try {
    if (!auth) throw new Error("Auth instance not initialized");
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (error) {
    return handleAuthError(error as AuthError);
  }
};

export const signUp = async (email: string, password: string) => {
  try {
    if (!auth) throw new Error("Auth instance not initialized");
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (error) {
    return handleAuthError(error as AuthError);
  }
};

export const signOut = async () => {
  const auth = getAuth();
  try {
    await firebaseSignOut(auth);
    return { success: true, error: null };
  } catch (error) {
    return handleAuthError(error as AuthError);
  }
};

export const signInWithGoogle = async () => {
  try {
    if (!auth) throw new Error("Auth instance not initialized");
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return { user: result.user, error: null };
  } catch (error) {
    return handleAuthError(error as AuthError);
  }
};

export const updateUserProfile = async (displayName: string) => {
  try {
    const auth = getAuth();
    if (!auth.currentUser) {
      return { error: { code: "auth/no-user", message: "No user logged in" } };
    }
    await updateProfile(auth.currentUser, { displayName });
    return { success: true, error: null };
  } catch (error) {
    return handleAuthError(error as AuthError);
  }
};

export const signInAnonymous = async () => {
  try {
    if (!auth) throw new Error("Auth instance not initialized");
    const result = await signInAnonymously(auth);
    return { user: result.user, error: null };
  } catch (error) {
    return handleAuthError(error as AuthError);
  }
};
