import { Outlet } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Toaster } from "@/components/ui/sonner";

export default function Root() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Organiza - Gestão Financeira Familiar",
    "url": "https://organizagff.vercel.app/",
  };

  return (
    <>
      <Helmet htmlAttributes={{ lang: "pt-BR" }}>
        <title>Organiza - Gestão Financeira Familiar</title>
        <meta
          name="description"
          content="Gerencie o orçamento da sua família de forma simples e eficiente com o Organiza. App PWA completo para gestão financeira pessoal e familiar."
        />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>
      <main className="min-h-screen">
        <Outlet />
      </main>
      <Toaster />
    </>
  );
}