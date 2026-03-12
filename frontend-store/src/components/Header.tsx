import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Menu, X, Phone, Package, Search } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { NavLink } from '../types/siteConfig';

export default function Header() {
  const { config } = useSiteConfig();
  const { settings, navigation } = config;
  const announcementBar = settings.announcement_visible ? settings.announcement_text : '';

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const cartItems = useCartStore((state) => state.items);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (link: NavLink) => {
    setIsMobileMenuOpen(false);
    if (link.type === 'route') {
      navigate(link.target);
    } else if (link.type === 'scroll') {
      if (location.pathname !== '/') {
        // Navigate to home then scroll
        navigate('/' + link.target);
      } else {
        const element = document.querySelector(link.target || '');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else if (link.type === 'slug') {
      navigate('/pages/' + link.target);
    } else if (link.type === 'external') {
      window.open(link.target, '_blank');
    }
  };

  const isActive = (link: NavLink) => {
    if (link.type === 'route') return location.pathname === link.target;
    if (link.type === 'slug') return location.pathname === `/pages/${link.target}`;
    return false;
  };

  const standardLinks = navigation.header_links.filter(l => !l.is_cta);
  const ctaLinks = navigation.header_links.filter(l => l.is_cta);

  return (
    <>
      {/* Announcement bar — hidden if empty */}
      {announcementBar && (
        <div className="bg-gradient-to-r from-pakomi-deep via-pakomi-purple to-pakomi-deep text-white text-sm py-2 text-center font-medium tracking-wide">
          {announcementBar}
        </div>
      )}

      {/* Floating Navbar Wrapper */}
      <div
        className={`sticky top-0 z-50 transition-all duration-500 ${isScrolled ? 'py-2' : 'py-4'
          }`}
      >
        {/* Floating pill container */}
        <div className="max-w-6xl mx-auto px-4">
          <header
            className={`
              relative flex items-center justify-between
              px-4 md:px-6
              rounded-2xl
              border border-white/10
              transition-all duration-500
              ${isScrolled
                ? 'h-14 bg-[#0b0d1a]/95 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5),0_0_0_1px_rgba(138,77,204,0.15)] border-pakomi-purple/20'
                : 'h-16 bg-[#0b0d1a]/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.4),0_0_0_1px_rgba(138,77,204,0.1)]'
              }
            `}
          >
            {/* Purple glow edge effect */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pakomi-glow/40 to-transparent rounded-t-2xl pointer-events-none" />

            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 shrink-0">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt={settings.brand_name} className={`object-contain transition-all duration-300 ${isScrolled ? 'h-8' : 'h-10'}`} />
              ) : (
                <div className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-pakomi-purple to-pakomi-deep border border-pakomi-glow/30 shadow-[0_0_12px_rgba(138,77,204,0.4)] transition-all duration-300 ${isScrolled ? 'w-8 h-8' : 'w-10 h-10'}`}>
                  <Package className={`text-white transition-all duration-300 ${isScrolled ? 'w-4 h-4' : 'w-5 h-5'}`} />
                </div>
              )}
              <div className="hidden sm:block">
                <span className={`font-bold text-white tracking-wide block leading-none transition-all duration-300 ${isScrolled ? 'text-base' : 'text-lg'}`}>{settings.brand_name || 'Pakomi'}</span>
                {/* Could map tagline here later, but keeping static text to preserve design for now if desired, or omitting */}
              </div>
            </Link>

            {/* Desktop Navigation — centered */}
            <nav className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
              {standardLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link)}
                  className={`relative px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 group ${isActive(link)
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                    }`}
                >
                  {/* Active / hover glow pill */}
                  {isActive(link) && (
                    <span className="absolute inset-0 bg-pakomi-purple/20 border border-pakomi-purple/30 rounded-xl shadow-[0_0_10px_rgba(138,77,204,0.2)]" />
                  )}
                  <span className="absolute inset-0 bg-white/0 group-hover:bg-white/5 rounded-xl transition-all duration-200" />
                  <span className="relative">{link.label}</span>
                </button>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Phone — desktop only */}
              {settings.contact_phone && (
                <a
                  href={`tel:${settings.contact_phone.replace(/\s|-/g, '')}`}
                  className="hidden md:flex items-center gap-1.5 text-xs text-gray-400 hover:text-pakomi-glow transition-colors px-3 py-2"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span dir="ltr" className="font-mono">{settings.contact_phone}</span>
                </a>
              )}

              {/* Track order — desktop */}
              <Link
                to="/track"
                className="hidden md:flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-white border border-white/10 hover:border-pakomi-glow/40 hover:bg-pakomi-purple/10 px-3 py-1.5 rounded-xl transition-all duration-200"
              >
                <Search className="w-3.5 h-3.5" />
                <span>تتبع</span>
              </Link>

              {/* Cart */}
              <Link
                to="/cart"
                className="relative p-2 bg-white/5 border border-white/10 hover:border-pakomi-glow/40 hover:bg-pakomi-purple/10 rounded-xl transition-all duration-200"
              >
                <ShoppingBag className="w-4 h-4 text-gray-300" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-pakomi-glow text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(138,77,204,0.6)]">
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* CTAs */}
              <div className="hidden sm:flex items-center gap-2">
                {ctaLinks.map(cta => (
                  <button
                    key={cta.id}
                    onClick={() => handleNavClick(cta)}
                    className="flex items-center gap-2 bg-gradient-to-r from-pakomi-purple to-pakomi-glow text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-[0_0_20px_rgba(138,77,204,0.35)] hover:shadow-[0_0_30px_rgba(138,77,204,0.6)] hover:scale-105 active:scale-95 transition-all duration-200 border border-pakomi-glow/30"
                  >
                    {cta.label}
                  </button>
                ))}
              </div>

              {/* Hamburger */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 bg-white/5 border border-white/10 hover:border-pakomi-glow/40 rounded-xl transition-all"
              >
                {isMobileMenuOpen
                  ? <X className="w-4 h-4 text-gray-300" />
                  : <Menu className="w-4 h-4 text-gray-300" />
                }
              </button>
            </div>
          </header>

          {/* Mobile menu dropdown */}
          {isMobileMenuOpen && (
            <div className="lg:hidden mt-2 rounded-2xl bg-[#0b0d1a]/95 backdrop-blur-2xl border border-pakomi-purple/20 shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden">
              <nav className="flex flex-col p-3 space-y-1">
                {standardLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => handleNavClick(link)}
                    className={`text-right py-3 px-4 rounded-xl font-medium transition-colors text-sm ${isActive(link)
                      ? 'text-white bg-pakomi-purple/20 border border-pakomi-purple/30'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    {link.label}
                  </button>
                ))}

                <Link
                  to="/track"
                  className="text-right py-3 px-4 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl font-medium transition-colors text-sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  تتبع الطلب
                </Link>

                {ctaLinks.map(cta => (
                  <button
                    key={cta.id}
                    onClick={() => handleNavClick(cta)}
                    className="mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-pakomi-purple to-pakomi-glow text-white text-sm font-semibold px-4 py-3 rounded-xl"
                  >
                    {cta.label}
                  </button>
                ))}

                {settings.contact_phone && (
                  <a
                    href={`tel:${settings.contact_phone.replace(/\s|-/g, '')}`}
                    className="flex items-center justify-center gap-2 py-3 px-4 text-pakomi-glow font-medium text-sm"
                  >
                    <Phone className="w-4 h-4" />
                    <span dir="ltr">{settings.contact_phone}</span>
                  </a>
                )}
              </nav>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
