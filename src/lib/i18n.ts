export const locales = ["ru", "ro"] as const;
export type Locale = (typeof locales)[number];

export const localeLabels: Record<Locale, string> = {
  ru: "Русский",
  ro: "Română",
};

const translations = {
  ru: {
    chats: "Чаты",
    newChat: "Новый чат",
    loading: "Загрузка...",
    noChats: "Нет чатов. Начните новый!",
    user: "Пользователь",
    loadingMessages: "Загрузка сообщений...",
    emptyChat:
      "Задайте вопрос или прикрепите фото задачи, и ИИ-репетитор поможет вам разобраться шаг за шагом.",
    imageAttached: "Изображение прикреплено",
    imageHint: "ИИ увидит эту картинку вместе с вашим сообщением.",
    inputPlaceholder: "Напишите сообщение или опишите задачу…",
    attachImage: "Прикрепить изображение",
    sendMessage: "Отправить сообщение",
    sentImage: "Отправлено изображение",
    viewImage: "Просмотр изображения",
    enlargedImage: "Увеличенное изображение",
    attachedImage: "Прикреплённое изображение",
    preview: "Предпросмотр",
    tutorChat: "Тьютор-чат",
    theme: "Тема",
    language: "Язык",
    light: "Светлая",
    dark: "Тёмная",
    errorResponse: "Не удалось получить ответ.",
    errorPrefix: "Ошибка",
    unknownError: "Неизвестная ошибка",
    userMessage: "Сообщение пользователя",
    assistantMessage: "Ответ ассистента",
    startRecording: "Записать голосовое сообщение",
    stopRecording: "Остановить запись",
    transcribing: "Распознаю речь…",
  },
  ro: {
    chats: "Conversații",
    newChat: "Conversație nouă",
    loading: "Se încarcă...",
    noChats: "Nu aveți conversații. Începeți una nouă!",
    user: "Utilizator",
    loadingMessages: "Se încarcă mesajele...",
    emptyChat:
      "Puneți o întrebare sau atașați o fotografie a temei, iar tutorele IA vă va ajuta pas cu pas.",
    imageAttached: "Imagine atașată",
    imageHint: "IA va vedea această imagine împreună cu mesajul dvs.",
    inputPlaceholder: "Scrieți un mesaj sau descrieți tema…",
    attachImage: "Atașați o imagine",
    sendMessage: "Trimiteți mesajul",
    sentImage: "Imagine trimisă",
    viewImage: "Vizualizare imagine",
    enlargedImage: "Imagine mărită",
    attachedImage: "Imagine atașată",
    preview: "Previzualizare",
    tutorChat: "Tutor-chat",
    theme: "Temă",
    language: "Limbă",
    light: "Deschisă",
    dark: "Întunecată",
    errorResponse: "Nu s-a putut obține un răspuns.",
    errorPrefix: "Eroare",
    unknownError: "Eroare necunoscută",
    userMessage: "Mesajul utilizatorului",
    assistantMessage: "Răspunsul asistentului",
    startRecording: "Înregistrați un mesaj vocal",
    stopRecording: "Opriți înregistrarea",
    transcribing: "Recunoaștere vocală…",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["ru"];

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale][key];
}
