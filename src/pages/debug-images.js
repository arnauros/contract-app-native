import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

export default function DebugImages() {
  const { user, loading } = useAuth();
  const [imageData, setImageData] = useState({
    auth: null,
    firestore: null,
    localStorage: null,
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;

    fetchImageData();
  }, [user]);

  const fetchImageData = async () => {
    if (!user) return;

    // Get auth photo URL
    const auth = getAuth();
    const authPhotoUrl = auth.currentUser?.photoURL;

    // Get Firestore data
    const db = getFirestore();
    const userDoc = await getDoc(doc(db, "users", user.uid));
    let firestoreData = null;

    if (userDoc.exists()) {
      firestoreData = {
        profileImageUrl: userDoc.data().profileImageUrl,
        profileBannerUrl: userDoc.data().profileBannerUrl,
        defaultProfileImageUrl: userDoc.data().defaultProfileImageUrl,
        defaultProfileBannerUrl: userDoc.data().defaultProfileBannerUrl,
      };
    }

    // Get localStorage data
    const profileImageKey = `profileImage-${user.uid}`;
    const profileBannerKey = `profileBanner-${user.uid}`;
    const defaultProfileImageKey = `defaultProfileImage-${user.uid}`;
    const defaultProfileBannerKey = `defaultProfileBanner-${user.uid}`;

    const localStorageData = {
      profileImageUrl: localStorage.getItem(profileImageKey),
      profileBannerUrl: localStorage.getItem(profileBannerKey),
      defaultProfileImageUrl: localStorage.getItem(defaultProfileImageKey),
      defaultProfileBannerUrl: localStorage.getItem(defaultProfileBannerKey),
    };

    // Update state
    setImageData({
      auth: authPhotoUrl,
      firestore: firestoreData,
      localStorage: localStorageData,
    });
  };

  const forceImageSync = async () => {
    if (!user) return;

    setRefreshing(true);
    try {
      const db = getFirestore();
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Get image URLs from Firestore
        const profileImageUrl = userData.profileImageUrl;
        const profileBannerUrl = userData.profileBannerUrl;
        const defaultProfileImageUrl = userData.defaultProfileImageUrl;
        const defaultProfileBannerUrl = userData.defaultProfileBannerUrl;

        // Add cache busting parameter
        const timestamp = Date.now();
        const updateUrls = {};

        if (profileImageUrl) {
          const newUrl = addCacheBuster(profileImageUrl, timestamp);
          updateUrls.profileImageUrl = newUrl;
          localStorage.setItem(`profileImage-${user.uid}`, newUrl);
        }

        if (profileBannerUrl) {
          const newUrl = addCacheBuster(profileBannerUrl, timestamp);
          updateUrls.profileBannerUrl = newUrl;
          localStorage.setItem(`profileBanner-${user.uid}`, newUrl);
        }

        if (defaultProfileImageUrl) {
          const newUrl = addCacheBuster(defaultProfileImageUrl, timestamp);
          updateUrls.defaultProfileImageUrl = newUrl;
          localStorage.setItem(`defaultProfileImage-${user.uid}`, newUrl);
        }

        if (defaultProfileBannerUrl) {
          const newUrl = addCacheBuster(defaultProfileBannerUrl, timestamp);
          updateUrls.defaultProfileBannerUrl = newUrl;
          localStorage.setItem(`defaultProfileBanner-${user.uid}`, newUrl);
        }

        // Update Firestore with new URLs
        if (Object.keys(updateUrls).length > 0) {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, updateUrls);

          // Update Auth profile if needed
          if (updateUrls.profileImageUrl) {
            await getAuth().currentUser.updateProfile({
              photoURL: updateUrls.profileImageUrl,
            });
          }
        }
      }

      // Refresh data
      await fetchImageData();
    } catch (error) {
      console.error("Error syncing images:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const clearCache = () => {
    if (!user) return;

    // Clear localStorage entries
    localStorage.removeItem(`profileImage-${user.uid}`);
    localStorage.removeItem(`profileBanner-${user.uid}`);
    localStorage.removeItem(`defaultProfileImage-${user.uid}`);
    localStorage.removeItem(`defaultProfileBanner-${user.uid}`);

    // Clear sessionStorage if it exists
    sessionStorage.removeItem(`profileImage-${user.uid}`);
    sessionStorage.removeItem(`profileBanner-${user.uid}`);

    // Refresh data
    fetchImageData();
  };

  const addCacheBuster = (url, timestamp) => {
    const urlObj = new URL(url);
    urlObj.searchParams.set("t", timestamp);
    return urlObj.toString();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Please sign in to use this debug page</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Profile Image Debug</h1>

      <div className="mb-4 flex space-x-4">
        <button
          onClick={fetchImageData}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Refresh Data
        </button>

        <button
          onClick={forceImageSync}
          disabled={refreshing}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          {refreshing ? "Syncing..." : "Force Image Sync"}
        </button>

        <button
          onClick={clearCache}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Clear Local Cache
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auth data */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Auth Profile Photo</h2>
          {imageData.auth ? (
            <div>
              <div className="w-32 h-32 border rounded-full overflow-hidden mb-2">
                <img
                  src={imageData.auth}
                  alt="Auth profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-sm break-all mt-2">{imageData.auth}</div>
            </div>
          ) : (
            <div className="text-gray-500">No auth profile photo</div>
          )}
        </div>

        {/* Firestore data */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Firestore Data</h2>
          {imageData.firestore ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Profile Image</h3>
                {imageData.firestore.profileImageUrl ? (
                  <div>
                    <div className="w-24 h-24 border rounded-full overflow-hidden mb-2">
                      <img
                        src={imageData.firestore.profileImageUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-xs break-all">
                      {imageData.firestore.profileImageUrl}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">Not set</div>
                )}
              </div>

              <div>
                <h3 className="font-medium">Profile Banner</h3>
                {imageData.firestore.profileBannerUrl ? (
                  <div>
                    <div className="w-full h-24 border overflow-hidden mb-2">
                      <img
                        src={imageData.firestore.profileBannerUrl}
                        alt="Banner"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-xs break-all">
                      {imageData.firestore.profileBannerUrl}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">Not set</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-gray-500">No Firestore data</div>
          )}
        </div>

        {/* LocalStorage data */}
        <div className="border rounded-lg p-4 md:col-span-2">
          <h2 className="text-lg font-semibold mb-3">LocalStorage Data</h2>
          {imageData.localStorage &&
            (Object.keys(imageData.localStorage).some(
              (key) => imageData.localStorage[key]
            ) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {imageData.localStorage.profileImageUrl && (
                  <div>
                    <h3 className="font-medium">
                      Profile Image (LocalStorage)
                    </h3>
                    <div className="w-24 h-24 border rounded-full overflow-hidden mb-2">
                      <img
                        src={imageData.localStorage.profileImageUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-xs break-all">
                      {imageData.localStorage.profileImageUrl}
                    </div>
                  </div>
                )}

                {imageData.localStorage.profileBannerUrl && (
                  <div>
                    <h3 className="font-medium">
                      Profile Banner (LocalStorage)
                    </h3>
                    <div className="w-full h-24 border overflow-hidden mb-2">
                      <img
                        src={imageData.localStorage.profileBannerUrl}
                        alt="Banner"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-xs break-all">
                      {imageData.localStorage.profileBannerUrl}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500">No image data in localStorage</div>
            ))}
        </div>
      </div>
    </div>
  );
}
