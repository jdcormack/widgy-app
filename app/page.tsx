import { MainNavigation } from "@/components/main-navigation";
import { Footer } from "@/components/footer";

export default async function HomePage() {
  return (
    <main className="relative flex flex-col min-h-screen bg-white">
      <MainNavigation />

      <section className="relative z-10">hero</section>

      <Footer />
    </main>
  );
}
