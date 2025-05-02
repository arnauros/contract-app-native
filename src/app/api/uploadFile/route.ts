import { NextResponse } from "next/server";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initFirebase } from "@/lib/firebase/init";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Initialize Firebase
    const app = initFirebase();
    const storage = getStorage(app);

    // Create a unique file name
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;

    // Create a reference to the file location
    const fileRef = ref(storage, `contracts/${fileName}`);

    // Convert File to Uint8Array for upload
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // Upload the file
    const snapshot = await uploadBytes(fileRef, uint8Array, {
      contentType: file.type,
    });

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return NextResponse.json({ url: downloadURL });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
