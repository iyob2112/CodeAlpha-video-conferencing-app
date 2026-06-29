import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

  const { data: authData, isFetched } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          return { user: null, isAuthenticated: false };
        }

        const res = await axios.get("http://192.168.1.5:5000/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        return { user: res.data, isAuthenticated: true };
      } catch (error) {
        return { user: null, isAuthenticated: false };
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full text-center space-y-6">

        {/* 404 */}
        <div>
          <h1 className="text-7xl font-light text-slate-300">404</h1>
          <div className="h-0.5 w-16 bg-slate-200 mx-auto mt-2"></div>
        </div>

        {/* message */}
        <div className="space-y-3">
          <h2 className="text-2xl font-medium text-slate-800">
            Page Not Found
          </h2>

          <p className="text-slate-600">
            The page <span className="font-medium">"{pageName}"</span> was not found.
          </p>
        </div>

        {/* admin note */}
        {isFetched &&
          authData?.isAuthenticated &&
          authData?.user?.role === "admin" && (
            <div className="p-4 bg-slate-100 rounded-lg border text-left">
              <p className="text-sm font-medium text-slate-700">Admin Note</p>
              <p className="text-sm text-slate-600 mt-1">
                This page might not be implemented yet.
              </p>
            </div>
          )}

        {/* home button */}
        <button
          onClick={() => (window.location.href = "/")}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border rounded-lg hover:bg-slate-50"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}