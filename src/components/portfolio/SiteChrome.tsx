import { ArrowUpRight, Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { profile } from "@/data/profile";

const STORAGE_KEY = "henry-theme";

/**
 * Theme lives in one place so every page shares it. The initial value is read
 * synchronously so there is no flash of the wrong theme on a hard navigation.
 */
export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    try {
      window.localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
    } catch {
      // Theme still works for the current page when storage is unavailable.
    }
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((current) => !current) };
}

const navItems = [
  { label: "Work", to: "/projects" },
  { label: "Compare", to: "/compare" },
  { label: "About", to: "/#about" },
  { label: "Approach", to: "/#approach" },
  { label: "Contact", to: "/#contact" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [scrolled, setScrolled] = useState(
    () => typeof window !== "undefined" && window.scrollY > 24,
  );
  const { isDark, toggle } = useTheme();
  const location = useLocation();

  const currentFor = (to: string): "page" | "location" | undefined => {
    if (to === "/projects") {
      return location.pathname === "/projects" ||
        location.pathname.startsWith("/projects/")
        ? "page"
        : undefined;
    }

    if (to === "/compare") {
      return location.pathname === "/compare" ? "page" : undefined;
    }

    const hash = to.startsWith("/#") ? to.slice(1) : "";
    return location.pathname === "/" && location.hash === hash
      ? "location"
      : undefined;
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  return (
    <header className={`site-nav ${scrolled ? "site-nav-scrolled" : ""}`}>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <div className="mx-auto flex max-w-[1380px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
        <Link to="/" className="group flex items-center gap-3" aria-label={`${profile.name} — home`}>
          <span className="monogram">{profile.monogram}</span>
          <span className="hidden text-sm font-semibold tracking-tight sm:block">
            {profile.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="nav-link"
              aria-current={currentFor(item.to)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggle}
            aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <button
            ref={menuButtonRef}
            type="button"
            className="icon-button md:hidden"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-nav"
          className="border-t border-border px-5 pb-5 pt-2 md:hidden"
          aria-label="Mobile"
        >
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="mobile-nav-link"
              onClick={() => setMenuOpen(false)}
              aria-current={currentFor(item.to)}
            >
              {item.label}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1380px] flex-col gap-8 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
        <div>
          <Link
            to="/"
            className="inline-flex items-center py-1 text-sm font-semibold tracking-tight"
          >
            {profile.name}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">{profile.statement}</p>
        </div>
        {/*
          These are links, so WCAG 2.2 SC 2.5.8 applies: a 12px text link with
          no padding is ~16px tall. `py-1.5` plus `inline-flex` brings every
          footer link over the 24px floor without changing the type or the
          visual rhythm — the extra space comes from padding, not from making
          the text bigger.
        */}
        <nav
          className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground"
          aria-label="Footer"
        >
          <Link to="/projects" className="inline-flex items-center py-1.5 hover:text-foreground">
            All work
          </Link>
          <Link to="/compare" className="inline-flex items-center py-1.5 hover:text-foreground">
            Compare
          </Link>
          <Link to="/#about" className="inline-flex items-center py-1.5 hover:text-foreground">
            About
          </Link>
          <Link to="/#contact" className="inline-flex items-center py-1.5 hover:text-foreground">
            Contact
          </Link>
          <a
            href={profile.contact.github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center py-1.5 hover:text-foreground"
          >
            GitHub
          </a>
        </nav>
        <p className="text-xs text-muted-foreground">© {year}</p>
      </div>
    </footer>
  );
}
