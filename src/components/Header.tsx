
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, BarChart, Map, Home, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/', icon: <Home className="h-4 w-4 mr-1.5" /> },
    { name: 'Dashboard', path: '/dashboard', icon: <BarChart className="h-4 w-4 mr-1.5" /> },
    { name: 'Map', path: '/map', icon: <Map className="h-4 w-4 mr-1.5" /> },
    { name: 'About', path: '/about', icon: <Info className="h-4 w-4 mr-1.5" /> },
  ];

  // Handle scroll events for header transparency
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when changing routes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out px-6 md:px-8 py-3',
        {
          'bg-white/80 backdrop-blur-lg shadow-sm': isScrolled,
          'bg-transparent': !isScrolled,
        }
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link 
          to="/" 
          className="flex items-center space-x-2 text-primary transition-opacity hover:opacity-80"
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <div className="w-5 h-5 rounded-full bg-primary animate-pulse-slow"></div>
          </div>
          <span className="font-medium text-lg tracking-tight">ClearSkies AQ</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                location.pathname === item.path
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-secondary text-foreground/70 hover:text-foreground'
              )}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Mobile Navigation Button */}
        <button
          className="md:hidden rounded-lg p-2 text-foreground hover:bg-secondary"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white/95 backdrop-blur-lg border-b border-border shadow-lg animate-slide-down md:hidden">
          <nav className="max-w-7xl mx-auto py-3 px-6">
            <div className="flex flex-col space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    location.pathname === item.path
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-secondary text-foreground/70 hover:text-foreground'
                  )}
                >
                  {item.icon}
                  {item.name}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
