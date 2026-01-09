import { MainNavigation } from "@/components/main-navigation";
import { Footer } from "@/components/footer";

export default async function HomePage() {
  return (
    <main className="relative flex flex-col min-h-screen bg-white">
      <MainNavigation />

      <section className="relative flex items-center justify-center h-96 overflow-hidden max-w-6xl max-sm:w-[95%] w-full mx-auto rounded-xl">
        <div className="absolute inset-0 bg-linear-to-br from-blue-200 via-purple-200 to-transparent blur-3xl opacity-60 z-0" />
        <div className="relative z-10 w-full max-w-xl space-y-8 max-sm:px-5">
          <h1 className="text-4xl font-black text-gray-900 mb-4">
            Gather feedback. <span className="text-blue-600">Plan better.</span>{" "}
            <span className="text-pink-600">Ship faster.</span>
          </h1>
        </div>
      </section>

      <Footer />
    </main>
  );
}
