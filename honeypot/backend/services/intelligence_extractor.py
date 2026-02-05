import re
import logging
from typing import Dict, List
import os
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from db.mongo import db
from db.models import Intelligence
from config import settings

logger = logging.getLogger("intelligence")

class IntelligenceExtractor:
    def __init__(self):
        self.groq_key = settings.GROQ_API_KEY
        if self.groq_key:
            self.llm = ChatGroq(temperature=0, model_name="llama-3.3-70b-versatile", api_key=self.groq_key)
        else:
            self.llm = None
    
    async def extract(self, session_id: str, message: str, history: List[Dict] = None):
        """
        Extracts entities from the message and updates the session intelligence.
        """
        # 1. Regex Extraction (Initial pass)
        extracted = self._regex_extract(message)
        
        # 2. LLM Extraction (The "Brain" - resolves overlap/ambiguity)
        if self.llm:
            try:
                context = ""
                if history:
                    context = "Conversation history for context:\n" + "\n".join([f"{m['role']}: {m['content']}" for m in history[-5:]])
                
                prompt = ChatPromptTemplate.from_template(
                    "You are a Forensic Intelligence Analyst for a High-Tech Honeypot. \n"
                    "Your task is to extract actionable scam intelligence from the latest message while avoiding false positives.\n\n"
                    "{context}\n\n"
                    "LATEST MESSAGE: '{text}'\n\n"
                    "STRICT INSTRUCTIONS:\n"
                    "1. bank_accounts: Usually 9-18 digits. Often mentioned with bank names or 'send here'.\n"
                    "2. phone_numbers: STRICTLY 10 digits for India/Local. If a number is 10 digits, it is likely a phone number UNLESS context strongly implies otherwise.\n"
                    "3. upi_ids: Format like 'name@bank' or 'mobile@upi'.\n"
                    "4. urls: Phishing or suspicious links.\n"
                    "5. scam_keywords: Urgent terms like 'blocked', 'suspended', 'verify', 'KYC', 'lottery'.\n"
                    "6. behavioral_tactics: Urgency, Authority, Sympathy, Fear.\n\n"
                    "Return ONLY valid JSON with these keys: bank_accounts, upi_ids, phone_numbers, urls, scam_keywords, behavioral_tactics. "
                    "Use lists of strings. Empty lists if none detected."
                )
                chain = prompt | self.llm | JsonOutputParser()
                llm_result = await chain.ainvoke({"text": message, "context": context})
                
                # Merge LLM results (LLM takes precedence for disambiguating 10-digit numbers)
                for key in ["bank_accounts", "upi_ids", "phone_numbers", "urls", "scam_keywords", "behavioral_tactics"]:
                    if key in llm_result and isinstance(llm_result[key], list):
                        extracted[key].extend([str(item) for item in llm_result[key]])
            except Exception as e:
                logger.error(f"LLM Extraction failed: {e}")

        # 3. Save to DB (Atomic Update with Deduplication)
        # We fetch, merge, and update.
        session = await db.sessions.find_one({"session_id": session_id})
        if not session:
            return

        current_intel = session.get("extracted_intelligence", {})
        
        # Merge lists and deduplicate
        updates = {}
        for key in ["bank_accounts", "upi_ids", "phone_numbers", "urls", "scam_keywords", "behavioral_tactics"]:
            old_list = current_intel.get(key, [])
            new_items = extracted.get(key, [])
            combined = list(set(old_list + new_items))
            updates[f"extracted_intelligence.{key}"] = combined
            
        await db.sessions.update_one({"session_id": session_id}, {"$set": updates})
        logger.info(f"Updated intelligence for {session_id}")

    def _regex_extract(self, text: str) -> Dict[str, List[str]]:
        data = {
            "bank_accounts": [],
            "upi_ids": [],
            "phone_numbers": [],
            "urls": [],
            "scam_keywords": [],
            "behavioral_tactics": []
        }
        
        # Regex Patterns
        patterns = {
            "urls": r"https?://\S+",
            "upi_ids": r"[\w\.\-_]+@[\w]+",
            "phone_numbers": r"\b[6-9]\d{9}\b",  # India specific mobile starts with 6-9
            "bank_accounts": r"\b\d{11,18}\b"   # Most bank accounts are longer than 10 digits
        }
        
        for key, pat in patterns.items():
            matches = re.findall(pat, text)
            data[key] = matches
            
        return data

extraction_service = IntelligenceExtractor()
