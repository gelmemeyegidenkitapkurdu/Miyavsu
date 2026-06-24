import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Sparkles } from '../components/ui/Sparkles';
import { useStore } from '../store/useStore';
import { LogIn, LogOut, User } from 'lucide-react';
import headerBg from '../assets/header-bg.jpg';

export const MainLayout = () => {
  const { isAdmin, logout, darkMode, adminProfile } = useStore();
  const location = useLocation();
  const siteTitle = 'GELMEMEYEGİDENKİTAPKURDU';

  // Initialize dark class from persisted state
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className={`min-h-screen font-serif relative overflow-x-hidden transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-pink-50/30 text-gray-800'}`}>
      
      {/* Header */}
      <header className={`relative backdrop-blur-sm shadow-sm z-10 transition-colors duration-300 ${darkMode ? 'bg-gray-800/90' : 'bg-white/90'}`}>
        <div className="container mx-auto px-4 py-6 flex flex-col items-center justify-center relative">
          
          {/* Admin Controls (Top Right) */}
          <div className="absolute top-4 right-4 flex gap-2 z-20">
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <Link to="/profile" className="p-2 hover:bg-pink-100 dark:hover:bg-gray-700 rounded-full transition-colors" title="Profili Düzenle">
                  <User size={20} className="text-pink-600" />
                </Link>
                <button onClick={() => void logout()} className="p-2 hover:bg-pink-100 dark:hover:bg-gray-700 rounded-full transition-colors" title="Çıkış Yap">
                  <LogOut size={20} className="text-pink-600" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="p-2 hover:bg-pink-100 dark:hover:bg-gray-700 rounded-full transition-colors" title="Admin Girişi">
                <LogIn size={20} className="text-pink-600" />
              </Link>
            )}
          </div>

          {/* Title Area */}
          <div className="relative w-full max-w-5xl mx-auto mb-8 rounded-3xl overflow-hidden shadow-xl min-h-[280px] flex flex-col items-center justify-center group">
            
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
              <img
                src={adminProfile.headerImage || headerBg}
                alt="Başlık Arka Planı"
                loading="eager"
                decoding="async"
                className="header-hero-image w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20"></div>
            </div>

            {/* Sparkles */}
            <div className="hidden sm:block">
              <Sparkles />
            </div>
            
            {/* Shine Strip Behind Text */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none hidden sm:block">
              <div className="absolute top-0 bottom-0 w-32 bg-gradient-to-r from-transparent via-white/60 to-transparent -skew-x-12 animate-shine blur-md" style={{ animationDuration: '2.4s' }}></div>
            </div>
            
            {/* Silver Title */}
            <div className="relative z-10 px-1 w-full text-center flex items-center justify-center h-full">
              <Link
                to="/"
                aria-label={siteTitle}
                className="hero-title-text hero-title-entry inline-block font-bold tracking-wide hover:scale-105 transition-transform duration-500"
                style={{
                  fontSize: 'clamp(0.85rem, 3.9vw, 3.7rem)',
                  lineHeight: '1.05',
                  width: '100%',
                  whiteSpace: 'nowrap',
                }}
              >
                {siteTitle.split('').map((letter, index) => (
                  <span
                    key={`${letter}-${index}`}
                    className="hero-title-letter"
                    style={{ animationDelay: `${index * 0.09}s` }}
                  >
                    {letter}
                  </span>
                ))}
              </Link>
              {/* White shimmer ribbon sweeping left→right across title */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
                <div
                  className="absolute top-0 bottom-0 animate-shimmer-ribbon"
                  style={{
                    width: '34%',
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.0) 8%, rgba(255,255,255,0.58) 50%, rgba(255,255,255,0.0) 92%, transparent 100%)',
                    filter: 'none',
                    left: '-38%',
                    animationDuration: '2.1s',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-wrap justify-center gap-3 md:gap-6 text-sm md:text-base font-medium relative z-20">
            {[
              { path: '/', label: 'Ana Sayfa' },
              { path: '/writings', label: 'Yazılar' },
              { path: '/books', label: 'Dergiler' },
              { path: '/suggestions', label: 'Öneriler' },
              { path: '/polls', label: 'Anketler' },
              { path: '/interviews', label: 'Röportajlar' },
            ].map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-full transition-all duration-300 ${
                  location.pathname === link.path
                    ? 'bg-pink-500 text-white shadow-lg transform -translate-y-1'
                    : darkMode
                      ? 'hover:bg-gray-700 text-gray-300 hover:text-pink-400'
                      : 'hover:bg-pink-50 text-gray-600 hover:text-pink-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative min-h-[calc(100vh-200px)]">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className={`backdrop-blur-sm py-6 mt-auto relative z-10 border-t transition-colors duration-300 ${darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-pink-100'}`}>
        <div className={`container mx-auto px-4 text-center text-sm transition-colors duration-300 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <p>© 2026 Gelmemeyegidenkitapkurdu. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
};