import { GoogleAuthProvider, User, signInWithPopup } from "firebase/auth";
import { FirebaseSDK, getFirebaseAuth } from "../service/firebase";
import { useEffect, useMemo, useState } from "react";
import store, { useAppDispatch, useAppSelector } from "../redux/store";
import { usePathname, useRouter } from "next/navigation";
import { MyServerApi, SERVER_API_ENDPOINTS } from "../service/MyServerApi";
import { User as IUser } from "@prisma/client";
import {
  setAuthLoading,
  setAuthType,
  setRefUser,
  setUser,
} from "../redux/auth/auth.slice";
import { APP_ROUTES } from "../constants/appInfo";
interface UserData {
  data: {
    user: IUser;
  };
}

export const useAuthSession = (initialize?: boolean) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const path = usePathname();
  const { authType, user, refUser, loading } = useAppSelector(
    (state) => state.auth
  );
  const app = useMemo(
    () =>
      path.startsWith(APP_ROUTES.referrals)
        ? "referrals"
        : path.startsWith(APP_ROUTES.dashboard)
        ? "dashboard"
        : "home",
    [path]
  );

  const googleSignIn = async (): Promise<User> => {
    const provider = FirebaseSDK.getGoogleAuthProvider();
    dispatch(setAuthLoading(true));
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
          const email = error.customData.email;
          // The AuthCredential type that was used.
          const credential = GoogleAuthProvider.credentialFromError(error);
          console.log("google sign in error", errorCode, errorMessage, email);
          reject(error);
        });
    });
  };

  const signInReferralWithSocial = async (): Promise<void> => {
    try {
      dispatch(setRefUser(null));
      dispatch(setAuthType("referral"));
      const user = await googleSignIn();
      //console.log("user", user);
      if (!user || !user.email) throw new Error("User email is empty");

      //router.push(APP_ROUTES.referralsDashboard);
    } catch (error) {
      console.error(error);
    }
  };

  const signInWithSocial = async (): Promise<void> => {
    try {
      dispatch(setUser(null));
      dispatch(setAuthType("payzone"));
      const user = await googleSignIn();

      if (!user || !user.email) throw new Error("User email is empty");
    } catch (error) {
      console.error(error);
    }
  };

  const signOut = () => {
    getFirebaseAuth().signOut();
    if (app === "referrals") {
      dispatch(setRefUser(null));
      router.push(APP_ROUTES.referrals);
    } else {
      dispatch(setUser(null));
      router.push(APP_ROUTES.home);
    }
    //dispatch(setAuthType(null));
  };

  useEffect(() => {
    if (!initialize) return;

    const handleUser = async (user: User | null) => {
      console.log("handle user", user);
      dispatch(setAuthLoading(false));
      if (!user) {
        dispatch(setUser(null));
        dispatch(setAuthType(null));

        if (path.startsWith(APP_ROUTES.referrals)) {
          router.push(APP_ROUTES.referrals);
          return;
        }

        if (path.startsWith(APP_ROUTES.dashboard)) {
          router.push(APP_ROUTES.home);
          return;
        }

        router.push(APP_ROUTES.home);
      } else {
        const _user = store.getState().auth.user;
        const ref_user = store.getState().auth.refUser;
        try {
          if (!user.email) throw new Error("User email is empty");
          // REFERAL SIGNIN CASE
          if (path.startsWith(APP_ROUTES.referrals)) {
            console.log("isReferral APP");
            if (path === APP_ROUTES.referrals && ref_user) {
              router.push(APP_ROUTES.referralsDashboard);
              return;
            }

            const data = {
              email: user.email,
              avatar: user.photoURL,
              name: user.displayName,
            };

            if (ref_user) return;

            //sign up new ref User
            const userData: UserData = (await MyServerApi.postData(
              SERVER_API_ENDPOINTS.referralsSignup,
              data
            )) as UserData;
            console.log("userData", userData);
            if (userData.data.user) {
              dispatch(setRefUser(userData.data.user));
              router.push(APP_ROUTES.referralsDashboard);
            } else router.push(APP_ROUTES.home);
            return;
          }

          console.log("isPayzone APP", _user);
          if (path === APP_ROUTES.home && _user) {
            router.push(APP_ROUTES.dashboard);
            return;
          }

          if (_user) return;
          // path starts with home or dashboard
          const userData = (await MyServerApi.getUserData(
            user.email
          )) as UserData;
          //console.log("userData", userData);
          if (userData.data.user) {
            dispatch(setUser(userData.data.user));
            if (!path.startsWith(APP_ROUTES.dashboardHome))
              router.push(APP_ROUTES.dashboard);
          } else {
            // not signed in.
            if (path.startsWith(APP_ROUTES.dashboardHome)) {
              dispatch(setUser(null));
              router.push(APP_ROUTES.home);
              return;
            }
          }
          dispatch(setAuthLoading(false));
        } catch (error) {
          console.error(error);
        }
      }
    };

    localStorage.setItem(
      "token",
      process.env.NEXT_PUBLIC_PAYZONE_API_KEY
        ? process.env.NEXT_PUBLIC_PAYZONE_API_KEY
        : ""
    );

    const unsubscribe = getFirebaseAuth().onAuthStateChanged(handleUser);

    return () => unsubscribe();
  }, [initialize, dispatch, path, router]);

  useEffect(() => {
    if (user) {
      if (!path.startsWith(APP_ROUTES.dashboardHome))
        router.push(APP_ROUTES.dashboard);
    }
  }, [user, path, router]);

  return {
    app,
    authStatus: loading
      ? "authenticating"
      : app == "referrals"
      ? refUser
        ? "authenticated"
        : "unauthenticated"
      : app == "dashboard"
      ? user
        ? "authenticated"
        : "unauthenticated"
      : "unauthenticated",
    user: app == "referrals" ? refUser : user,
    signInWithSocial,
    signOut,
    loading,
    signInReferralWithSocial,
  };
};
