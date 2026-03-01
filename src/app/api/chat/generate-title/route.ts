import { NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY не настроен." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as { message?: string };

  if (!body.message || !body.message.trim()) {
    return NextResponse.json(
      { error: "Сообщение пустое." },
      { status: 400 },
    );
  }

  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system:
        "Ты генерируешь короткие названия для чатов. Получаешь первое сообщение пользователя и должен придумать краткое название чата (максимум 5-6 слов). Отвечай ТОЛЬКО названием, без кавычек, без точки в конце. Язык названия должен совпадать с языком сообщения.",
      prompt: body.message,
    });

    const title = text.trim().replace(/^["«]|["»]$/g, "").replace(/\.$/, "");

    return NextResponse.json({ title });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error("Generate title error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
