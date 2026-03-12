import { Link, useNavigate } from 'react-router-dom';
import { Package, Phone, Mail, MapPin, Instagram, Facebook } from 'lucide-react';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { NavLink } from '../types/siteConfig';

export default function Footer() {
  const { config } = useSiteConfig();
  const { settings, navigation } = config;
  const navigate = useNavigate();

  const handleNavClick = (e: React.MouseEvent, link: NavLink) => {
    e.preventDefault();
    if (link.type === 'route') {
      navigate(link.target);
    } else if (link.type === 'scroll') {
      if (window.location.pathname !== '/') {
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

  return (
    <footer className="bg-surface-darker text-white relative overflow-hidden border-t border-white/5">
      {/* Decorative Blob */}
      <div className="blob-purple w-[600px] h-[600px] -left-64 -bottom-64 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 py-16 relative z-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt={settings.brand_name} className="h-12 object-contain" />
              ) : (
                <div className="w-12 h-12 bg-pakomi-purple border border-pakomi-glow/30 rounded-xl flex items-center justify-center shadow-glow">
                  <Package className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold tracking-wide">{settings.brand_name}</h2>
              </div>
            </Link>
            {navigation.footer_text && (
              <p className="text-gray-400 leading-relaxed mb-6">
                {/* Re-using footer_text directly as the brand bio for simplicity if available, or static fallback */}
                {settings.seo_description || 'منصة توفر أحدث حلول الطباعة والتغليف.'}
              </p>
            )}

            <div className="flex gap-4">
              {settings.social_links.instagram && (
                <a href={settings.social_links.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 bg-surface-dark border border-white/10 rounded-full flex items-center justify-center hover:bg-pakomi-purple hover:border-pakomi-glow hover:shadow-glow transition-all">
                  <Instagram className="w-5 h-5 text-gray-300 hover:text-white" />
                </a>
              )}
              {settings.social_links.facebook && (
                <a href={settings.social_links.facebook} target="_blank" rel="noreferrer" className="w-10 h-10 bg-surface-dark border border-white/10 rounded-full flex items-center justify-center hover:bg-pakomi-purple hover:border-pakomi-glow hover:shadow-glow transition-all">
                  <Facebook className="w-5 h-5 text-gray-300 hover:text-white" />
                </a>
              )}
              {/* Add TikTok or other social icons here using lucide if expanded later */}
            </div>
          </div>

          {/* Dynamic Links */}
          {navigation.footer_columns.map(column => (
            <div key={column.id}>
              <h3 className="font-bold text-lg mb-6">{column.title}</h3>
              <ul className="space-y-3">
                {column.links.map(link => (
                  <li key={link.id}>
                    <a href={link.target} onClick={(e) => handleNavClick(e, link)} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>

        {/* Contact Info */}
        <div className="border-t border-white/10 mt-12 pt-8">
          <div className="grid md:grid-cols-3 gap-6">
            {settings.contact_phone && (
              <a href={`tel:${settings.contact_phone.replace(/\s|-/g, '')}`} className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
                <Phone className="w-5 h-5 text-pakomi-glow" />
                <span dir="ltr">{settings.contact_phone}</span>
              </a>
            )}
            {settings.contact_email && (
              <a href={`mailto:${settings.contact_email}`} className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
                <Mail className="w-5 h-5 text-pakomi-glow" />
                <span>{settings.contact_email}</span>
              </a>
            )}
            <div className="flex items-center gap-3 text-gray-400">
              <MapPin className="w-5 h-5 text-pakomi-glow" />
              <span>الجزائر</span>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/10 mt-8 pt-8 text-center text-gray-500">
          <p>{navigation.footer_text || `© ${new Date().getFullYear()} ${settings.brand_name}. جميع الحقوق محفوظة.`}</p>
        </div>
      </div>
    </footer>
  );
}
