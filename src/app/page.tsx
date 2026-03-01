"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Paperclip,
  Send,
  Image as ImageIcon,
  User,
  Bot,
  X,
  Plus,
  MessageSquare,
  Trash2,
  Menu,
  Sun,
  Moon,
  Globe,
  Mic,
  Square,
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { useSettings } from "@/lib/settings-context";
import { t, locales, localeLabels, type Locale } from "@/lib/i18n";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  imageUrl?: string;
  imageBase64?: string;
  imageMimeType?: string;
  createdAt: number;
  isStreaming?: boolean;
};

type ChatItem = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type AttachedImage = {
  previewUrl: string;
  base64: string;
  mimeType: string;
};

function fileToBase64(
  file: File,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const { user } = useUser();
  const { locale, setLocale, theme, toggleTheme } = useSettings();

  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [attachedImage, setAttachedImage] = useState<
    AttachedImage | undefined
  >(undefined);
  const [lightboxSrc, setLightboxSrc] = useState<string | undefined>(
    undefined,
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const isSubmittingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const hasInput = inputValue.trim().length > 0 || Boolean(attachedImage);

  const loadChats = useCallback(async () => {
    try {
      const res = await fetch("/api/chats");
      if (res.ok) {
        const data = (await res.json()) as ChatItem[];
        setChats(data);
      }
    } catch {
      /* ignore */
    } finally {
      setIsLoadingChats(false);
    }
  }, []);

  const loadMessages = useCallback(async (chatId: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/messages`);
      if (res.ok) {
        const data = (await res.json()) as Array<{
          id: string;
          role: string;
          text: string;
          image_url: string | null;
          created_at: string;
        }>;
        setMessages(
          data.map((m) => ({
            id: m.id,
            role: m.role as ChatRole,
            text: m.text,
            imageUrl: m.image_url ?? undefined,
            createdAt: new Date(m.created_at).getTime(),
          })),
        );
      }
    } catch {
      /* ignore */
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (isSubmittingRef.current) return;
    if (activeChatId) {
      loadMessages(activeChatId);
    } else {
      setMessages([]);
    }
  }, [activeChatId, loadMessages]);

  const handleNewChat = useCallback(async () => {
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t(locale, "newChat") }),
      });
      if (res.ok) {
        const chat = (await res.json()) as ChatItem;
        setChats((prev) => [chat, ...prev]);
        setActiveChatId(chat.id);
        setMessages([]);
        setIsSidebarOpen(false);
      }
    } catch {
      /* ignore */
    }
  }, [locale]);

  const handleDeleteChat = useCallback(
    async (chatId: string) => {
      try {
        await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
        setChats((prev) => prev.filter((c) => c.id !== chatId));
        if (activeChatId === chatId) {
          setActiveChatId(null);
          setMessages([]);
        }
      } catch {
        /* ignore */
      }
    },
    [activeChatId],
  );

  const handleSelectChat = useCallback((chatId: string) => {
    setActiveChatId(chatId);
    setIsSidebarOpen(false);
  }, []);

  const saveMessage = useCallback(
    async (
      chatId: string,
      role: string,
      text: string,
      imageDataUrl?: string,
    ) => {
      try {
        await fetch(`/api/chats/${chatId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role,
            text,
            image_url: imageDataUrl || null,
          }),
        });
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const updateChatTitle = useCallback(
    async (chatId: string, title: string) => {
      try {
        const shortTitle =
          title.length > 40 ? title.slice(0, 40) + "…" : title;
        await fetch(`/api/chats/${chatId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: shortTitle }),
        });
        setChats((prev) =>
          prev.map((c) =>
            c.id === chatId ? { ...c, title: shortTitle } : c,
          ),
        );
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const handleSelectFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(async (event) => {
      const file = event.target.files?.[0];
      if (!file || !file.type.startsWith("image/")) {
        if (event.target) event.target.value = "";
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      const { base64, mimeType } = await fileToBase64(file);
      setAttachedImage((prev) => {
        if (prev) URL.revokeObjectURL(prev.previewUrl);
        return { previewUrl, base64, mimeType };
      });
    }, []);

  const handleChangeInput: React.ChangeEventHandler<HTMLInputElement> =
    useCallback((event) => {
      setInputValue(event.target.value);
    }, []);

  const generateChatTitle = useCallback(
    async (chatId: string, firstMessage: string) => {
      try {
        const res = await fetch("/api/chat/generate-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: firstMessage }),
        });
        if (res.ok) {
          const { title } = (await res.json()) as { title: string };
          if (title) {
            updateChatTitle(chatId, title);
          }
        }
      } catch {
        /* ignore — keep default title */
      }
    },
    [updateChatTitle],
  );

  const handleStartRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        if (audioBlob.size === 0) return;

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("audio", audioBlob);
          const res = await fetch("/api/chat/transcribe", {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            const { text } = (await res.json()) as { text: string };
            if (text?.trim()) {
              setInputValue((prev) =>
                prev ? `${prev} ${text.trim()}` : text.trim(),
              );
            }
          }
        } catch {
          /* ignore */
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      /* microphone access denied */
    }
  }, []);

  const handleStopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  }, []);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  }, [isRecording, handleStartRecording, handleStopRecording]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      event.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed && !attachedImage) return;

      setIsSending(true);
      isSubmittingRef.current = true;

      let chatId = activeChatId;
      const isFirstMessage = messages.length === 0;

      if (!chatId) {
        try {
          const res = await fetch("/api/chats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: t(locale, "newChat") }),
          });
          if (res.ok) {
            const chat = (await res.json()) as ChatItem;
            setChats((prev) => [chat, ...prev]);
            chatId = chat.id;
            setActiveChatId(chat.id);
          }
        } catch {
          setIsSending(false);
          return;
        }
      }

      const persistentImageUrl =
        attachedImage?.base64 && attachedImage?.mimeType
          ? `data:${attachedImage.mimeType};base64,${attachedImage.base64}`
          : undefined;

      const message: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text: trimmed,
        imageUrl: persistentImageUrl ?? attachedImage?.previewUrl,
        imageBase64: attachedImage?.base64,
        imageMimeType: attachedImage?.mimeType,
        createdAt: Date.now(),
      };

      const nextMessages = [...messages, message];
      setMessages(nextMessages);
      setInputValue("");
      setAttachedImage(undefined);
      if (fileInputRef.current) fileInputRef.current.value = "";

      const imageDataUrl = message.imageBase64 && message.imageMimeType
        ? `data:${message.imageMimeType};base64,${message.imageBase64}`
        : undefined;

      if (chatId) {
        saveMessage(chatId, "user", trimmed, imageDataUrl);
      }

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          text: "",
          createdAt: Date.now(),
          isStreaming: true,
        },
      ]);

      try {
        const aiMessages = nextMessages.map((item) => {
          if (item.imageBase64 && item.imageMimeType) {
            return {
              role: item.role,
              content: [
                ...(item.text
                  ? [{ type: "text" as const, text: item.text }]
                  : []),
                {
                  type: "image" as const,
                  base64: item.imageBase64,
                  mimeType: item.imageMimeType,
                },
              ],
            };
          }
          return { role: item.role, content: item.text || "" };
        });

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: aiMessages }),
        });

        if (!response.ok || !response.body) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            (errorData as { error?: string }).error ??
              t(locale, "errorResponse"),
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          const snapshot = accumulated;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, text: snapshot } : msg,
            ),
          );
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, isStreaming: false }
              : msg,
          ),
        );

        if (chatId && accumulated.trim()) {
          saveMessage(chatId, "assistant", accumulated);
        }

        if (isFirstMessage && chatId && trimmed) {
          generateChatTitle(chatId, trimmed);
        }
      } catch (error) {
        const errorText =
          error instanceof Error ? error.message : t(locale, "unknownError");
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  text: `⚠ ${t(locale, "errorPrefix")}: ${errorText}`,
                  isStreaming: false,
                }
              : msg,
          ),
        );
      } finally {
        isSubmittingRef.current = false;
        setIsSending(false);
      }
    },
    [
      inputValue,
      attachedImage,
      messages,
      activeChatId,
      saveMessage,
      generateChatTitle,
      locale,
    ],
  );

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const renderedMessages = useMemo(
    () =>
      messages.map((message) => (
        <div
          key={message.id}
          className="flex gap-3"
          aria-label={
            message.role === "user"
              ? t(locale, "userMessage")
              : t(locale, "assistantMessage")
          }
        >
          <Avatar className="mt-1 shrink-0">
            {message.role === "user" ? (
              <AvatarFallback>
                <User className="size-4" />
              </AvatarFallback>
            ) : (
              <AvatarFallback>
                <Bot className="size-4" />
              </AvatarFallback>
            )}
            <AvatarImage
              alt={
                message.role === "user" ? t(locale, "user") : t(locale, "tutorChat")
              }
            />
          </Avatar>
          <div className="flex max-w-[80%] flex-col gap-2">
            <div
              className={`rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {message.isStreaming && !message.text ? (
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
                </span>
              ) : (
                <>
                  {message.text ||
                    (message.imageUrl && t(locale, "sentImage"))}
                  {message.isStreaming && (
                    <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current align-text-bottom" />
                  )}
                </>
              )}
            </div>
            {message.imageUrl ? (
              <button
                type="button"
                onClick={() => setLightboxSrc(message.imageUrl)}
                className="cursor-zoom-in"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={message.imageUrl}
                  alt={t(locale, "attachedImage")}
                  className="max-h-64 max-w-xs rounded-xl border object-contain transition-opacity hover:opacity-80"
                  loading="lazy"
                />
              </button>
            ) : null}
          </div>
        </div>
      )),
    [messages, locale],
  );

  return (
    <div className="flex h-screen bg-background font-sans">
      {/* Sidebar overlay on mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r bg-card transition-transform md:static md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{t(locale, "chats")}</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleNewChat}
            aria-label={t(locale, "newChat")}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 p-2">
            {isLoadingChats ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {t(locale, "loading")}
              </p>
            ) : chats.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {t(locale, "noChats")}
              </p>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer ${
                    activeChatId === chat.id
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() => handleSelectChat(chat.id)}
                >
                  <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{chat.title}</span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChat(chat.id);
                    }}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex flex-col gap-2 border-t px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="size-3.5" />
              <span>{t(locale, "language")}</span>
            </div>
            <div className="flex gap-1">
              {locales.map((l) => (
                <Button
                  key={l}
                  variant={locale === l ? "secondary" : "ghost"}
                  size="xs"
                  onClick={() => setLocale(l)}
                >
                  {localeLabels[l]}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {theme === "light" ? (
                <Sun className="size-3.5" />
              ) : (
                <Moon className="size-3.5" />
              )}
              <span>{t(locale, "theme")}</span>
            </div>
            <Button variant="ghost" size="xs" onClick={toggleTheme}>
              {theme === "light" ? t(locale, "dark") : t(locale, "light")}
            </Button>
          </div>
        </div>

        <div className="border-t px-4 py-3">
          <div className="flex items-center gap-3">
            <UserButton />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user?.firstName || t(locale, "user")}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b px-4 py-3">
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="size-4" />
          </span>
          <h1 className="text-sm font-semibold sm:text-base">
            {activeChatId
              ? chats.find((c) => c.id === activeChatId)?.title ??
                t(locale, "tutorChat")
              : t(locale, "tutorChat")}
          </h1>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-3">
          <ScrollArea className="min-h-0 flex-1 overflow-hidden pr-3">
            <div className="mx-auto flex max-w-3xl flex-col gap-4 pb-4">
              {isLoadingMessages ? (
                <p className="text-sm text-muted-foreground">
                  {t(locale, "loadingMessages")}
                </p>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <div className="inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="size-6" />
                  </div>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    {t(locale, "emptyChat")}
                  </p>
                </div>
              ) : (
                renderedMessages
              )}
              <div ref={scrollEndRef} />
            </div>
          </ScrollArea>

          {attachedImage ? (
            <div className="mx-auto flex w-full max-w-3xl items-center gap-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachedImage.previewUrl}
                alt={t(locale, "preview")}
                className="h-12 w-12 rounded-md border object-cover"
              />
              <div className="flex-1">
                <p className="font-medium text-foreground text-xs">
                  {t(locale, "imageAttached")}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  {t(locale, "imageHint")}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                onClick={() =>
                  setAttachedImage((prev) => {
                    if (prev) URL.revokeObjectURL(prev.previewUrl);
                    return undefined;
                  })
                }
              >
                ✕
              </Button>
            </div>
          ) : null}

          <form
            onSubmit={handleSubmit}
            className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-lg border bg-background/60 px-2 py-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground"
              onClick={handleSelectFile}
              aria-label={t(locale, "attachImage")}
            >
              <Paperclip className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="hidden shrink-0 text-muted-foreground sm:inline-flex"
              onClick={handleSelectFile}
            >
              <ImageIcon className="size-4" />
            </Button>
            <Input
              value={inputValue}
              onChange={handleChangeInput}
              placeholder={
                isTranscribing
                  ? t(locale, "transcribing")
                  : t(locale, "inputPlaceholder")
              }
              autoComplete="off"
              disabled={isTranscribing}
              className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={`shrink-0 ${
                isRecording
                  ? "text-red-500 animate-pulse"
                  : "text-muted-foreground"
              }`}
              onClick={handleToggleRecording}
              disabled={isSending || isTranscribing}
              aria-label={
                isRecording
                  ? t(locale, "stopRecording")
                  : t(locale, "startRecording")
              }
            >
              {isRecording ? (
                <Square className="size-4" />
              ) : (
                <Mic className="size-4" />
              )}
            </Button>
            <Button
              type="submit"
              size="icon-sm"
              disabled={!hasInput || isSending || isTranscribing}
              aria-label={t(locale, "sendMessage")}
            >
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </main>

      {/* Lightbox */}
      {lightboxSrc ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxSrc(undefined)}
          role="dialog"
          aria-label={t(locale, "viewImage")}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-white hover:bg-white/20"
            onClick={() => setLightboxSrc(undefined)}
          >
            <X className="size-6" />
          </Button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt={t(locale, "enlargedImage")}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
