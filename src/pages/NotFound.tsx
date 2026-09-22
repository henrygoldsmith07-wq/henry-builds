import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { SiteFooter, SiteHeader } from "@/components/portfolio/SiteChrome";
import { SiteMetadata } from "@/components/portfolio/SiteMetadata";

export default function NotFound() {
  return (
    <div className="portfolio-shell flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      <SiteMetadata
        title="Page not found — Henry Goldsmith"
        description="That page does not exist. Return to Henry Goldsmith's portfolio or browse the project archive."
        noIndex
      />
      <SiteHeader />

      <main id="main" className="flex flex-1 items-center">
        <section className="mx-auto w-full max-w-[1380px] px-5 py-32 sm:px-8 lg:px-12">
          <p className="eyebrow mb-7">404 / Not found</p>
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="section-title max-w-4xl">
                That page
                <br />
                <span className="text-muted-foreground">isn&apos;t here.</span>
              </h1>
            </div>
            <div>
              <p className="max-w-md text-base leading-7 text-muted-foreground">
                The link may be old, the project may have moved, or the address
                may be mistyped. The project archive is generated from the
                current registry, so it is the best place to find what is still
                published.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/" className="button-primary">
                  <ArrowLeft className="size-4" aria-hidden="true" /> Home
                </Link>
                <Link to="/projects" className="button-secondary">
                  Browse projects{" "}
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
