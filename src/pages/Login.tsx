import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { useStore } from "../store/useStore";

const GENERIC_AUTH_ERROR = "Giriş doğrulanamadı. Lütfen tekrar deneyin.";
const MIN_INTERACTION_DELAY_MS = 1200;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const resolveAuthMessage = (error: unknown) => {
  if (error instanceof Error && error.message.includes("Çok fazla deneme")) {
    return error.message;
  }

  return GENERIC_AUTH_ERROR;
};

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [pageReadyAt] = useState(() => Date.now());
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, verifyLoginCode, darkMode } = useStore();
  const navigate = useNavigate();

  const isAutomatedAttempt = () => {
    if (honeypot.trim().length > 0) return true;
    if (Date.now() - pageReadyAt < MIN_INTERACTION_DELAY_MS) return true;
    return false;
  };

  const handleCredentialsSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      if (isAutomatedAttempt()) {
        await wait(700);
        throw new Error(GENERIC_AUTH_ERROR);
      }

      const normalizedEmail = email.trim().toLowerCase();
      await login(normalizedEmail, password);
      setPendingEmail(normalizedEmail);
      setPendingPassword(password);
      setOtpStep(true);
      setSuccessMessage("Güvenlik doğrulamasına geçildi.");
    } catch (error) {
      setErrorMessage(resolveAuthMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      if (isAutomatedAttempt()) {
        await wait(700);
        throw new Error(GENERIC_AUTH_ERROR);
      }

      await verifyLoginCode(pendingEmail, pendingPassword, otpCode.trim());
      navigate("/profile", { replace: true });
    } catch (error) {
      setErrorMessage(resolveAuthMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetToCredentials = () => {
    setOtpStep(false);
    setOtpCode("");
    setPendingEmail("");
    setPendingPassword("");
    setErrorMessage("");
    setSuccessMessage("");
  };

  return (
    <div
      className={`max-w-md mx-auto p-8 rounded-2xl shadow-xl border border-pink-100 mt-12 transition-colors duration-300 ${
        darkMode ? "bg-gray-800 border-gray-700" : "bg-white"
      }`}
    >
      <h2
        className={`text-2xl font-bold text-center mb-8 transition-colors duration-300 ${
          darkMode ? "text-gray-100" : "text-gray-800"
        }`}
      >
        Yönetici Girişi
      </h2>

      {!otpStep ? (
        <form onSubmit={handleCredentialsSubmit} className="space-y-6" noValidate>
          <div className="sr-only" aria-hidden="true">
            <label htmlFor="contact-website">Website</label>
            <input
              id="contact-website"
              type="text"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div>
            <label
              className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              E-posta Adresi
            </label>
            <div className="relative">
              <Mail
                className={`absolute left-3 top-3 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                size={20}
              />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all ${
                  darkMode ? "bg-gray-700 border-gray-600 text-gray-200" : "border-gray-300"
                }`}
                placeholder="admin@example.com"
                autoComplete="username"
                maxLength={254}
                required
              />
            </div>
          </div>

          <div>
            <label
              className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Şifre
            </label>
            <div className="relative">
              <Lock
                className={`absolute left-3 top-3 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                size={20}
              />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all ${
                  darkMode ? "bg-gray-700 border-gray-600 text-gray-200" : "border-gray-300"
                }`}
                placeholder="Şifrenizi girin"
                autoComplete="current-password"
                maxLength={128}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-pink-600 text-white py-3 rounded-lg font-medium hover:bg-pink-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Kontrol ediliyor..." : "Devam Et"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit} className="space-y-6" noValidate>
          <div className="sr-only" aria-hidden="true">
            <label htmlFor="contact-website-code">Website</label>
            <input
              id="contact-website-code"
              type="text"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              darkMode
                ? "border-gray-600 bg-gray-700/50 text-gray-200"
                : "border-pink-200 bg-pink-50 text-pink-700"
            }`}
          >
            Şifre adımından sonra devam etmek için 6 haneli güvenlik kodunu girin.
          </div>

          <div>
            <label
              className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Güvenlik Kodu
            </label>
            <div className="relative">
              <ShieldCheck
                className={`absolute left-3 top-3 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                size={20}
              />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all tracking-[0.4em] ${
                  darkMode ? "bg-gray-700 border-gray-600 text-gray-200" : "border-gray-300"
                }`}
                placeholder="000000"
                required
                minLength={6}
                maxLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || otpCode.length !== 6}
            className="w-full bg-pink-600 text-white py-3 rounded-lg font-medium hover:bg-pink-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Doğrulanıyor..." : "Girişi Tamamla"}
          </button>

          <button
            type="button"
            onClick={resetToCredentials}
            disabled={isSubmitting}
            className={`w-full py-2 rounded-lg font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              darkMode
                ? "border-gray-600 text-gray-200 hover:bg-gray-700"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Geri Dön
          </button>
        </form>
      )}

      {successMessage ? (
        <div
          className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
            darkMode
              ? "border-emerald-700 bg-emerald-900/20 text-emerald-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
            darkMode ? "border-red-700 bg-red-900/20 text-red-300" : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
};
