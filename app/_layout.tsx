'use client'

import { useEffect, useState } from "react";
import { useRouter, Slot } from "expo-router";
import { useAuthStore } from "../store/auth";
import Loader from "../components/common/Loader";

export default function RootLayout() {
  const router = useRouter();
  const { user, loadUser } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return; // don't navigate yet
    }

    loadUser().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/pages/login"); // redirect if not logged in
      }
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  // Always render Slot! Even if user is null.
  return <Slot />;
}
