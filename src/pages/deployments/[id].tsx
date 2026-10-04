import React, { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { trpc } from "../../utils/trpc";
import { Layout } from "../../components/Layout";
import { StatusBadge } from "../../components/StatusBadge";
import { LogViewer } from "../../components/LogViewer";
import {
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Trash2,
  Globe,
  GitBranch,
  Server,
  Layers,
  Clock,
  Shield,
} from "lucide-react";

export default function DeploymentDetail() {
  const router = useRouter();
  const { id } = router.query;
  const deploymentId = typeof id === "string" ? id : "";

  const utils = trpc.useContext();
  const { data: deployment, isLoading, error } = trpc.deployments.get.useQuery(
    { id: deploymentId },
    {
      enabled: !!deploymentId,
      refetchInterval: 3000, // Poll deployment state periodically
    }
  );

  const { data: initialLogs } = trpc.deployments.getLogs.useQuery(
    { id: deploymentId },
    { enabled: !!deploymentId }
  );

  const [isActionLoading, setIsActionLoading] = useState(false);

  const redeployMutation = trpc.deployments.redeploy.useMutation({
    onSuccess() {
      utils.deployments.get.invalidate({ id: deploymentId });
      utils.deployments.getLogs.invalidate({ id: deploymentId });
      setIsActionLoading(false);
    },
    onError() {
      setIsActionLoading(false);
    },
  });

  const removeMutation = trpc.deployments.remove.useMutation({
    onSuccess() {
      router.push("/");
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mb-2" />
          <p className="text-sm">Loading deployment details...</p>
        </div>
      </Layout>
    );
  }

  if (error || !deployment) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto my-12 p-8 rounded-2xl border border-rose-800/40 bg-rose-950/20 text-center">
          <h2 className="text-lg font-semibold text-rose-300">Deployment Not Found</h2>
          <p className="text-xs text-rose-400/80 mt-1 mb-6">
            The requested deployment does not exist or you do not have permission to view it.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </Link>
        </div>
      </Layout>
    );
  }

  let customLabels: Record<string, string> = {};
  try {
    customLabels = JSON.parse(deployment.customLabelsJson || "{}");
  } catch {}

  return (
    <Layout>
      {/* Navigation & Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Deployments
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">{deployment.name}</h1>
            <StatusBadge status={deployment.status} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            disabled={isActionLoading || redeployMutation.isLoading}
            onClick={() => {
              setIsActionLoading(true);
              redeployMutation.mutate({ id: deployment.id });
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isActionLoading || redeployMutation.isLoading ? "animate-spin text-blue-400" : ""
              }`}
            />
            Redeploy
          </button>

          <button
            onClick={() => {
              if (confirm(`Are you sure you want to stop and remove '${deployment.name}'?`)) {
                removeMutation.mutate({ id: deployment.id });
              }
            }}
            disabled={removeMutation.isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        </div>
      </div>

      {/* Info Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Ingress URL */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1222] md:col-span-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 mb-1">
            <Globe className="w-4 h-4 text-blue-400" />
            <span>Traefik Subdomain</span>
          </div>
          <a
            href={`http://${deployment.subdomain}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-mono text-blue-400 hover:underline flex items-center gap-1.5 break-all mt-1"
          >
            http://{deployment.subdomain}
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>
        </div>

        {/* Git Details */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1222]">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 mb-1">
            <GitBranch className="w-4 h-4 text-indigo-400" />
            <span>Repository & Branch</span>
          </div>
          <p className="text-xs font-mono text-slate-200 truncate mt-1" title={deployment.repoUrl}>
            {deployment.repoUrl}
          </p>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">branch: {deployment.branch}</p>
        </div>

        {/* Container Details */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1222]">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 mb-1">
            <Server className="w-4 h-4 text-emerald-400" />
            <span>Port & Service ID</span>
          </div>
          <p className="text-xs font-mono text-slate-200 mt-1">Exposed Port: {deployment.exposedPort}</p>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate" title={deployment.dockerServiceId || "Pending"}>
            Swarm ID: {deployment.dockerServiceId || "orchestrating..."}
          </p>
        </div>
      </div>

      {/* Error Notice */}
      {deployment.errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300">
          <p className="font-semibold mb-1">Deployment Error:</p>
          <p className="font-mono text-[11px]">{deployment.errorMessage}</p>
        </div>
      )}

      {/* Live Log Terminal */}
      <div>
        <LogViewer
          deploymentId={deployment.id}
          initialLogs={initialLogs as any}
          isLive={true}
        />
      </div>
    </Layout>
  );
}
