"""
CPMS AI Assistant Engine
Assessment 8.3: AI Feature Integration - AI Case Summary Assistant
Provides genuine legal text summarization and structured entity extraction.
Supports:
1. Local Neural/Graph-based NLP Summarizer (Sumy LexRank/TextRank + NLP Entity Extraction)
2. Cloud AI Engine (Google Gemini REST API if GEMINI_API_KEY is configured)
"""

import os
import re
import json
from typing import Dict, Any, List, Optional
import httpx

# Local NLP imports
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lex_rank import LexRankSummarizer
from sumy.summarizers.text_rank import TextRankSummarizer
from sumy.summarizers.luhn import LuhnSummarizer

ABBREVIATIONS = {
    r"\bRs\.\s*": "Rs_DOT_ ",
    r"\bv\.\s*": "v_DOT_ ",
    r"\bvs\.\s*": "vs_DOT_ ",
    r"\bSec\.\s*": "Sec_DOT_ ",
    r"\bNo\.\s*": "No_DOT_ ",
    r"\bAdv\.\s*": "Adv_DOT_ ",
    r"\bLtd\.\s*": "Ltd_DOT_ ",
    r"\bPvt\.\s*": "Pvt_DOT_ ",
    r"\bCo\.\s*": "Co_DOT_ ",
    r"\bHon\.\s*": "Hon_DOT_ ",
    r"\bOrs\.\s*": "Ors_DOT_ ",
    r"\bArt\.\s*": "Art_DOT_ "
}

def protect_abbreviations(text: str) -> str:
    for pattern, repl in ABBREVIATIONS.items():
        text = re.sub(pattern, repl, text, flags=re.IGNORECASE)
    return text

def restore_abbreviations(text: str) -> str:
    for pattern, repl in ABBREVIATIONS.items():
        orig = pattern.replace(r"\b", "").replace(r"\s*", " ").replace(r"\.", ".")
        text = text.replace(repl.strip(), orig.strip())
    return text

class AICaseSummaryAssistant:
    def __init__(self):
        self.tokenizer = Tokenizer("english")
        self.lex_summarizer = LexRankSummarizer()
        self.textrank_summarizer = TextRankSummarizer()
        self.luhn_summarizer = LuhnSummarizer()

    def extract_legal_entities(self, text: str) -> Dict[str, Any]:
        """
        Extracts legal entities, dates, acts, financial claims, and parties from case text.
        """
        # 1. Parties extraction
        parties = {
            "plaintiff": "Not explicitly named",
            "defendant": "Not explicitly named"
        }
        
        p_match = re.search(r"(?:plaintiff|petitioner|appellant)\s*[:\-,]?\s*([A-Z][a-zA-Z0-9\s,\.&]{2,30}?)(?:\s+(?:has|filed|approached|sues|claims|is|against)|\.|\n|,)", text, re.IGNORECASE)
        if p_match:
            parties["plaintiff"] = p_match.group(1).strip()
        else:
            vs_match = re.search(r"([A-Z][a-zA-Z\s\.\&]{2,30}?)\s+(?:v\.|vs\.|versus)\s+([A-Z][a-zA-Z\s\.\&]{2,30}?)(?:\s|\n|,|\.)", text)
            if vs_match:
                parties["plaintiff"] = vs_match.group(1).strip()
                parties["defendant"] = vs_match.group(2).strip()

        d_match = re.search(r"(?:defendant|respondent|accused)\s*[:\-,]?\s*([A-Z][a-zA-Z0-9\s,\.&]{2,30}?)(?:\s+(?:failed|breached|denied|is|refused)|\.|\n|,)", text, re.IGNORECASE)
        if d_match:
            parties["defendant"] = d_match.group(1).strip()

        # 2. Acts and Statutory Sections
        acts_pattern = r"(?:Section\s+\d+[A-Z]?(?:\s*\([0-9a-z]+\))?(?:\s+of\s+the\s+[\w\s]+Act(?:,\s*\d{4})?)?|Order\s+[IVXLCDM]+(?:\s+Rule\s+\d+)?|Article\s+\d+|[\w\s]+(?:Act|Code|Rules),\s*\d{4})"
        acts_found = list(set(re.findall(acts_pattern, text, re.IGNORECASE)))
        acts_clean = [a.strip() for a in acts_found if 5 < len(a.strip()) < 80][:6]

        # 3. Monetary and Financial Claims
        money_pattern = r"(?:Rs\.?|INR|Rupees|\$|USD)\s*[\d,]+(?:\s*(?:lakhs?|crores?|million|thousand))?|\b\d+\s*(?:lakhs?|crores?)\b"
        monetary_claims = list(set(re.findall(money_pattern, text, re.IGNORECASE)))[:5]

        # 4. Dates
        date_pattern = r"\b(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b"
        dates_found = list(set(re.findall(date_pattern, text, re.IGNORECASE)))[:6]

        # 5. Relief / Prayer Identification
        prayer_keywords = ["specific performance", "damages", "injunction", "compensation", "possession", "quash", "bail", "recovery", "eviction", "rectification", "refund"]
        relief_sought = [kw.title() for kw in prayer_keywords if kw in text.lower()]

        return {
            "parties": parties,
            "statutory_references": acts_clean if acts_clean else ["Relevant Provisions of Substantive Law"],
            "monetary_claims": monetary_claims if monetary_claims else ["Unliquidated Damages / Non-Monetary Relief"],
            "relevant_dates": dates_found if dates_found else ["Dates specified in pleadings"],
            "relief_categories": relief_sought if relief_sought else ["Judicial Determination and Declaratory Relief"]
        }

    def summarize_local(self, text: str, sentence_count: int = 3, algorithm: str = "lexrank") -> Dict[str, Any]:
        """
        Executes genuine local NLP summarization using LexRank/TextRank algorithms.
        """
        clean_text = text.strip()
        if not clean_text:
            raise ValueError("Input text cannot be empty.")

        protected_text = protect_abbreviations(clean_text)
        parser = PlaintextParser.from_string(protected_text, self.tokenizer)
        
        # Choose summarizer
        if algorithm == "textrank":
            summarizer = self.textrank_summarizer
            method_name = "TextRank Graph Centrality (Mihalcea & Tarau)"
        elif algorithm == "luhn":
            summarizer = self.luhn_summarizer
            method_name = "Luhn High-Frequency Metric"
        else:
            summarizer = self.lex_summarizer
            method_name = "LexRank Cosine Saliency (Erkan & Radev)"

        summary_sentences = summarizer(parser.document, sentence_count)
        ranked_sentences = [restore_abbreviations(str(s).strip()) for s in summary_sentences]
        
        # If text is too short for requested sentence count, fallback gracefully
        if not ranked_sentences:
            sentences = [restore_abbreviations(s.strip()) for s in protected_text.split(".") if len(s.strip()) > 10]
            ranked_sentences = sentences[:sentence_count]

        executive_summary = " ".join(ranked_sentences)
        entities = self.extract_legal_entities(clean_text)

        word_count_original = len(clean_text.split())
        word_count_summary = len(executive_summary.split())
        compression_ratio = round((1.0 - (word_count_summary / max(word_count_original, 1))) * 100, 1)

        return {
            "status": "success",
            "engine": "local_nlp",
            "algorithm": method_name,
            "executive_summary": executive_summary,
            "key_points": ranked_sentences,
            "extracted_entities": entities,
            "metrics": {
                "original_words": word_count_original,
                "summary_words": word_count_summary,
                "compression_ratio": f"{max(0, compression_ratio)}%"
            },
            "recommendation": self._generate_procedural_recommendation(entities, clean_text)
        }

    def _generate_procedural_recommendation(self, entities: Dict[str, Any], text: str) -> str:
        reliefs = entities.get("relief_categories", [])
        if "Specific Performance" in reliefs:
            return "Verify proof of continuous readiness and willingness (Sec 16(c) Specific Relief Act) and registered agreement copy."
        elif "Damages" in reliefs or "Compensation" in reliefs or "Refund" in reliefs:
            return "Scrutinize proof of actual pecuniary loss, invoices, bank statements, and mitigation efforts."
        elif "Injunction" in reliefs:
            return "Test for prima facie case, balance of convenience, and irreparable injury before granting interlocutory orders."
        else:
            return "Ensure all exhibits and affidavits in support of pleadings are indexed before the initial hearing."

    async def summarize_gemini(self, text: str, api_key: str) -> Dict[str, Any]:
        """
        Calls Google Gemini API for abstractive legal summarization when an API key is provided.
        """
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        prompt = f"""
You are an AI Judicial Legal Assistant for a Court Proceedings Management System (CPMS).
Analyze the following case facts and provide a structured JSON response:
{{
  "executive_summary": "2-3 sentence clear legal executive summary",
  "key_points": ["point 1", "point 2", "point 3"],
  "parties": {{"plaintiff": "...", "defendant": "..."}},
  "legal_issues": ["issue 1", "issue 2"],
  "procedural_recommendation": "recommendation for judge or court staff"
}}

Case Text:
{text}
"""
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.2,
                "response_mime_type": "application/json"
            }
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                raise Exception(f"Gemini API returned {resp.status_code}: {resp.text}")
            
            data = resp.json()
            raw_content = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(raw_content)

            return {
                "status": "success",
                "engine": "gemini_cloud",
                "algorithm": "Gemini 1.5 Flash Neural LLM",
                "executive_summary": parsed.get("executive_summary", ""),
                "key_points": parsed.get("key_points", []),
                "extracted_entities": {
                    "parties": parsed.get("parties", {}),
                    "legal_issues": parsed.get("legal_issues", [])
                },
                "recommendation": parsed.get("procedural_recommendation", "")
            }

ai_assistant = AICaseSummaryAssistant()
