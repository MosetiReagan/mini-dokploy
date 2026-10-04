import React, { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { trpc } from "../../utils/trpc";
import { Layout } from "../../components/Layout";
import {
  ArrowLeft,
  Server,
  GitBranch,
  Globe,
  Tag,
  Plus,
  Trash2,
  Rocket,
  Info,
} from "lucide-react";

interface LabelPair {
  key: string;
  value: string;
}

export default function NewDeployment() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [repoUrl, setRepoUrl] = useState("https://github.com/nginxinc/docker-nginx");
  const [dockerfilePath, setDockerfilePath] = useState("./Dockerfile");
  const [branch, setBranch] = useState("main");
  const [exposedPort, setExposedPort] = useState(80);
  const [customLabels, setCustomLabels] = useState<LabelPair[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const createMutation = trpc.deployments.create.useMutation({
    onSuccess(data) {
      router.push(`/deployments/${data.id}`);
    },
    onError(err) {
      setErrorMsg(err.message);
    },
  });

  const addLabel = () => {
    setCustomLabels([...customLabels, { key: "", value: "" }]);
  };

  const removeLabel = (idx: number) => {
    setCustomLabels(customLabels.filter((_, i) => i !== idx));
  };

  const updateLabel = (idx: number, field: "key" | "value", val: string) => {
    const updated = [...customLabels];
    updated[idx]![field] = val;
    setCustomLabels(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const labelsObj: Record<string, string> = {};
    for (const pair of customLabels) {
      if (pair.key.trim()) {
        labelsObj[pair.key.trim()] = pair.value.trim();
      }
    }

    createMutation.mutate({
      name: name.trim(),
      repoUrl: repoUrl.trim(),
      dockerfilePath: dockerfilePath.trim(),
      branch: branch.trim(),
      exposedPort: Number(exposedPort),
      customLabels: labelsObj,
    });
  };

  const cleanName = (name || "my-app")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 16);
  const previewDomain = `app-${cleanName}-abc12345.127.0.0.1.sslip.io`;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Deployments
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0c1222] p-6 sm:p-8 shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Create New Deployment</h1>
              <p className="text-xs text-slate-400">
                Configure your repository and container options. Dokploy orchestrates the Swarm service and Traefik routing.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/40 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Service Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Service Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. web-api"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#070b14] border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Git Repo URL & Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Git Repository URL <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://github.com/user/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#070b14] border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Branch</label>
                <div className="relative">
                  <GitBranch className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="main"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#070b14] border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Dockerfile Path & Exposed Port */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Dockerfile Path <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="./Dockerfile"
                  value={dockerfilePath}
                  onChange={(e) => setDockerfilePath(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#070b14] border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
                <p className="text-[11px] text-slate-500 mt-1">Relative to root of cloned repository.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Exposed Port <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={65535}
                  value={exposedPort}
                  onChange={(e) => setExposedPort(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#070b14] border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
                <p className="text-[11px] text-slate-500 mt-1">Port container listens on (e.g. 80, 3000, 8080).</p>
              </div>
            </div>

            {/* Generated Subdomain Preview */}
            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/30">
              <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400 mb-1">
                <Globe className="w-4 h-4" />
                <span>Generated Ingress Subdomain (sslip.io)</span>
              </div>
              <p className="font-mono text-xs text-slate-300">http://{previewDomain}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Traefik will dynamically route traffic matching this Host header directly to your Swarm service tasks.
              </p>
            </div>

            {/* Optional Custom Docker Labels */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    Custom Docker Labels (Optional)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Merged with automatic Traefik labels on the Docker Swarm service.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addLabel}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Label
                </button>
              </div>

              {customLabels.length > 0 && (
                <div className="space-y-2.5 mt-3">
                  {customLabels.map((lbl, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Label Key (e.g. env)"
                        value={lbl.key}
                        onChange={(e) => updateLabel(idx, "key", e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-[#070b14] border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <input
                        type="text"
                        placeholder="Label Value (e.g. production)"
                        value={lbl.value}
                        onChange={(e) => updateLabel(idx, "value", e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-[#070b14] border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => removeLabel(idx)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-end space-x-3">
              <Link
                href="/"
                className="px-4 py-2.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={createMutation.isLoading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
              >
                {createMutation.isLoading ? "Starting Deployment..." : "Deploy Service"}
                <Rocket className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
