import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";

export default function Root() {
  useEffect(() => {
    // Set document metadata
    document.documentElement.lang = "pt-BR";
    document.title = "Organiza - Gestão Financeira Familiar";

    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Gerencie o orçamento da sua família de forma simples e eficiente com o Organiza. App PWA completo para gestão financeira pessoal e familiar.');

    // Add structured data
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (!existingScript) {
      const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Organiza - Gestão Financeira Familiar",
        "url": "https://organizagff.vercel.app/",
      };
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
  }, []);

  return (
    <>
      <main className="min-h-screen">
        <Outlet />
      </main>
      <Toaster />
    </>
  );
}