
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Map from "./pages/Map";
import Contact from "./pages/Contact"
import NotFound from "./pages/NotFound";
import AboutPage from "./pages/AboutPage";
import { useEffect } from "react";
import ScrollToTop from "./components/ScrollToTop";

const queryClient = new QueryClient();

const App = () => {
  // Check for user preference on dark mode
  // useEffect(() => {
  //   if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  //     document.documentElement.classList.add("dark");
  //   }

  //   // Listen for changes to the prefers-color-scheme media query
  //   const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  //   const handleChange = (e: MediaQueryListEvent) => {
  //     if (e.matches) {
  //       document.documentElement.classList.add("dark");
  //     } else {
  //       document.documentElement.classList.remove("dark");
  //     }
  //   };

  //   mediaQuery.addEventListener("change", handleChange);
  //   return () => mediaQuery.removeEventListener("change", handleChange);
  // }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" closeButton richColors />
        <BrowserRouter>
        <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/map" element={<Map />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<AboutPage />} />

          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
