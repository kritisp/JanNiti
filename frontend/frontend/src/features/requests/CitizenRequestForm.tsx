import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Square,
  Trash2,
  UploadCloud,
  X,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  MapPin,
  Clock,
  User,
  Phone,
  HelpCircle,
  AlertCircle,
  Play,
  Pause,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import api from "@/core/api";

interface CitizenFormInput {
  citizen_name: string;
  phone: string;
  village: string;
  ward: string;
  district: string;
  state: string;
  pin_code: string;
  submitted_category: string;
  description: string;
  language: string;
}

const CATEGORY_OPTIONS = [
  "Road", "Bridge", "Drainage", "Water Supply", "Electricity", "Hospital",
  "School", "Public Transport", "Employment", "Agriculture", "Environment",
  "Women's Safety", "Youth Development", "Sports", "Skill Development", "Others"
];

const LANGUAGE_OPTIONS = [
  "Auto Detect", "English", "Hindi", "Bengali", "Kannada", "Tamil",
  "Telugu", "Marathi", "Malayalam", "Gujarati", "Punjabi", "Odia"
];

export const CitizenRequestForm: React.FC = () => {
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  // Audio Recording references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Ingestion Stages
  const [submitStage, setSubmitStage] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [pipelineStep, setPipelineStep] = useState(0);
  const [processedResult, setProcessedResult] = useState<any | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, reset } = useForm<CitizenFormInput>({
    defaultValues: {
      citizen_name: "",
      phone: "",
      village: "",
      ward: "",
      district: "Araria", // Default district
      state: "Bihar",      // Default state
      pin_code: "",
      submitted_category: "Road",
      description: "",
      language: "Auto Detect",
    }
  });

  // Watch fields for Auto-Save
  const watchedFields = watch();

  // 1. Auto-Save Draft Effect
  useEffect(() => {
    const savedDraft = localStorage.getItem("janvikas_citizen_draft");
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        Object.keys(parsed).forEach((key) => {
          setValue(key as keyof CitizenFormInput, parsed[key]);
        });
      } catch (e) {
        console.error("Failed to restore form draft", e);
      }
    }
  }, [setValue]);

  useEffect(() => {
    // Save draft state on edit
    const debounceTimer = setTimeout(() => {
      if (submitStage === "idle") {
        localStorage.setItem("janvikas_citizen_draft", JSON.stringify(watchedFields));
      }
    }, 1000);
    return () => clearTimeout(debounceTimer);
  }, [watchedFields, submitStage]);

  // 2. Audio Recorder Operations
  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        setVoiceBlob(audioBlob);
        setVoiceUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      drawWaveform();
    } catch (err) {
      console.error("Microphone access denied or audio issue", err);
      alert("Microphone permission denied. Unable to record voice.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let x = 0;
    const draw = () => {
      if (!isRecording) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#6366f1"; // Indigo line
      ctx.lineWidth = 3;
      ctx.lineCap = "round";

      ctx.beginPath();
      for (let i = 0; i < canvas.width; i += 6) {
        const amplitude = Math.random() * 24 + 2; // Procedural wave heights
        const yOffset = canvas.height / 2;
        ctx.moveTo(i, yOffset - amplitude / 2);
        ctx.lineTo(i, yOffset + amplitude / 2);
      }
      ctx.stroke();

      x += 0.05;
      animationFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
  };

  const deleteVoice = () => {
    setVoiceBlob(null);
    setVoiceUrl(null);
  };

  // 3. Image drag and drop uploader
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const newImages = [...images, ...selectedFiles].slice(0, 4); // Limit to max 4 images
      setImages(newImages);

      const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
      setImagePreviews([...imagePreviews, ...newPreviews].slice(0, 4));
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  // 4. Form Submission and Ingestion Pipeline
  const onSubmit = async (data: CitizenFormInput) => {
    setSubmitStage("processing");
    setPipelineStep(1); // Stage 1: Lang Detect
    setApiError(null);

    // Form data packaging
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      formData.append(key, data[key as keyof CitizenFormInput]);
    });

    if (voiceBlob) {
      formData.append("voice", voiceBlob, "voice.wav");
    }

    images.forEach((img) => {
      formData.append("images", img);
    });

    // Simulate pipeline step visual updates during POST request
    const pipelineTimer1 = setTimeout(() => setPipelineStep(2), 2200); // Stage 2: Translate
    const pipelineTimer2 = setTimeout(() => setPipelineStep(3), 4400); // Stage 3: Classify
    const pipelineTimer3 = setTimeout(() => setPipelineStep(4), 6600); // Stage 4: Resolution

    try {
      const response = await api.post("/api/citizen/submit", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      clearTimeout(pipelineTimer1);
      clearTimeout(pipelineTimer2);
      clearTimeout(pipelineTimer3);

      setProcessedResult(response.data);
      setSubmitStage("success");
      localStorage.removeItem("janvikas_citizen_draft"); // Clear draft
    } catch (err: any) {
      clearTimeout(pipelineTimer1);
      clearTimeout(pipelineTimer2);
      clearTimeout(pipelineTimer3);
      setApiError(err.message || "Failed to submit request.");
      setSubmitStage("error");
    }
  };

  const resetFormState = () => {
    reset();
    setImages([]);
    setImagePreviews([]);
    setVoiceBlob(null);
    setVoiceUrl(null);
    setSubmitStage("idle");
    setPipelineStep(0);
    setProcessedResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Citizen Intelligence Gateway
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
          Ingest unstructured feedback to parse categories, urgency metrics, and resolution parameters.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* Stage 1: Ingestion Form */}
        {submitStage === "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl backdrop-blur-md"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Grid Section 1: Demographics */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  1. Contact Information (Optional)
                </span>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Citizen Name</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        {...register("citizen_name")}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Phone Number</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="tel"
                        {...register("phone")}
                        placeholder="e.g. +91 9876543210"
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid Section 2: Address */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  2. Regional Location Coordinates
                </span>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Village *</label>
                    <input
                      type="text"
                      required
                      {...register("village")}
                      placeholder="e.g. Aurangpur"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ward (Optional)</label>
                    <input
                      type="text"
                      {...register("ward")}
                      placeholder="e.g. Ward No. 12"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pin Code *</label>
                    <input
                      type="text"
                      required
                      {...register("pin_code")}
                      placeholder="e.g. 854311"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">District *</label>
                    <input
                      type="text"
                      required
                      {...register("district")}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">State *</label>
                    <input
                      type="text"
                      required
                      {...register("state")}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Grid Section 3: Request Core Details */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  3. Development Request Ingestion
                </span>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Input Language</label>
                    <select
                      {...register("language")}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
                    >
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Category Tag *</label>
                    <select
                      {...register("submitted_category")}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
                    >
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Description *</label>
                  <textarea
                    required
                    {...register("description")}
                    rows={4}
                    placeholder="Provide detailed description of the development requirement (e.g. The water pipeline in Aurangpur village is cracked, causing leakage and muddy streets. High risk of contamination...)"
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Grid Section 4: Multimodal Uploads (Voice + Images) */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Voice Ingest */}
                <div className="space-y-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    4. Voice Record Evidence
                  </span>
                  
                  <div className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col items-center justify-center min-h-[140px] gap-4">
                    {isRecording ? (
                      <div className="flex flex-col items-center gap-3 w-full">
                        <canvas ref={canvasRef} width="220" height="40" className="w-full max-w-[220px]" />
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-all animate-pulse"
                        >
                          <Square size={12} />
                          Stop Recording
                        </button>
                      </div>
                    ) : voiceUrl ? (
                      <div className="flex flex-col items-center gap-3 w-full">
                        <audio src={voiceUrl} controls className="w-full max-w-[240px] h-8" />
                        <button
                          type="button"
                          onClick={deleteVoice}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-semibold text-xs transition-all"
                        >
                          <Trash2 size={12} />
                          Remove Voice note
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-center">
                        <Mic size={24} className="text-slate-400" />
                        <span className="text-xs text-slate-500">Add spoken descriptions or testimonies</span>
                        <button
                          type="button"
                          onClick={startRecording}
                          className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-200 dark:text-white border border-slate-800 font-semibold text-xs transition-all"
                        >
                          <Mic size={12} />
                          Record Audio
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Evidence Image Upload */}
                <div className="space-y-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    5. Evidence Images (Max 4)
                  </span>

                  <div className="p-5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col items-center justify-center min-h-[140px] relative hover:bg-slate-100/30 dark:hover:bg-slate-800/10 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <UploadCloud size={24} className="text-slate-400 pointer-events-none" />
                    <span className="text-xs text-slate-500 mt-2 pointer-events-none">Drag & Drop or Click to upload files</span>
                    <span className="text-[10px] text-slate-400 pointer-events-none mt-1">(Supports JPG, PNG formats)</span>
                  </div>

                  {/* Image Thumbnails Previews */}
                  {imagePreviews.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative h-14 w-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0">
                          <img src={preview} alt="Evidence thumbnail" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-slate-950/60 text-white hover:bg-red-600 transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-end gap-3">
                <span className="text-[10px] text-slate-400">All marked * fields are required</span>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 text-white font-semibold text-xs transition-all active:scale-98"
                >
                  Submit Development Request
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Stage 2: AI Processing Pipeline Screen */}
        {submitStage === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl text-center flex flex-col items-center justify-center min-h-[380px] space-y-6"
          >
            {/* Spinning sparkline icon */}
            <div className="relative flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-600/10 text-indigo-500">
              <Sparkles size={28} className="animate-spin" />
              <span className="absolute inline-flex h-full w-full rounded-2xl bg-indigo-500/5 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Processing Pipeline Active</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Analyzing unstructured data feeds into structured civic objects...</p>
            </div>

            {/* Steps Progress list */}
            <div className="w-full max-w-sm text-left space-y-3.5 pt-4">
              {[
                "Language Detection & Translation Ingest",
                "Analyzing Voice notes & Multimodal Evidence",
                "Extracting Category, Issue & Urgency indices",
                "Location Matching & Duplicate Detection Screening"
              ].map((step, idx) => {
                const currentIdx = idx + 1;
                const isDone = pipelineStep > currentIdx;
                const isActive = pipelineStep === currentIdx;

                return (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] transition-colors ${
                        isDone
                          ? "bg-emerald-500 text-white"
                          : isActive
                          ? "bg-indigo-600 text-white animate-pulse"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                      }`}>
                        {isDone ? "✓" : currentIdx}
                      </div>
                      <span className={`font-semibold ${
                        isActive
                          ? "text-slate-900 dark:text-white"
                          : isDone
                          ? "text-slate-600 dark:text-slate-400"
                          : "text-slate-400 dark:text-slate-500"
                      }`}>
                        {step}
                      </span>
                    </div>
                    {isActive && (
                      <span className="text-[10px] text-indigo-500 animate-pulse font-mono">Running...</span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Stage 3: Success Screen displaying Structured Output */}
        {submitStage === "success" && processedResult && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Confirmation Banner */}
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle size={22} />
                <div>
                  <h4 className="font-bold text-sm">Request Ingested Successfully</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Structured database record ID: #{processedResult.id}</p>
                </div>
              </div>
              
              {processedResult.is_duplicate && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold">
                  <AlertTriangle size={10} />
                  <span>Duplicate Flagged</span>
                </div>
              )}
            </div>

            {/* Output Visualizer */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Result JSON Grid */}
              <div className="md:col-span-8 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg space-y-6">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Structured Decision Data</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Parsed via Google Gemini Multimodal model</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/80">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Resolved Category</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-white mt-1 block">
                      {processedResult.ai_category || processedResult.submitted_category}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/80">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Urgency Index</span>
                    <span className="text-xs font-bold mt-1 block flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        processedResult.urgency === "Critical"
                          ? "bg-red-500"
                          : processedResult.urgency === "High"
                          ? "bg-orange-500"
                          : "bg-indigo-500"
                      }`} />
                      <span className={
                        processedResult.urgency === "Critical"
                          ? "text-red-500"
                          : processedResult.urgency === "High"
                          ? "text-orange-500"
                          : "text-slate-800 dark:text-slate-200"
                      }>
                        {processedResult.urgency || "Low"}
                      </span>
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/80">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Detected Language</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-white mt-1 block">
                      {processedResult.detected_language || "English"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/80">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Confidence Score</span>
                    <span className="text-xs font-bold text-indigo-500 mt-1 block">
                      {processedResult.confidence ? (processedResult.confidence * 100).toFixed(0) : "95"}% Accuracy
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Core Extracted Issue</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-200/20 leading-relaxed">
                    {processedResult.extracted_issue || "Defect details extracted from citizen testimony."}
                  </p>
                </div>

                {processedResult.translated_text && processedResult.detected_language !== "English" && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Translation in English</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-200/20 leading-relaxed italic">
                      {processedResult.translated_text}
                    </p>
                  </div>
                )}

                {/* Keywords */}
                {processedResult.keywords && processedResult.keywords.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Extracted Keywords</span>
                    <div className="flex flex-wrap gap-1.5">
                      {processedResult.keywords.map((kw: string, i: number) => (
                        <span key={i} className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Mapping & Actions (4 cols on md) */}
              <div className="md:col-span-4 space-y-6">
                
                {/* Resolved Location Card */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <MapPin size={12} className="text-indigo-400" />
                    Resolved Location
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Village:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{processedResult.resolved_village || processedResult.village}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">District:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{processedResult.resolved_district || processedResult.district}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">State:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{processedResult.resolved_state || processedResult.state}</span>
                    </div>
                  </div>
                </div>

                {/* Duplicate link warning */}
                {processedResult.is_duplicate && (
                  <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-xs text-slate-600 dark:text-slate-300 leading-normal space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-500">
                      <AlertCircle size={14} />
                      <span>Duplicate Request Detected</span>
                    </div>
                    <p>
                      Another matching request was submitted from the same village within the last 14 days. This record is linked to original request **#{processedResult.duplicate_of_id}**.
                    </p>
                  </div>
                )}

                {/* Action button */}
                <button
                  onClick={resetFormState}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow transition-all hover:scale-102 active:scale-98"
                >
                  <span>Submit Another Request</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stage 4: Ingestion Pipeline Error Screen */}
        {submitStage === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-8 rounded-3xl border border-red-500/20 bg-white dark:bg-slate-900 shadow-xl text-center flex flex-col items-center justify-center min-h-[300px] space-y-6"
          >
            <div className="h-16 w-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <AlertCircle size={28} />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pipeline Processing Error</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">The ingestion pipeline failed to process the citizen request.</p>
            </div>

            {apiError && (
              <pre className="max-w-md overflow-x-auto p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[10px] text-red-400 text-left">
                {apiError}
              </pre>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setSubmitStage("idle")}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Back to Form
              </button>
              <button
                type="button"
                onClick={resetFormState}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
              >
                Reset Form
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CitizenRequestForm;
