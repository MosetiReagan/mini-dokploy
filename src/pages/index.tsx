import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { trpc } from "../utils/trpc";
import { Layout } from "../components/Layout";
import { StatusBadge } from "../components/StatusBadge";
import {
  ExternalLink,
  Plus,
  RefreshCw,
  Trash2,
  Terminal,
  Globe,
  GitBranch,
  Server,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const utils = trpc.useContext();
  const { data: user, isLoading: authLoading } = trpc.auth.me.useQuery();
  const { data: deployments, isLoading: depsLoading } = trpc.deployments.list.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 3000, // Poll state periodically so status updates automatically
  });

  const [actionId, setActionId] = useState<string | null>(null);

  const redeployMutation = trpc.deployments.redeploy.useMutation({
    onSuccess() {
      utils.deployments.list.invalidate();
      setActionId(null);
    },
  });

  const removeMutation = trpc.deployments.remove.useMutation({
    onSuccess() {
      utils.deployments.list.invalidate();
      setActionId(null);
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090d16] text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    // Redirect unauthenticated user
    if (typeof window !== "undefined") {
      router.push("/login");
    }
    return null;
  }

  const runningCount = deployments?.filter((d) => d.status === "running").length || 0;
  const buildingCount = deployments?.filter((d) => d.status === "building" || d.status === "deploying").length || 0;

  return (
    <Layout>
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-xl border border-slate-800 bg-[#0e1424] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Deployments</p>
            <p className="text-2xl font-bold text-white mt-1">{deployments?.length || 0}</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-[#0e1424] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Running Services</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold text-white">{runningCount}</p>
              {buildingCount > 0 && (
                <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  +{buildingCount} building
                </span>
              )}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-emerald-400">
            <Server className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-[#0e1424] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ingress Routing</p>
            <p className="text-sm font-mono text-emerald-400 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Traefik (*.127.0.0.1.sslip.io)
            </p>
          </div>
          <div className="p-3 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
            <Globe className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Deployment List Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Your Deployments</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Orchestrated as isolated Docker Swarm services with automatic Traefik subdomain routing.
          </p>
        </div>
        <Link
          href="/deployments/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Deployment
        </Link>
      </div>

      {/* Deployment Cards / Table */}
      {depsLoading ? (
        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mb-2" />
          <p className="text-sm">Loading deployments...</p>
        </div>
      ) : !deployments || deployments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-[#0c1222]/50 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400 mb-4">
            <Server className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No deployments yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-6">
            Provide any Git repository URL with a Dockerfile to instantly build, expose through Traefik, and run on Docker Swarm.
          </p>
          <Link
            href="/deployments/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            Create Your First Service
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {deployments.map((dep) => (
            <div
              key={dep.id}
              className="rounded-xl border border-slate-800/80 bg-[#0c1222] p-5 hover:border-slate-700 transition-all shadow-sm"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Deployment Info */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/deployments/${dep.id}`}
                      className="text-base font-semibold text-white hover:text-blue-400 transition-colors"
                    >
                      {dep.name}
                    </Link>
                    <StatusBadge status={dep.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1 font-mono text-slate-300">
                      <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                      {dep.branch}
                    </span>
                    <span>•</span>
                    <span className="truncate max-w-[280px]" title={dep.repoUrl}>
                      {dep.repoUrl}
                    </span>
                    <span>•</span>
                    <span>Port: {dep.exposedPort}</span>
                  </div>

                  {/* Subdomain Link */}
                  <div className="pt-1 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <a
                      href={`http://${dep.subdomain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono text-blue-400 hover:underline flex items-center gap-1"
                    >
                      http://{dep.subdomain}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/60">
                  <Link
                    href={`/deployments/${dep.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    <Terminal className="w-3.5 h-3.5 text-slate-400" />
                    Logs
                  </Link>

                  <button
                    disabled={redeployMutation.isLoading && actionId === dep.id}
                    onClick={() => {
                      setActionId(dep.id);
                      redeployMutation.mutate({ id: dep.id });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-50"
                    title="Pull latest code, rebuild, and update Swarm service"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-slate-400 ${
                        redeployMutation.isLoading && actionId === dep.id ? "animate-spin text-blue-400" : ""
                      }`}
                    />
                    Redeploy
                  </button>

                  <button
                    disabled={removeMutation.isLoading && actionId === dep.id}
                    onClick={() => {
                      if (confirm(`Are you sure you want to stop and remove deployment '${dep.name}'?`)) {
                        setActionId(dep.id);
                        removeMutation.mutate({ id: dep.id });
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-800/30 transition-colors disabled:opacity-50"
                    title="Remove Swarm Service"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
