import { useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShoppingBag, Search, Package, Clock, Truck, Shield } from 'lucide-react';
import { useSiteConfig } from '../hooks/useSiteConfig';

const ICON_MAP: Record<string, any> = { Package, Clock, Truck, Shield };

export default function HeroSection() {
    const { config } = useSiteConfig();
    const hero = config.homepage.hero;
    const statsVisible = config.homepage.stats_visible;
    const stats = config.homepage.stats || [];

    const containerRef = useRef<HTMLDivElement>(null);

    const rawX = useMotionValue(0.0);
    const rawY = useMotionValue(0.0);

    const springConfig = { stiffness: 35, damping: 22, mass: 1.4 };
    const orbX = useSpring(rawX, springConfig);
    const orbY = useSpring(rawY, springConfig);

    const orbXpx = useTransform(orbX, (v) => `calc(-50% + ${v * (typeof window !== 'undefined' ? window.innerWidth * 0.55 : 400)}px)`);
    const orbYpx = useTransform(orbY, (v) => `calc(-50% + ${v * (typeof window !== 'undefined' ? window.innerHeight * 0.45 : 250)}px)`);

    const textSpring = { stiffness: 12, damping: 28, mass: 2.5 };
    const textX = useSpring(rawX, textSpring);
    const textY = useSpring(rawY, textSpring);
    const textXpx = useTransform(textX, (v) => `${v * -20}px`);
    const textYpx = useTransform(textY, (v) => `${v * -14}px`);

    const orbX2 = useTransform(orbX, (v) => `calc(-50% + ${v * (typeof window !== 'undefined' ? window.innerWidth * 0.4 : 300)}px)`);
    const orbY2 = useTransform(orbY, (v) => `calc(-50% + ${v * (typeof window !== 'undefined' ? window.innerHeight * 0.35 : 200)}px)`);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        rawX.set((e.clientX - rect.left - rect.width / 2) / rect.width);
        rawY.set((e.clientY - rect.top - rect.height / 2) / rect.height);
    }, [rawX, rawY]);

    const handleMouseLeave = useCallback(() => {
        rawX.set(0);
        rawY.set(0);
    }, [rawX, rawY]);

    return (
        <section
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative overflow-hidden min-h-[92vh] flex items-center select-none"
            style={{
                background: hero.background_url ? `url(${hero.background_url}) center/cover no-repeat` : 'linear-gradient(155deg, #060A12 0%, #09061A 50%, #060A12 100%)'
            }}
        >
            {/* Dark overlay if using bg image */}
            {hero.background_url && <div className="absolute inset-0 bg-black/60 pointer-events-none" />}

            {/* LAYER A */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[15%] w-[55vw] h-[55vh] rounded-full"
                    style={{ background: 'radial-gradient(ellipse, rgba(102,45,145,0.25) 0%, transparent 70%)', filter: 'blur(90px)' }} />
                <div className="absolute bottom-[-5%] right-[10%] w-[40vw] h-[35vh] rounded-full"
                    style={{ background: 'radial-gradient(ellipse, rgba(75,31,111,0.15) 0%, transparent 70%)', filter: 'blur(110px)' }} />
            </div>

            {/* LAYER B */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="blob-purple animate-blob"
                    style={{ width: 680, height: 680, top: '-180px', right: '-120px', opacity: 0.10, animationDuration: '20s' }} />
                <div className="blob-purple animate-blob"
                    style={{ width: 480, height: 480, bottom: '-80px', left: '-80px', opacity: 0.07, animationDuration: '24s', animationDelay: '5s', background: 'radial-gradient(circle, #8A4DCC, transparent 70%)' }} />
                <div className="blob-purple animate-blob"
                    style={{ width: 350, height: 350, top: '40%', left: '38%', opacity: 0.055, animationDuration: '28s', animationDelay: '10s', background: 'radial-gradient(circle, #6366f1, transparent 70%)' }} />
            </div>

            {/* LAYER C — Cursor orbs */}
            <motion.div aria-hidden="true" className="absolute pointer-events-none hidden md:block"
                style={{ width: 680, height: 680, borderRadius: '50%', background: 'radial-gradient(circle, rgba(138,77,204,0.22) 0%, rgba(102,45,145,0.11) 38%, transparent 70%)', filter: 'blur(65px)', left: '50%', top: '50%', translateX: orbXpx, translateY: orbYpx, mixBlendMode: 'screen' }} />
            <motion.div aria-hidden="true" className="absolute pointer-events-none hidden md:block"
                style={{ width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.28) 0%, rgba(138,77,204,0.06) 60%, transparent 80%)', filter: 'blur(35px)', left: '50%', top: '50%', translateX: orbX2, translateY: orbY2, mixBlendMode: 'screen' }} />

            {/* LAYER D — Grain */}
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '140px 140px' }} />

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 w-full relative z-10">
                <div className={`grid ${statsVisible ? 'lg:grid-cols-2' : ''} gap-16 items-center py-28 md:py-36`}>

                    {/* Left — dynamic hero text */}
                    <motion.div style={{ x: textXpx, y: textYpx }} className={!statsVisible ? 'max-w-3xl mx-auto text-center' : ''}>
                        {hero.badge_text && (
                            <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                                className={`inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full text-sm font-semibold mb-8 text-pakomi-glow border-pakomi-glow/30 shadow-[0_0_18px_rgba(138,77,204,0.15)] ${!statsVisible ? 'mx-auto' : ''}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-pakomi-glow animate-pulse" />
                                {hero.badge_text}
                            </motion.span>
                        )}

                        <motion.h1 initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.1 }}
                            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
                            {hero.title}
                        </motion.h1>

                        {hero.subtitle && (
                            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.2 }}
                                className={`text-lg md:text-xl text-gray-400 mb-10 max-w-xl leading-relaxed ${!statsVisible ? 'mx-auto' : ''}`}>
                                {hero.subtitle}
                            </motion.p>
                        )}

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.32 }}
                            className={`flex flex-wrap gap-4 ${!statsVisible ? 'justify-center' : ''}`}>
                            {hero.primary_cta_label && (
                                <Link to={hero.primary_cta_link || '/products'}
                                    className="inline-flex items-center gap-2.5 font-bold px-8 py-4 rounded-2xl text-base text-white bg-gradient-to-r from-[#662D91] to-[#8A4DCC] shadow-[0_0_28px_rgba(138,77,204,0.45)] hover:shadow-[0_0_45px_rgba(138,77,204,0.75)] hover:scale-105 active:scale-95 transition-all duration-200 border border-pakomi-glow/25">
                                    <ShoppingBag className="w-5 h-5" />
                                    {hero.primary_cta_label}
                                </Link>
                            )}
                            {hero.secondary_cta_label && (
                                <Link to={hero.secondary_cta_link || '/track'}
                                    className="inline-flex items-center gap-2.5 font-semibold px-8 py-4 rounded-2xl text-base text-gray-300 hover:text-white border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/8 transition-all duration-200">
                                    <Search className="w-5 h-5" />
                                    {hero.secondary_cta_label}
                                </Link>
                            )}
                        </motion.div>
                    </motion.div>

                    {/* Right — dynamic stat cards */}
                    {statsVisible && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.85, ease: 'easeOut', delay: 0.25 }}
                            className="hidden lg:block relative">
                            <div className="absolute inset-0 rounded-full opacity-25"
                                style={{ background: 'radial-gradient(ellipse, #662D91 0%, transparent 67%)', filter: 'blur(70px)' }} />
                            <div className="grid grid-cols-2 gap-6 relative z-10">
                                {stats.map((stat, idx) => {
                                    const Icon = ICON_MAP[stat.icon_name] || Package;
                                    const isOffset = idx % 2 === 1;
                                    return (
                                        <motion.div key={stat.id || idx}
                                            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: isOffset ? 28 : 0 }}
                                            transition={{ delay: 0.35 + idx * 0.12, duration: 0.65, ease: 'easeOut' }}
                                            className="glass-card p-7 text-center animate-float group hover:border-pakomi-purple/50 hover:shadow-[0_0_25px_rgba(102,45,145,0.2)] transition-all duration-300"
                                            style={{ animationDelay: `${idx}s` }}>
                                            <div className="w-12 h-12 mx-auto mb-4 bg-pakomi-purple/12 rounded-2xl flex items-center justify-center border border-pakomi-purple/20 group-hover:bg-pakomi-purple/22 group-hover:border-pakomi-glow/35 transition-all duration-300">
                                                <Icon className="w-5 h-5 text-pakomi-glow" />
                                            </div>
                                            <p className="text-3xl font-bold mb-1 text-white">{stat.value}</p>
                                            <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                </div>
            </div>
        </section>
    );
}
