"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { io, Socket } from "socket.io-client";
import "xterm/css/xterm.css";

interface WebTerminalProps {
  projectId: string;
  className?: string;
  onStatusChange?: (status: "connecting" | "connected" | "disconnected" | "error") => void;
}

export function WebTerminal({ projectId, className, onStatusChange }: WebTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("disconnected");

  const updateStatus = useCallback((newStatus: "connecting" | "connected" | "disconnected" | "error") => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  // 初始化终端
  useEffect(() => {
    if (!terminalRef.current) return;

    // 创建终端实例
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "#1a1b26",
        foreground: "#a9b1d6",
        cursor: "#c0caf5",
        cursorAccent: "#1a1b26",
        selectionBackground: "#33467c",
        black: "#32344a",
        red: "#f7768e",
        green: "#9ece6a",
        yellow: "#e0af68",
        blue: "#7aa2f7",
        magenta: "#ad8ee6",
        cyan: "#449dab",
        white: "#787c99",
        brightBlack: "#444b6a",
        brightRed: "#ff7a93",
        brightGreen: "#b9f27c",
        brightYellow: "#ff9e64",
        brightBlue: "#7da6ff",
        brightMagenta: "#bb9af7",
        brightCyan: "#0db9d7",
        brightWhite: "#acb0d0",
      },
      allowProposedApi: true,
    });

    // 添加插件
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.loadAddon(new WebLinksAddon());

    // 挂载到 DOM
    terminal.open(terminalRef.current);
    fit.fit();

    terminalInstance.current = terminal;
    fitAddon.current = fit;

    // 监听窗口大小变化
    const handleResize = () => {
      fit.fit();
      if (socketRef.current?.connected) {
        socketRef.current.emit("resize", {
          cols: terminal.cols,
          rows: terminal.rows,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    // 处理终端输入
    terminal.onData((data) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("input", { data });
      }
    });

    // 连接 WebSocket
    connectSocket(terminal);

    return () => {
      window.removeEventListener("resize", handleResize);
      socketRef.current?.disconnect();
      terminal.dispose();
    };
  }, []);

  // 连接 WebSocket
  const connectSocket = useCallback((terminal: Terminal) => {
    updateStatus("connecting");

    const socket = io(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005"}/terminal`, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[WebTerminal] 已连接到服务器");
      updateStatus("connected");

      // 启动终端会话
      socket.emit("start_terminal", {
        project_id: projectId,
        cols: terminal.cols,
        rows: terminal.rows,
      });
    });

    socket.on("disconnect", () => {
      console.log("[WebTerminal] 与服务器断开连接");
      updateStatus("disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("[WebTerminal] 连接错误:", error);
      updateStatus("error");
    });

    socket.on("connected", (data) => {
      console.log("[WebTerminal] 服务器确认连接:", data);
    });

    socket.on("terminal_started", (data) => {
      console.log("[WebTerminal] 终端已启动:", data);
    });

    socket.on("output", (data) => {
      terminal.write(data.data);
      // 确保滚动到底部
      terminal.scrollToBottom();
    });

    socket.on("terminal_stopped", () => {
      terminal.writeln("\n\x1b[33m[系统]\x1b[0m 终端会话已结束");
      updateStatus("disconnected");
    });

    socket.on("error", (data) => {
      console.error("[WebTerminal] 错误:", data);
      terminal.writeln(`\n\x1b[31m[错误]\x1b[0m ${data.message}`);
    });
  }, [projectId, updateStatus]);

  // 重新连接
  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    if (terminalInstance.current) {
      terminalInstance.current.clear();
      connectSocket(terminalInstance.current);
    }
  }, [connectSocket]);

  return (
    <div className={`relative ${className || ""}`}>
      {/* 状态栏 */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          status === "connected" ? "bg-green-500" :
          status === "connecting" ? "bg-yellow-500 animate-pulse" :
          status === "error" ? "bg-red-500" :
          "bg-gray-500"
        }`} />
        <span className="text-xs text-gray-400">
          {status === "connected" ? "已连接" :
           status === "connecting" ? "连接中..." :
           status === "error" ? "连接错误" :
           "已断开"}
        </span>
        {status !== "connected" && status !== "connecting" && (
          <button
            onClick={reconnect}
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            重连
          </button>
        )}
      </div>
      
      {/* 终端容器 */}
      <div
        ref={terminalRef}
        className="w-full h-full min-h-[300px] bg-[#1a1b26] rounded-lg overflow-hidden"
        style={{ padding: "8px" }}
      />
    </div>
  );
}
