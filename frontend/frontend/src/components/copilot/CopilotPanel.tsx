import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, X, Bot, User, Trash2, Lightbulb } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "copilot";
  text: string;
  isStreaming?: boolean;
}

interface CopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_PROMPTS = [
  "Where should I invest ₹2 Crore?",
  "What villages have the highest road demand?",
  "What project benefits the maximum population?",
];

const MOCK_ANSWERS: Record<string, string> = {
  "Where should I invest ₹2 Crore?":
    "Based on current spatial-infrastructure gaps, allocating **₹1.6 Crore** to construct the **Aurangpur Main Paved Connection Road** and **₹40 Lakhs** for solar-powered micro-grid pumps in **Nayanagar** provides the highest marginal utility, addressing isolation for 14,000+ residents.",
  "What villages have the highest road demand?":
    "Analyzing citizen feedback and GIS layouts, **Aurangpur** (42 requests), **Nayanagar** (35 requests), and **Rampur East** (28 requests) have the highest road connectivity demands. Currently, transit speeds are reduced by 70% during monsoons.",
  "What project benefits the maximum population?":
    "The **Central Block Sanitation & Water Filtration Unit** has the highest population reach. With a budget of **₹1.85 Crore**, it directly cleans arsenic contamination from groundwater, serving **34,200 citizens** across 5 local villages.",
};

export const CopilotPanel: React.FC<CopilotPanelProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "copilot",
      text: "Hello! I am your JanVikas AI Development Copilot. Ask me anything about constituency datasets, project budgets, or infrastructure gap analysis.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const simulateStreamingResponse = (fullText: string) => {
    const messageId = Math.random().toString();
    
    // Insert empty message to start streaming
    setMessages((prev) => [
      ...prev,
      { id: messageId, sender: "copilot", text: "", isStreaming: true },
    ]);

    const words = fullText.split(" ");
    let currentText = "";
    let wordIndex = 0;

    const interval = setInterval(() => {
      if (wordIndex < words.length) {
        currentText += (wordIndex === 0 ? "" : " ") + words[wordIndex];
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, text: currentText } : msg
          )
        );
        wordIndex++;
      } else {
        clearInterval(interval);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, isStreaming: false } : msg
          )
        );
        setIsResponding(false);
      }
    }, 45); // Adjust word printing speed
  };

  const handleSend = (textToSend: string) => {
    if (!textToSend.trim() || isResponding) return;

    const userMessageId = Math.random().toString();
    setMessages((prev) => [
      ...prev,
      { id: userMessageId, sender: "user", text: textToSend },
    ]);
    setInput("");
    setIsResponding(true);

    // Formulate reply
    setTimeout(() => {
      const matchKey = Object.keys(MOCK_ANSWERS).find(
        (key) => key.toLowerCase().trim() === textToSend.toLowerCase().trim()
      );
      const reply = matchKey
        ? MOCK_ANSWERS[matchKey]!
        : `Analyzing demographic overlays and infrastructure registries... Your question: "${textToSend}" highlights key planning dimensions. Based on current data, we recommend focusing on drinking water filtration in block districts, which show high risk indices.`;
      
      simulateStreamingResponse(reply);
    }, 800);
  };

  const clearChat = () => {
    setMessages([
      {
        id: "1",
        sender: "copilot",
        text: "Hello! I am your JanVikas AI Development Copilot. Ask me anything about constituency datasets, project budgets, or infrastructure gap analysis.",
      },
    ]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-45"
          />

          {/* Chat Sliding Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md sm:max-w-lg border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                  <Sparkles size={14} />
                </div>
                <span className="font-bold text-sm text-slate-900 dark:text-white">AI Planning Copilot</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearChat}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Clear chat history"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Icon */}
                  <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${
                    msg.sender === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-indigo-400"
                  }`}>
                    {msg.sender === "user" ? <User size={14} /> : <Bot size={14} />}
                  </div>

                  {/* Bubble */}
                  <div className={`p-4 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-500/10"
                      : "bg-slate-100 dark:bg-slate-800/80 dark:text-slate-100 border border-slate-200/50 dark:border-slate-800 text-slate-800 rounded-tl-none shadow-sm"
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.isStreaming && (
                      <span className="inline-block h-3 w-1.5 bg-indigo-500 animate-pulse ml-0.5" />
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Prompt suggestions & Input Area */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4 shrink-0">
              {/* Query suggestions */}
              {messages.length === 1 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                    <Lightbulb size={12} className="text-indigo-400" />
                    <span>Frequently Asked Suggestions</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SAMPLE_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleSend(prompt)}
                        className="text-[11px] font-medium text-left px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition-all select-none"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Input Field */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isResponding}
                  placeholder={
                    isResponding
                      ? "AI is streaming response..."
                      : "Ask Copilot e.g., Where should I invest ₹2 Crore?"
                  }
                  className="flex-1 px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isResponding}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CopilotPanel;
