import React, { useState, useEffect } from "react";
import { Lock, KeyRound, ShieldCheck, ArrowRight, RefreshCw, AlertTriangle, Eye, EyeOff } from "lucide-react";

interface PasswordAuthModalProps {
  onAuthenticated: () => void;
}

export const PasswordAuthModal: React.FC<PasswordAuthModalProps> = ({ onAuthenticated }) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDefaultNotice, setIsDefaultNotice] = useState(false);

  useEffect(() => {
    // Check if session token exists
    const savedToken = sessionStorage.getItem("st_server_auth_token");
    if (savedToken === "authenticated") {
      onAuthenticated();
      return;
    }

    // Check status
    fetch("/api/auth/status")
      .then(res => res.json())
      .then(data => {
        if (!data.requirePasswordAuth) {
          sessionStorage.setItem("st_server_auth_token", "authenticated");
          onAuthenticated();
        } else if (data.isDefaultPassword) {
          setIsDefaultNotice(true);
        }
      })
      .catch(() => {});
  }, [onAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem("st_server_auth_token", "authenticated");
        onAuthenticated();
      } else {
        setError(data.error || "Неверный пароль доступа к панели управления");
      }
    } catch (err: any) {
      setError("Ошибка проверки соединения с сервером");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#06080e]/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0d121f] border border-cyan-500/30 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 text-cyan-300 shadow-lg">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
            Безопасный доступ по IP-адресу
          </h2>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            S&T Indicator Studio & DeepSeek Gold Server защищен мастер-паролем для прямого входа по IP без домена
          </p>
        </div>

        {isDefaultNotice && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Пароль по умолчанию: </span>
              <code className="bg-black/60 px-1.5 py-0.5 rounded font-mono text-white">admin123</code>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                (Вы сможете легко изменить его в настройках сервера после входа)
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1.5 flex items-center justify-between">
              <span>Введите пароль сервера:</span>
              <KeyRound className="h-3.5 w-3.5 text-cyan-400" />
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль..."
                autoFocus
                className="w-full bg-black/60 border border-gray-700 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-white transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/40 text-xs text-red-300 text-center font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-cyan-600/25 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>Войти в Панель Управления</span>
                <ArrowRight className="h-4 w-4 opacity-75" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-[11px] text-gray-500">
          Смена пароля доступна в конфигурационном файле <code className="text-gray-400">.env</code> (ADMIN_PASSWORD)
        </div>
      </div>
    </div>
  );
};
