import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

export default function Root() {
  useEffect(() => {
    // Set page title
    document.title = "Organiza - Gestão Financeira Familiar";
    
    // Set meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Gerencie o orçamento da sua família de forma simples e eficiente com o Organiza. App PWA completo para gestão financeira pessoal e familiar.');
    
    // Set html lang
    document.documentElement.lang = 'pt-BR';
    
    // Add structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Organiza - Gestão Financeira Familiar",
      "url": "https://organizagff.vercel.app/",
    };
    
    let ldScript = document.getElementById('structured-data-ld') as HTMLScriptElement | null;
    if (!ldScript) {
      ldScript = document.createElement('script');
      ldScript.id = 'structured-data-ld';
      ldScript.type = 'application/ld+json';
      document.head.appendChild(ldScript);
    }
    ldScript.textContent = JSON.stringify(structuredData);
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
