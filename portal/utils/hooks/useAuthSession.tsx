import { GoogleAuthProvider, User, signInWithPopup, signOut } from "firebase/auth"
import { FirebaseSDK } from "../services/firebase";

export const useAuthSession = () => {
    const signInWithSocial = () : Promise<User> => {
      const provider = FirebaseSDK.getGoogleAuthProvider();
      
      return new Promise((resolve, reject) => {
        signInWithPopup(FirebaseSDK.getFirebaseAuth(), provider)
        .then((result) => {
          // This gives you a Google Access Token. You can use it to access the Google API.
          const credential = GoogleAuthProvider.credentialFromResult(result);
          const token = credential?.accessToken;
          const user = result.user;
          resolve(user);
        })
        .catch((error) => {
          // Handle Errors here.
          const errorCode = error.code;
          const errorMessage = error.message;
          // The email of the user's account used.
          const email = error.customData?.email;
          // The AuthCredential type that was used.
          const credential = GoogleAuthProvider.credentialFromError(error);
          console.log("google sign in error", errorCode, errorMessage, email);
          reject(error);
        });
      })
    }

    /**
     * Opens the Google account chooser and returns a Firebase ID token for the
     * chosen account. The server verifies the token; the Firebase session
     * itself is not kept.
     */
    const getGoogleIdToken = async (): Promise<string> => {
      const user = await signInWithSocial();
      const idToken = await user.getIdToken();
      await signOut(FirebaseSDK.getFirebaseAuth()).catch(() => undefined);
      return idToken;
    }
      
    return { signInWithSocial, getGoogleIdToken }
}
