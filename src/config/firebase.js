import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAOBNQvG4rIHt3HDABgDCwykNtiHWUkB2Q",
  authDomain: "appmakeup-fd411.firebaseapp.com",
  projectId: "appmakeup-fd411",
  storageBucket: "appmakeup-fd411.firebasestorage.app",
  messagingSenderId: "159210914667",
  appId: "1:159210914667:web:15344bf3954362123dc22e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export { RecaptchaVerifier, signInWithPhoneNumber };
