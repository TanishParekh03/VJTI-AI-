"""
LLM Service — Provider-Agnostic Streaming Wrapper
══════════════════════════════════════════════════
ALL LLM provider calls live here and ONLY here.
No other module imports google.generativeai or openai directly.

The active provider is selected by the LLM_PROVIDER env var (default: "gemini").
"""
from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Message type ─────────────────────────────────────────────────────────────

LLMMessage = dict[str, str]  # {"role": "user"|"model"|"system", "content": str}


# ── Provider implementations ──────────────────────────────────────────────────

class _GeminiProvider:
    """Google Gemini streaming provider."""

    def __init__(self) -> None:
        import google.generativeai as genai  # type: ignore[import]

        if not settings.gemini_api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Add it to your .env file."
            )
        genai.configure(api_key=settings.gemini_api_key)
        self._genai = genai
        self._model_name = settings.gemini_model
        logger.info("llm_provider_initialized", extra={"provider": "gemini", "model": self._model_name})

    async def generate(
        self,
        messages: list[LLMMessage],
        stream: bool = True,
    ) -> AsyncGenerator[str, None]:
        """
        Yield text chunks as they stream from Gemini.
        Converts our internal message format to Gemini's expected shape.
        """
        import asyncio

        model = self._genai.GenerativeModel(self._model_name)

        # Extract system instruction (first message with role="system")
        system_parts: list[str] = []
        history: list[dict[str, Any]] = []
        pending_user: str | None = None

        for msg in messages:
            if msg["role"] == "system":
                system_parts.append(msg["content"])
            elif msg["role"] in ("user", "human"):
                if pending_user is not None:
                    history.append({"role": "user", "parts": [pending_user]})
                pending_user = msg["content"]
            elif msg["role"] in ("assistant", "model"):
                if pending_user is not None:
                    history.append({"role": "user", "parts": [pending_user]})
                    pending_user = None
                history.append({"role": "model", "parts": [msg["content"]]})

        if not pending_user:
            raise ValueError("No user message found in message list")

        # Rebuild model with system instruction if present
        if system_parts:
            model = self._genai.GenerativeModel(
                self._model_name,
                system_instruction="\n\n".join(system_parts),
            )

        chat = model.start_chat(history=history)

        if stream:
            response = await asyncio.to_thread(
                chat.send_message,
                pending_user,
                stream=True,
            )
            for chunk in response:
                try:
                    text = chunk.text if hasattr(chunk, "text") else ""
                    if text:
                        yield text
                except Exception:
                    # Skip empty or safety-filtered chunks
                    continue
        else:
            response = await asyncio.to_thread(chat.send_message, pending_user)
            try:
                yield response.text or ""
            except Exception:
                yield ""


class _OpenAIProvider:
    """OpenAI streaming provider (fallback)."""

    def __init__(self) -> None:
        from openai import AsyncOpenAI  # type: ignore[import]

        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not set.")
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        self._model = settings.openai_model

    async def generate(
        self,
        messages: list[LLMMessage],
        stream: bool = True,
    ) -> AsyncGenerator[str, None]:
        openai_messages = [
            {"role": "system" if m["role"] == "system" else ("assistant" if m["role"] in ("assistant", "model") else "user"),
             "content": m["content"]}
            for m in messages
        ]
        if stream:
            async with await self._client.chat.completions.create(
                model=self._model,
                messages=openai_messages,
                stream=True,
            ) as response:
                async for chunk in response:
                    delta = chunk.choices[0].delta.content or ""
                    if delta:
                        yield delta
        else:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=openai_messages,
            )
            yield response.choices[0].message.content or ""


# ── Public singleton ──────────────────────────────────────────────────────────
# NOTE: Not cached — always creates fresh provider so .env changes take effect
# without a full server restart.

def _get_provider() -> _GeminiProvider | _OpenAIProvider:
    if settings.llm_provider == "gemini":
        return _GeminiProvider()
    return _OpenAIProvider()


async def generate(
    messages: list[LLMMessage],
    stream: bool = True,
) -> AsyncGenerator[str, None]:
    """
    Public entry point. Delegates to the configured LLM provider.
    Yields text chunks when stream=True.
    """
    provider = _get_provider()
    async for chunk in provider.generate(messages, stream=stream):
        yield chunk


async def translate_text(text: str, target_lang: str = "English") -> str:
    """
    Translate document content or query text into target_lang (e.g., English or Marathi).
    Preserves circular numbers, dates, and exact figures.
    """
    if not text or not text.strip():
        return text

    messages: list[LLMMessage] = [
        {
            "role": "user",
            "content": (
                f"Translate the following Higher & Technical Education department document text into clear, accurate {target_lang}. "
                "Keep all circular numbers, dates, section numbers, and monetary figures exact:\n\n"
                f"{text[:4000]}"
            ),
        }
    ]
    translated = ""
    async for chunk in generate(messages, stream=False):
        translated += chunk
    return translated.strip()


async def generate_summary_and_tags(text: str, title: str = "") -> tuple[str, list[str]]:
    """
    Analyze document text using Gemini and return a tuple of (summary: str, tags: list[str]).
    Summary is 2-3 executive sentences. Tags are 3-5 concise domain topics.
    """
    import json
    if not text or not text.strip():
        return "Official Higher & Technical Education department document registered in system.", ["HTE", "Policy"]

    prompt = (
        "You are an expert document classifier for Higher & Technical Education Department, Government of Maharashtra.\n"
        f"Document Title: {title}\n"
        f"Document Content Excerpt:\n{text[:3500]}\n\n"
        "Task:\n"
        "1. Write a clean, 2-3 sentence executive summary explaining the main purpose, scope, and key directives of this document.\n"
        "2. Provide 3-5 relevant short tags (e.g. ['NEP-2020', 'University Recruitment', 'Scholarships', 'AICTE Circular', 'Policy', 'Student Welfare']).\n"
        "3. Also extract an 'applicability' tag which MUST be one of: 'govt', 'aided', 'unaided', 'autonomous', 'all', or 'other'.\n\n"
        "Return ONLY a raw JSON object with keys 'summary', 'tags', and 'applicability', nothing else:\n"
        "{\n"
        '  "summary": "...",\n'
        '  "tags": ["tag1", "tag2", "tag3"],\n'
        '  "applicability": "aided"\n'
        "}"
    )

    messages: list[LLMMessage] = [{"role": "user", "content": prompt}]
    raw_response = ""
    try:
        async for chunk in generate(messages, stream=False):
            raw_response += chunk
        
        # Clean potential markdown code block backticks
        clean_str = raw_response.strip()
        if clean_str.startswith("```"):
            clean_str = clean_str.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        if clean_str.startswith("json"):
            clean_str = clean_str[4:].strip()

        data = json.loads(clean_str)
        summary = str(data.get("summary", "")).strip() or f"Official document covering {title or 'HTE policies'}."
        tags = [str(t).strip() for t in data.get("tags", []) if t][:5]
        applicability = str(data.get("applicability", "all")).lower()
        
        if applicability not in ["govt", "aided", "unaided", "autonomous", "all", "other"]:
            applicability = "all"
            
        tags.append(f"applicability:{applicability}")
            
        if not tags:
            tags = ["HTE", "Policy", "Official", "applicability:all"]
        return summary, tags
    except Exception as exc:
        logger.warning("ai_summary_generation_fallback", extra={"error": str(exc)})
        return fallback_summary, ["HTE", "Government Policy"]

async def generate_hypothetical_answer(query: str) -> str:
    """
    HyDE (Hypothetical Document Embeddings): Generate a hypothetical answer
    to the query. Embedding this hypothetical answer improves semantic search
    retrieval significantly compared to embedding the raw question.
    """
    prompt = (
        "You are an expert policy assistant for the Maharashtra Government Higher & Technical Education department. "
        "A user is searching for documents to answer the following query: "
        f"'{query}'\n\n"
        "Write a 1-paragraph hypothetical snippet from an official Government Resolution (GR) or circular "
        "that would perfectly answer this query. Write it in an authoritative, bureaucratic tone. "
        "Do not include any pleasantries or conversational filler. Just the hypothetical text."
    )
    messages: list[LLMMessage] = [{"role": "user", "content": prompt}]
    hypothetical_doc = ""
    try:
        async for chunk in generate(messages, stream=False):
            hypothetical_doc += chunk
        return hypothetical_doc.strip()
    except Exception as exc:
        logger.warning(f"Failed to generate hypothetical answer: {exc}")
        return query

async def decompose_query(query: str) -> list[str]:
    """
    Decompose complex or multi-part queries into standalone sub-queries.
    Example: 'What is the eligibility for X and has it changed since 2022?'
    -> ['What is the eligibility for X?', 'Has the eligibility for X changed since 2022?']
    """
    import json
    prompt = (
        "You are an AI query decomposition expert. A user asked the following question:\n"
        f"'{query}'\n\n"
        "If the question contains multiple separate concepts or is asking for multiple things, "
        "break it down into 2-3 simpler standalone questions. If it is already a single simple question, "
        "just return a list with the original question.\n"
        "Return ONLY a raw JSON array of strings, nothing else:\n"
        '["Question 1", "Question 2"]'
    )
    messages: list[LLMMessage] = [{"role": "user", "content": prompt}]
    raw_response = ""
    try:
        async for chunk in generate(messages, stream=False):
            raw_response += chunk
        clean_str = raw_response.strip()
        if clean_str.startswith("```"):
            clean_str = clean_str.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        if clean_str.startswith("json"):
            clean_str = clean_str[4:].strip()
        
        queries = json.loads(clean_str)
        if isinstance(queries, list) and queries:
            return queries
        return [query]
    except Exception as exc:
        logger.warning(f"Failed to decompose query: {exc}")
        return [query]

async def extract_search_filters(query: str) -> dict:
    """
    Extract exact metadata filters from the user's query to pre-filter Qdrant.
    Looks for departments (e.g. pharmacy, engineering) and years.
    Returns dict like: {"department": "pharmacy", "year": "2023"}
    """
    import json
    prompt = (
        "You are an AI query metadata extractor. Extract any explicit metadata constraints "
        "mentioned in the following user query: "
        f"'{query}'\n\n"
        "Look for:\n"
        "1. 'department': e.g., 'pharmacy', 'engineering', 'hte', 'technical education'\n"
        "2. 'year': A specific 4 digit year e.g. '2022' or '2023'\n"
        "If a constraint is not explicitly mentioned, omit the key or set it to null.\n"
        "Return ONLY a raw JSON object, nothing else:\n"
        '{"department": "pharmacy", "year": "2023"}'
    )
    messages: list[LLMMessage] = [{"role": "user", "content": prompt}]
    raw_response = ""
    try:
        async for chunk in generate(messages, stream=False):
            raw_response += chunk
        clean_str = raw_response.strip()
        if clean_str.startswith("```"):
            clean_str = clean_str.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        if clean_str.startswith("json"):
            clean_str = clean_str[4:].strip()
        
        filters = json.loads(clean_str)
        if isinstance(filters, dict):
            # Clean up nulls
            return {k: v for k, v in filters.items() if v is not None}
        return {}
    except Exception as exc:
        logger.warning(f"Failed to extract search filters: {exc}")
        return {}
