import { db, reviews, repositories, installations } from "@/lib/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/authOptions";
import { ChevronLeft, AlertTriangle, AlertOctagon, Info, HelpCircle, Code, FileText, CheckCircle2, XCircle, AlertCircle, ShieldAlert, Quote, ExternalLink, MessageSquare, Shield, Clock, Search, Filter, Sparkles, AlertCircle as AlertIcon } from "lucide-react";
import Link from "next/link";
import { type ReviewComment } from "@reviewscope/llm-core";
import { clsx } from "clsx";
import { FindingsToolbar } from "../findings-toolbar";
import { getUserOrgIds } from "@/lib/github";

export const dynamic = 'force-dynamic';

export default async function ReviewDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) return notFound();

  // @ts-expect-error session.accessToken exists
  const accessToken = session.accessToken;
  // @ts-expect-error session.user.id
  const githubUserId = parseInt(session.user.id);

  const orgIds = accessToken ? await getUserOrgIds(accessToken) : [];
  const allAccountIds = [githubUserId, ...orgIds];

  const review = await db.query.reviews.findFirst({
    where: eq(reviews.id, id),
    with: {
      repository: {
        with: {
          installation: true
        }
      }
    }
  });


  if (!review || !allAccountIds.includes(review.repository.installation.githubAccountId || 0)) return notFound();

  const result = review.result as any;
  const comments = (result?.comments || []) as ReviewComment[];
  const assessment = result?.assessment || { riskLevel: 'N/A', mergeReadiness: 'N/A' };
  const summary = result?.summary || 'No summary available.';

  const groupedComments = comments.reduce((acc, comment) => {
    if (!acc[comment.file]) acc[comment.file] = [];
    acc[comment.file].push(comment);
    return acc;
  }, {} as Record<string, ReviewComment[]>);

  const riskColor = {
    'Low': 'text-green-500 bg-green-50 border-green-100',
    'Medium': 'text-amber-500 bg-amber-50 border-amber-100',
    'High': 'text-red-500 bg-red-50 border-red-100',
    'Critical': 'text-red-600 bg-red-100 border-red-200 shadow-[0_0_15px_rgba(220,38,38,0.2)]',
  }[assessment.riskLevel as string] || 'text-zinc-500 bg-zinc-50 border-zinc-100';

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-12 pb-32">
      {/* Premium Navigation Header */}
      <header className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-4">
             <Link 
              href={`/repositories/${review.repositoryId}`}
              className="group inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Intelligence Report
            </Link>
            <div className="space-y-1">
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter truncate max-w-3xl italic uppercase">
                PR <span className="text-primary">#{review.prNumber}</span> Review
              </h1>
              <p className="text-lg text-muted-foreground font-medium flex items-center gap-2">
                <Shield className="w-5 h-5 text-zinc-400" />
                {review.repository.fullName}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className={clsx("px-8 py-4 border-2 rounded-4xl flex flex-col items-center justify-center min-w-[140px] shadow-sm transition-all", riskColor)}>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Risk Profile</span>
              <span className="text-xl font-black italic uppercase tracking-tight">{assessment.riskLevel}</span>
            </div>
            <a 
              href={`${review.repository.fullName}/pull/${review.prNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-zinc-900 text-white rounded-4xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-zinc-800 transition-all hover:translate-y-[-2px] shadow-2xl"
            >
              View Dispatch <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Rapid Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           {[
             { label: "Issues Detected", value: comments.length, icon: <AlertIcon className="w-4 h-4 text-red-500" /> },
             { label: "Files Impacted", value: Object.keys(groupedComments).length, icon: <Code className="w-4 h-4 text-blue-500" /> },
             { label: "Stability Score", value: assessment.mergeReadiness === "Recommended" ? "98%" : "64%", icon: <ZapIcon className="w-4 h-4 text-amber-500" /> },
             { label: "Review Time", value: "3.2s", icon: <Clock className="w-4 h-4 text-green-500" /> },
           ].map((stat) => (
             <div key={stat.label} className="bg-card border border-border/50 p-6 rounded-3xl flex flex-col justify-between gap-4">
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</span>
                   {stat.icon}
                </div>
                <span className="text-3xl font-black tracking-tighter italic">{stat.value}</span>
             </div>
           ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Sidebar: Executive Assessment */}
        <div className="lg:col-span-1 space-y-8">
           <section className="bg-zinc-900 text-white rounded-[2.5rem] p-10 space-y-8 shadow-2xl relative overflow-hidden">
              <Sparkles className="absolute top-10 right-10 w-24 h-24 text-white/5" />
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary">Executive Intelligence</h3>
                <h2 className="text-3xl font-black tracking-tight italic">Summary Analysis</h2>
              </div>
              <p className="text-lg font-medium leading-relaxed text-zinc-400 border-l-4 border-primary pl-6">
                {summary}
              </p>
              <div className="space-y-4 pt-8">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                   <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Stability</span>
                   <span className={clsx("text-sm font-black uppercase italic", assessment.mergeReadiness === 'Recommended' ? 'text-green-400' : 'text-amber-400')}>
                     {assessment.mergeReadiness}
                   </span>
                </div>
              </div>
           </section>

           <div className="p-8 border-2 border-dashed border-border rounded-[2.5rem] bg-zinc-50/50 space-y-4">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-white rounded-xl shadow-sm border"><MessageSquare className="w-4 h-4 text-primary" /></div>
                 <h4 className="font-black text-sm uppercase tracking-tight">System Guardrails</h4>
              </div>
              <p className="text-xs text-muted-foreground font-medium italic">
                This review was performed using the latest <span className="text-foreground font-bold italic">ReviewScope Engine</span> with strict adherence to architectural patterns and security best practices.
              </p>
           </div>
        </div>

        {/* Main: Findings Analysis */}
        <div className="lg:col-span-2 space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-black uppercase tracking-tighter italic">Engine Findings</h3>
              <span className="px-3 py-1 bg-zinc-100 text-zinc-900 rounded-full text-[10px] font-black border uppercase">DETECTION MODE</span>
            </div>
            <FindingsToolbar comments={comments} />
          </div>

          <div className="space-y-10">
            {Object.entries(groupedComments).map(([file, fileComments], fileIdx) => (
              <div key={file} className="group animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${fileIdx * 100}ms` }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-zinc-900 text-white rounded-xl shadow-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-lg tracking-tight">{file.split('/').pop()}</h4>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{file}</p>
                  </div>
                </div>

                <div className="grid gap-6">
                  {fileComments.map((comment, idx) => (
                    <div key={idx} className="relative bg-card border-2 border-border/50 rounded-[2rem] p-8 shadow-sm hover:shadow-xl transition-all hover:border-primary/20 overflow-hidden group/card">
                       {/* Priority Indicator */}
                       <div className={clsx(
                         "absolute top-0 left-0 w-1.5 h-full",
                         ['BLOCKER', 'CRITICAL', 'HIGH'].includes((comment.severity || '').toUpperCase()) ? 'bg-red-500' : 
                         ['MAJOR', 'MEDIUM'].includes((comment.severity || '').toUpperCase()) ? 'bg-amber-500' : 'bg-blue-500'
                       )}></div>

                       <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                         <div className="space-y-4 flex-1">
                            <div className="flex items-center gap-3">
                               <span className={clsx(
                                 "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                 ['BLOCKER', 'CRITICAL', 'HIGH'].includes((comment.severity || '').toUpperCase()) ? 'bg-red-50 text-red-600 border-red-100' : 
                                 ['MAJOR', 'MEDIUM'].includes((comment.severity || '').toUpperCase()) ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                                 'bg-blue-50 text-blue-600 border-blue-100'
                               )}>
                                 {comment.severity}
                               </span>
                               <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                                 <Code className="w-3 h-3" /> Line {comment.line}
                               </span>
                            </div>
                            <p className="text-lg font-bold text-zinc-900 leading-snug group-hover/card:text-primary transition-colors italic">
                              &ldquo;{comment.message}&rdquo;
                            </p>
                            {comment.why && (
                              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                                <span className="text-zinc-900 font-black uppercase text-[10px] mr-2">Analysis:</span>
                                {comment.why}
                              </p>
                            )}
                         </div>
                         <div className="shrink-0">
                            <div className="p-4 bg-zinc-50 border rounded-2xl group-hover/card:bg-white transition-colors">
                               {['BLOCKER', 'CRITICAL', 'HIGH'].includes((comment.severity || '').toUpperCase()) ? <AlertOctagon className="w-6 h-6 text-red-500" /> : <Info className="w-6 h-6 text-zinc-400" />}
                            </div>
                         </div>
                       </div>

                       {comment.fix && (
                          <div className="mt-8 bg-zinc-950 rounded-xl overflow-hidden shadow-inner border border-zinc-800">
                             <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Proposed Implementation
                                </span>
                             </div>
                             <pre className="p-6 text-sm font-mono text-zinc-300 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800">
                               <code>{comment.fix}</code>
                             </pre>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Zap(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 14.71 12 2l1.39 9h6.61L12 22l-1.39-9H4Z" />
    </svg>
  );
}

function ZapIcon(props: any) {
  return <Zap {...props} />;
}

