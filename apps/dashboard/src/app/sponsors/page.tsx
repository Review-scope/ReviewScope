import { BMCButton } from "@/components/bmc-button";
import { Heart } from "lucide-react";

export const metadata = {
  title: "Sponsors - ReviewScope",
  description: "Support ReviewScope development",
};

export default function SponsorsPage() {
  return (
    <div className="container mx-auto px-4 py-16 md:py-24 max-w-4xl">
      <div className="flex flex-col items-center text-center space-y-8">
        <div className="bg-primary/10 p-4 rounded-2xl">
          <Heart className="w-12 h-12 text-primary fill-primary/20" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
          Support <span className="text-primary italic">ReviewScope</span>
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
          ReviewScope is an open-source project dedicated to improving code quality for everyone.
          Your support helps us maintain servers, develop new features, and keep the project alive.
        </p>

        <div className="pt-8">
          <BMCButton className="flex justify-center" />
        </div>

        <div className="pt-16 grid gap-8 md:grid-cols-3 w-full text-left">
          <div className="bg-card border p-6 rounded-2xl shadow-sm">
            <h3 className="font-bold text-lg mb-2">Server Costs</h3>
            <p className="text-sm text-muted-foreground">
              Running AI models and background workers requires significant infrastructure.
            </p>
          </div>
          <div className="bg-card border p-6 rounded-2xl shadow-sm">
            <h3 className="font-bold text-lg mb-2">Development</h3>
            <p className="text-sm text-muted-foreground">
              We're constantly adding new language support and improving our analysis engine.
            </p>
          </div>
          <div className="bg-card border p-6 rounded-2xl shadow-sm">
            <h3 className="font-bold text-lg mb-2">Community</h3>
            <p className="text-sm text-muted-foreground">
              Keeping ReviewScope free for open-source projects is our priority.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
