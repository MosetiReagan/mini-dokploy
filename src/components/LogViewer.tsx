import React, { useEffect, useRef, useState } from "react";
import { Terminal, Copy, Check, ArrowDownCircle, RefreshCw } from "lucide-react";

export interface LogEntry {
  id: string;
  deploymentId: string;
  timestamp: string | Date;
  level: "info" | "warn" | "error" | "success";
  message: string;
}

interface LogViewerProps {
  deploymentId: string;
  initialLogs?: LogEntry[];
  isLive?: boolean;
}

export function LogViewer({ deploymentId, initialLogs = [], isLive = true }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialLogs.length > 0 && logs.length === 0) {
      setLogs(initialLogs);
    }
  }, [initialLogs]);

  useEffect(() => {
    if (!isLive || typeof window === "undefined") return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?deploymentId=${deploymentId}`;

    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    function connect() {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === "log" && payload.data) {
              setLogs((prev) => {
                // Deduplicate by log ID
                if (prev.some((l) => l.id === payload.data.id)) return prev;
                return [...prev, payload.data];
              });
            }
          } catch (err) {
            // non-json or ping frame
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          // Try reconnecting after 3 seconds
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch (e) {
        setWsConnected(false);
      }
    }

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [deploymentId, isLive]);

  // Handle auto-scroll
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const copyAllLogs = () => {
    const text = logs.map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level.toUpperCase()}] ${l.message}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-[#070b14] overflow-hidden flex flex-col h-[520px] shadow-2xl">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0d1322] border-b border-slate-800 text-xs">
        <div className="flex items-center space-x-2.5">
          <Terminal className="w-4 h-4 text-blue-400" />
          <span className="font-mono text-slate-300 font-medium">Build & Runtime Logs</span>
          <div className="flex items-center gap-1.5 ml-2">
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
              }`}
            />
            <span className="text-[10px] text-slate-400">
              {wsConnected ? "Live WebSocket Stream" : "Connecting..."}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
              autoScroll
                ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
            title="Toggle Auto-Scroll"
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            Auto-scroll
          </button>
          <button
            onClick={copyAllLogs}
            className="px-2 py-1 rounded text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-1"
            title="Copy All Logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1 select-text bg-[#050811]"
      >
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 italic">
            Waiting for build output to stream...
          </div>
        ) : (
          logs.map((log) => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            let colorClass = "text-slate-300";
            let badgeBg = "bg-slate-800 text-slate-400";

            if (log.level === "error") {
              colorClass = "text-rose-400 font-semibold";
              badgeBg = "bg-rose-950/60 text-rose-300 border border-rose-800/40";
            } else if (log.level === "warn") {
              colorClass = "text-amber-300";
              badgeBg = "bg-amber-950/60 text-amber-300 border border-amber-800/40";
            } else if (log.level === "success") {
              colorClass = "text-emerald-300";
              badgeBg = "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40";
            }

            return (
              <div key={log.id} className="flex items-start gap-2.5 leading-relaxed hover:bg-slate-900/40 px-1 py-0.5 rounded">
                <span className="text-slate-600 select-none shrink-0 font-mono text-[11px]">{timeStr}</span>
                <span
                  className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded select-none shrink-0 ${badgeBg}`}
                >
                  {log.level}
                </span>
                <span className={`break-all whitespace-pre-wrap ${colorClass}`}>
                  {log.message}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
