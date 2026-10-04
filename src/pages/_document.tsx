import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head>
        <title>Mini-Dokploy — Docker Swarm & Traefik PaaS</title>
        <meta name="description" content="Production-grade lightweight PaaS powered by Docker Swarm and Traefik" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body className="bg-[#090d16] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
