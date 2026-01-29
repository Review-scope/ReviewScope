import { SponsorCards } from "./sponsor-cards";
import { Heart } from "lucide-react";

export const metadata = {
  title: "Sponsors - ReviewScope",
  description: "Support ReviewScope development",
};

export default function SponsorsPage() {
  return (
    <div className="container mx-auto px-4 md:py-10 max-w-5xl">
      <div className="flex flex-col items-center text-center space-y-8 mb-16">
        <div className="bg-primary/5 p-4 rounded-3xl">
          <Heart className="w-12 h-12 text-primary fill-primary/10" />
        </div>
        
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900">
            Support <span className="text-primary italic">ReviewScope</span>
          </h1>
          
          <p className="text-xl text-zinc-500 font-medium leading-relaxed">
            ReviewScope is an open-source project dedicated to improving code quality for everyone.
            Your support helps us maintain servers and develop new features.
          </p>
        </div>
      </div>

      <SponsorCards />

      {/* <div className="mt-24 grid gap-8 md:grid-cols-3 w-full max-w-5xl mx-auto">
        <div className="bg-zinc-50 border border-zinc-100 p-8 rounded-3xl">
          <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center mb-4 shadow-sm">
            <Server className="w-5 h-5 text-zinc-700" />
          </div>
          <h3 className="font-bold text-lg mb-2 text-zinc-900">Server Costs</h3>
          <p className="text-sm text-zinc-500 font-medium leading-relaxed">
            Running AI models and background workers requires significant infrastructure resources and GPU compute.
          </p>
        </div>
        <div className="bg-zinc-50 border border-zinc-100 p-8 rounded-3xl">
          <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center mb-4 shadow-sm">
            <Code2 className="w-5 h-5 text-zinc-700" />
          </div>
          <h3 className="font-bold text-lg mb-2 text-zinc-900">Development</h3>
          <p className="text-sm text-zinc-500 font-medium leading-relaxed">
            We're constantly adding new language support, improving our analysis engine, and building new features.
          </p>
        </div>
        <div className="bg-zinc-50 border border-zinc-100 p-8 rounded-3xl">
          <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center mb-4 shadow-sm">
            <Users className="w-5 h-5 text-zinc-700" />
          </div>
          <h3 className="font-bold text-lg mb-2 text-zinc-900">Community</h3>
          <p className="text-sm text-zinc-500 font-medium leading-relaxed">
            Keeping ReviewScope free for open-source projects is our priority. Your support makes this possible.
          </p>
        </div>
      </div> */}
    </div>
  );
}
