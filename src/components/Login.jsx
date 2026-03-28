import { useEffect, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { supabase } from "../lib/supabaseClient";
import { PASSWORD_CHANGE_RELOGIN_NOTICE_KEY } from "../constants/auth";

export default function Login() {
  const defaultLoginLogoUrl =
    "https://flowbite.s3.amazonaws.com/blocks/marketing-ui/logo.svg";
  const [logoSrc, setLogoSrc] = useState(
    import.meta.env.VITE_LOGIN_LOGO_URL || defaultLoginLogoUrl
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginNotice, setLoginNotice] = useState("");

  useEffect(() => {
    const notice = sessionStorage.getItem(PASSWORD_CHANGE_RELOGIN_NOTICE_KEY);
    if (!notice) return;

    setLoginNotice(notice);
    sessionStorage.removeItem(PASSWORD_CHANGE_RELOGIN_NOTICE_KEY);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message || "Authentication failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="min-h-screen bg-gray-50">
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "#0f172a",
            color: "#f8fafc",
            border: "1px solid #dc2626",
          },
          error: {
            iconTheme: {
              primary: "#dc2626",
              secondary: "#f8fafc",
            },
          },
        }}
      />
      <div className="grid max-w-7xl px-4 py-8 mx-auto lg:gap-20 lg:py-16 lg:grid-cols-12">
        <div className="w-full place-self-center lg:col-span-6">
          <div className="p-6 mx-auto bg-white rounded-lg shadow sm:max-w-xl sm:p-8">
            <div className="inline-flex items-center mb-4 text-xl font-semibold text-gray-900">
              <img
                className="w-12 h-10 mr-2 rounded-lg"
                src={logoSrc}
                onError={() => setLogoSrc(defaultLoginLogoUrl)}
                alt="logo"
              />
              Raoelison Compte
            </div>

            <h1 className="mb-2 text-2xl font-bold leading-tight tracking-tight text-gray-900">
              Connexion
            </h1>
            <p className="text-sm font-light text-gray-500">
              Connectez-vous pour acceder a votre gestion de tresorerie.
            </p>
            {loginNotice && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {loginNotice}
              </div>
            )}

            <form className="mt-4 space-y-6 sm:mt-6" onSubmit={handleLogin}>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block mb-2 text-sm font-medium text-gray-900"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-slate-700 focus:border-slate-700 block w-full p-2.5"
                    placeholder="name@company.com"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block mb-2 text-sm font-medium text-gray-900"
                  >
                    Mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="********"
                      className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-slate-700 focus:border-slate-700 block w-full p-2.5 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-slate-900 transition-all hover:cursor-pointer"
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          className="w-5 h-5"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 3l18 18M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58M9.88 5.09A9.77 9.77 0 0112 4.8c4.8 0 8.7 3.6 9.8 7.2a10.94 10.94 0 01-3.32 4.93M6.23 6.23C4.15 7.56 2.63 9.63 2.2 12c.38 2.13 1.66 4.08 3.58 5.5A10.25 10.25 0 0012 19.2c1.56 0 3.04-.35 4.37-.97"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          className="w-5 h-5"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.2 12C3.3 8.4 7.2 4.8 12 4.8s8.7 3.6 9.8 7.2c-1.1 3.6-5 7.2-9.8 7.2S3.3 15.6 2.2 12z"
                          />
                          <circle cx="12" cy="12" r="2.5" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full text-white font-medium rounded-lg text-sm px-5 py-2.5 text-center hover:cursor-pointer ${
                  isSubmitting
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-slate-900 hover:bg-slate-800"
                }`}
              >
                {isSubmitting ? "Connexion..." : "Se connecter"}
              </button>
            </form>
          </div>
        </div>

        <div className="mr-auto place-self-center lg:col-span-6">
          <img
            className="hidden mx-auto lg:flex"
            src="https://flowbite.s3.amazonaws.com/blocks/marketing-ui/authentication/illustration.svg"
            alt="illustration"
          />
        </div>
      </div>
    </section>
  );
}
