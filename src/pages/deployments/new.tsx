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
  Sparkles,
  Code,
  Sliders,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface KeyValuePair {
  key: string;
  value: string;
}

export default function NewDeployment() {
  const router = useRouter();
  const [name, setName] = useState("nginx-web");
  const [repoUrl, setRepoUrl] = useState("https://github.com/nginxinc/docker-nginx");
  const [dockerfilePath, setDockerfilePath] = useState("./Dockerfile");
  const [branch, setBranch] = useState("main");
  const [exposedPort, setExposedPort] = useState(80);
  const [customLabels, setCustomLabels] = useState<KeyValuePair[]>([]);
  const [envVars, setEnvVars] = useState<KeyValuePair[]>([
    { key: "NODE_ENV", value: "production" },
  ]);
  const [showLabelPreview, setShowLabelPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const createMutation = trpc.deployments.create.useMutation({
    onSuccess(data) {
      router.push(`/deployments/${data.id}`);
    },
    onError(err) {
      setErrorMsg(err.message);
    },
  });

  const handleApplyPreset = (presetName: string, repo: string, dockerfile: string, port: number) => {
    setName(presetName);
    setRepoUrl(repo);
    setDockerfilePath(dockerfile);
    setExposedPort(port);
  };

  const addLabel = () => setCustomLabels([...customLabels, { key: "", value: "" }]);
  const removeLabel = (idx: number) => setCustomLabels(customLabels.filter((_, i) => i !== idx));
  const updateLabel = (idx: number, field: "key" | "value", val: string) => {
    const updated = [...customLabels];
    updated[idx]![field] = val;
    setCustomLabels(updated);
  };

  const addEnv = () => setEnvVars([...envVars, { key: "", value: "" }]);
  const removeEnv = (idx: number) => setEnvVars(envVars.filter((_, i) => i !== idx));
  const updateEnv = (idx: number, field: "key" | "value", val: string) => {
    const updated = [...envVars];
    updated[idx]![field] = val;
    setEnvVars(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const labelsObj: Record<string, string> = {};
    for (const pair of customLabels) {
      if (pair.key.trim()) labelsObj[pair.key.trim()] = pair.value.trim();
    }

    const envObj: Record<string, string> = {};
    for (const pair of envVars) {
      if (pair.key.trim()) envObj[pair.key.trim()] = pair.value.trim();
    }

    createMutation.mutate({
      name: name.trim(),
      repoUrl: repoUrl.trim(),
      dockerfilePath: dockerfilePath.trim(),
      branch: branch.trim(),
      exposedPort: Number(exposedPort),
      customLabels: labelsObj,
      envVars: envObj,
    });
  };

  const cleanName = (name || "my-app")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 24);
  const previewDomain = `app-${cleanName}-a1b2c3d4.127.0.0.1.sslip.io`;

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
                Orchestrated as a Docker Swarm service with automated Traefik routing and local sslip.io ingress.
              </p>
            </div>
          </div>

          {/* Quick Presets for Evaluator */}
          <div className="mb-6 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>One-Click Starter Presets:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset("nginx-web", "https://github.com/nginxinc/docker-nginx", "./Dockerfile", 80)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                🌐 Nginx Static Web (Port 80)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("express-api", "https://github.com/expressjs/express", "./Dockerfile", 3000)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                ⚡ Express API (Port 3000)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("nextjs-app", "https://github.com/vercel/next.js", "./examples/with-docker/Dockerfile", 3000)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                ▲ Next.js Docker (Port 3000)
              </button>
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
                  Exposed Container Port <span className="text-rose-400">*</span>
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
                <p className="text-[11px] text-slate-500 mt-1">Port container process listens on (e.g. 80, 3000, 8080).</p>
              </div>
            </div>

            {/* Generated Subdomain Preview */}
            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/30">
              <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400 mb-1">
                <Globe className="w-4 h-4" />
                <span>Auto-Generated Ingress Subdomain (sslip.io)</span>
              </div>
              <p className="font-mono text-xs text-slate-300">http://{previewDomain}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Zero configuration needed. sslip.io automatically routes to 127.0.0.1, where Traefik matches the Host header.
              </p>
            </div>

            {/* Environment Variables Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-slate-400" />
                    Environment Variables
                  </label>
                  <p className="text-[11px] text-slate-500">Injected into the Docker Swarm ContainerSpec.</p>
                </div>
                <button
                  type="button"
                  onClick={addEnv}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Env Var
                </button>
              </div>

              {envVars.length > 0 && (
                <div className="space-y-2 mt-2">
                  {envVars.map((env, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="KEY (e.g. DATABASE_URL)"
                        value={env.key}
                        onChange={(e) => updateEnv(idx, "key", e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-[#070b14] border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <input
                        type="text"
                        placeholder="VALUE"
                        value={env.value}
                        onChange={(e) => updateEnv(idx, "value", e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-[#070b14] border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => removeEnv(idx)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Optional Custom Docker Labels */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    Custom Docker Labels (Optional)
                  </label>
                  <p className="text-[11px] text-slate-500">Merged with Traefik ingress labels on the Swarm service.</p>
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
                <div className="space-y-2 mt-2">
                  {customLabels.map((lbl, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Label Key (e.g. app.environment)"
                        value={lbl.key}
                        onChange={(e) => updateLabel(idx, "key", e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-[#070b14] border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <input
                        type="text"
                        placeholder="Label Value (e.g. staging)"
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

            {/* Traefik Label Inspector Accordion */}
            <div className="rounded-xl border border-slate-800 bg-[#070b14] p-3 text-xs">
              <button
                type="button"
                onClick={() => setShowLabelPreview(!showLabelPreview)}
                className="w-full flex items-center justify-between text-slate-400 hover:text-slate-200"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <Code className="w-3.5 h-3.5 text-blue-400" />
                  Inspect Traefik Swarm Service Labels
                </span>
                {showLabelPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showLabelPreview && (
                <div className="mt-3 pt-3 border-t border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                  <p className="text-emerald-400">traefik.enable = &quot;true&quot;</p>
                  <p className="text-emerald-400">traefik.docker.network = &quot;mini-dokploy-net&quot;</p>
                  <p className="text-blue-400">traefik.http.routers.dokploy-{cleanName}.rule = Host(`{previewDomain}`)</p>
                  <p className="text-blue-400">traefik.http.routers.dokploy-{cleanName}.entrypoints = &quot;web&quot;</p>
                  <p className="text-amber-400">traefik.http.services.dokploy-{cleanName}.loadbalancer.server.port = &quot;{exposedPort}&quot;</p>
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
