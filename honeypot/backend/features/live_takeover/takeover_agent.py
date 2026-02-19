"""
Live Takeover Agent - LangGraph Brain
Specialized agent for real-time scam engagement with dual modes:
- AI Takeover: Agent generates responses with cloned voice
- AI Coached: Agent generates scripts for user to speak

Does NOT replace existing HoneyPotAgent. Separate graph.
"""

import operator
import logging
from typing import Annotated, Any, Dict, List, Optional, Sequence, TypedDict

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, StateGraph

from config import settings
from features.live_takeover.takeover_prompts import (
    LIVE_TAKEOVER_SYSTEM_PROMPT,
    SCAMMER_ANALYSIS_PROMPT,
    STALL_STRATEGY_PROMPT,
    AI_RESPONSE_PROMPT,
    COACHING_SCRIPT_PROMPT,
    URGENCY_NATURALIZER_PROMPT,
)

logger = logging.getLogger("live_takeover.agent")


# ── State Definition ──────────────────────────────────────────────────

class TakeoverState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    mode: str                          # "ai_takeover" | "ai_coached"
    scammer_text: str                  # Latest scammer utterance
    intent: str                        # Detected intent
    emotion: str                       # Scammer emotional tone
    threat_level: float                # 0.0 - 1.0
    scam_tactics: List[str]            # Detected manipulation tactics
    stall_strategy: str                # Chosen stalling approach
    extracted_data: Dict[str, Any]     # Quick-extracted entities
    ai_response: str                   # For mode=ai_takeover
    coaching_scripts: List[Dict]       # For mode=ai_coached
    turn_count: int
    language: str


# ── Agent Implementation ──────────────────────────────────────────────

class LiveTakeoverAgent:
    """
    Specialized LangGraph agent for live scam engagement.
    Separate from core HoneyPotAgent - additive only.
    """
    
    def __init__(self):
        self.groq_key = settings.GROQ_API_KEY
        self.gemini_key = settings.GEMINI_API_KEY
        
        # Primary LLM (Groq - fast for real-time)
        if self.groq_key:
            self.llm = ChatGroq(
                temperature=0.7,
                model_name="llama-3.3-70b-versatile",
                api_key=self.groq_key
            )
            self.fast_llm = ChatGroq(
                temperature=0.5,
                model_name="llama-3.3-70b-versatile",
                api_key=self.groq_key
            )
        else:
            self.llm = None
            self.fast_llm = None
        
        # Fallback LLM (Gemini)
        if self.gemini_key:
            self.fallback_llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash-lite",
                google_api_key=self.gemini_key
            )
        else:
            self.fallback_llm = None
        
        self.workflow = self._build_graph()
    
    def _get_llm(self, fast: bool = False):
        if fast and self.fast_llm:
            return self.fast_llm
        return self.llm if self.llm else self.fallback_llm
    
    # ── Graph Nodes ───────────────────────────────────────────────

    def _analyze_scammer(self, state: TakeoverState) -> dict:
        """Node 1: Deep analysis of scammer's latest message."""
        llm = self._get_llm(fast=True)
        if not llm:
            return {
                "intent": "suspicious",
                "emotion": "unknown",
                "threat_level": 0.5,
                "scam_tactics": ["unknown"],
                "extracted_data": {}
            }
        
        messages = state["messages"]
        history_text = "\n".join(
            [f"{'Scammer' if isinstance(m, HumanMessage) else 'You'}: {m.content}" 
             for m in messages[-8:]]
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", SCAMMER_ANALYSIS_PROMPT),
            ("user", "Conversation:\n{history}\n\nLatest scammer message: {latest}")
        ])
        
        chain = prompt | llm | JsonOutputParser()
        
        try:
            result = chain.invoke({
                "history": history_text,
                "latest": state["scammer_text"]
            })
            return {
                "intent": result.get("intent", "suspicious"),
                "emotion": result.get("emotion", "neutral"),
                "threat_level": min(max(float(result.get("threat_level", 0.5)), 0.0), 1.0),
                "scam_tactics": result.get("tactics", []),
                "extracted_data": result.get("extracted_data", {})
            }
        except Exception as e:
            logger.error(f"Scammer analysis failed: {e}")
            return {
                "intent": "suspicious",
                "emotion": "neutral", 
                "threat_level": 0.5,
                "scam_tactics": [],
                "extracted_data": {}
            }
    
    def _plan_strategy(self, state: TakeoverState) -> dict:
        """Node 2: Choose stalling/engagement strategy."""
        llm = self._get_llm(fast=True)
        if not llm:
            return {"stall_strategy": "confusion"}
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", STALL_STRATEGY_PROMPT),
            ("user", (
                "Scammer intent: {intent}\n"
                "Emotion: {emotion}\n"
                "Threat level: {threat_level}\n"
                "Tactics used: {tactics}\n"
                "Turn count: {turn_count}\n"
                "Language: {language}"
            ))
        ])
        
        chain = prompt | llm | StrOutputParser()
        
        try:
            strategy = chain.invoke({
                "intent": state["intent"],
                "emotion": state["emotion"],
                "threat_level": state["threat_level"],
                "tactics": ", ".join(state["scam_tactics"]),
                "turn_count": state["turn_count"],
                "language": state["language"]
            })
            return {"stall_strategy": strategy.strip()}
        except Exception as e:
            logger.error(f"Strategy planning failed: {e}")
            return {"stall_strategy": "Ask for clarification and express confusion."}
    
    def _generate_ai_response(self, state: TakeoverState) -> dict:
        """Node 3a: Generate direct AI response (for ai_takeover mode)."""
        llm = self._get_llm()
        if not llm:
            return {
                "ai_response": "Hmm... I'm not sure about that. Can you explain again?",
                "turn_count": state["turn_count"] + 1
            }
        
        history_text = "\n".join(
            [f"{'Scammer' if isinstance(m, HumanMessage) else 'You'}: {m.content}" 
             for m in state["messages"][-10:]]
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", LIVE_TAKEOVER_SYSTEM_PROMPT + "\n\n" + AI_RESPONSE_PROMPT),
            ("user", (
                "Conversation:\n{history}\n\n"
                "Strategy: {strategy}\n"
                "Language: {language}\n"
                "Scammer said: {scammer_text}"
            ))
        ])
        
        chain = prompt | llm | StrOutputParser()
        
        try:
            response = chain.invoke({
                "history": history_text,
                "strategy": state["stall_strategy"],
                "language": state["language"],
                "scammer_text": state["scammer_text"]
            })
            return {
                "ai_response": response.strip(),
                "turn_count": state["turn_count"] + 1
            }
        except Exception as e:
            logger.error(f"AI response generation failed: {e}")
            return {
                "ai_response": "Sorry, I'm having trouble hearing you... can you repeat?",
                "turn_count": state["turn_count"] + 1
            }
    
    def _generate_coaching_scripts(self, state: TakeoverState) -> dict:
        """Node 3b: Generate script options for user (for ai_coached mode)."""
        llm = self._get_llm()
        if not llm:
            return {
                "coaching_scripts": [
                    {"text": "I don't understand. Can you explain?", "tone": "confused", "reasoning": "Stall"},
                    {"text": "Hold on, let me check that.", "tone": "cooperative", "reasoning": "Buy time"}
                ],
                "turn_count": state["turn_count"] + 1
            }
        
        history_text = "\n".join(
            [f"{'Scammer' if isinstance(m, HumanMessage) else 'You'}: {m.content}" 
             for m in state["messages"][-8:]]
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", LIVE_TAKEOVER_SYSTEM_PROMPT + "\n\n" + COACHING_SCRIPT_PROMPT),
            ("user", (
                "Conversation:\n{history}\n\n"
                "Strategy: {strategy}\n"
                "Language: {language}\n"
                "Scammer said: {scammer_text}"
            ))
        ])
        
        chain = prompt | llm | JsonOutputParser()
        
        try:
            result = chain.invoke({
                "history": history_text,
                "strategy": state["stall_strategy"],
                "language": state["language"],
                "scammer_text": state["scammer_text"]
            })
            
            scripts = result.get("scripts", [])
            if not scripts:
                scripts = [
                    {"text": "I need a moment to think about that.", "tone": "hesitant", "reasoning": "Buy time"}
                ]
            
            return {
                "coaching_scripts": scripts[:3],  # Max 3 options
                "turn_count": state["turn_count"] + 1
            }
        except Exception as e:
            logger.error(f"Coaching script generation failed: {e}")
            return {
                "coaching_scripts": [
                    {"text": "I don't understand. Can you explain?", "tone": "confused", "reasoning": "Stall"},
                    {"text": "Wait, let me check my phone.", "tone": "cooperative", "reasoning": "Buy time"},
                    {"text": "Did you say that number again? I missed it.", "tone": "curious", "reasoning": "Extract info"}
                ],
                "turn_count": state["turn_count"] + 1
            }
    
    def _naturalize_response(self, state: TakeoverState) -> dict:
        """Node 4: Add natural speech patterns (only for ai_takeover mode)."""
        if state["mode"] != "ai_takeover":
            return {}
        
        llm = self._get_llm(fast=True)
        if not llm:
            return {}
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", URGENCY_NATURALIZER_PROMPT),
            ("user", "Language: {language}\nThreat level: {threat_level}\nText: {text}")
        ])
        
        chain = prompt | llm | StrOutputParser()
        
        try:
            naturalized = chain.invoke({
                "language": state["language"],
                "threat_level": state["threat_level"],
                "text": state["ai_response"]
            })
            return {"ai_response": naturalized.strip()}
        except Exception:
            return {}  # Keep original response  

    # ── Mode Router ───────────────────────────────────────────────

    def _route_by_mode(self, state: TakeoverState) -> str:
        """Conditional edge: route to different nodes based on mode."""
        if state["mode"] == "ai_coached":
            return "generate_scripts"
        return "generate_response"
    
    # ── Graph Assembly ────────────────────────────────────────────

    def _build_graph(self) -> Any:
        workflow = StateGraph(TakeoverState)
        
        # Add nodes
        workflow.add_node("analyze", self._analyze_scammer)
        workflow.add_node("strategize", self._plan_strategy)
        workflow.add_node("generate_response", self._generate_ai_response)
        workflow.add_node("generate_scripts", self._generate_coaching_scripts)
        workflow.add_node("naturalize", self._naturalize_response)
        
        # Set entry
        workflow.set_entry_point("analyze")
        
        # Edges
        workflow.add_edge("analyze", "strategize")
        
        # Conditional routing based on mode
        workflow.add_conditional_edges(
            "strategize",
            self._route_by_mode,
            {
                "generate_response": "generate_response",
                "generate_scripts": "generate_scripts"
            }
        )
        
        workflow.add_edge("generate_response", "naturalize")
        workflow.add_edge("naturalize", END)
        workflow.add_edge("generate_scripts", END)
        
        return workflow.compile()
    
    # ── Public API ────────────────────────────────────────────────

    async def run(
        self,
        scammer_text: str,
        history: List[Dict[str, str]],
        mode: str = "ai_takeover",
        language: str = "en",
        turn_count: int = 0
    ) -> Dict[str, Any]:
        """
        Run the takeover agent for a single turn.
        
        Args:
            scammer_text: Latest scammer message
            history: Conversation history [{"role": "scammer"|"agent", "content": "..."}]
            mode: "ai_takeover" or "ai_coached"
            language: Detected language code
            turn_count: Current turn number
            
        Returns:
            {
                "ai_response": str (if ai_takeover),
                "coaching_scripts": list (if ai_coached),
                "intent": str,
                "emotion": str,
                "threat_level": float,
                "scam_tactics": list,
                "extracted_data": dict,
                "stall_strategy": str
            }
        """
        # Convert history to LangChain messages
        lc_messages = []
        for h in history:
            if h["role"] == "scammer":
                lc_messages.append(HumanMessage(content=h["content"]))
            elif h["role"] == "agent":
                lc_messages.append(AIMessage(content=h["content"]))
        
        initial_state: TakeoverState = {
            "messages": lc_messages,
            "mode": mode,
            "scammer_text": scammer_text,
            "intent": "",
            "emotion": "",
            "threat_level": 0.0,
            "scam_tactics": [],
            "stall_strategy": "",
            "extracted_data": {},
            "ai_response": "",
            "coaching_scripts": [],
            "turn_count": turn_count,
            "language": language
        }
        
        try:
            result = await self.workflow.ainvoke(initial_state)
            
            output = {
                "intent": result.get("intent", "unknown"),
                "emotion": result.get("emotion", "unknown"),
                "threat_level": result.get("threat_level", 0.0),
                "scam_tactics": result.get("scam_tactics", []),
                "extracted_data": result.get("extracted_data", {}),
                "stall_strategy": result.get("stall_strategy", "")
            }
            
            if mode == "ai_takeover":
                output["ai_response"] = result.get("ai_response", "I'm sorry, I didn't catch that.")
            else:
                output["coaching_scripts"] = result.get("coaching_scripts", [])
            
            return output
            
        except Exception as e:
            logger.error(f"Live takeover agent error: {e}", exc_info=True)
            
            if mode == "ai_takeover":
                return {
                    "ai_response": "Uh... hold on, my phone is acting up. Can you say that again?",
                    "intent": "error",
                    "emotion": "unknown",
                    "threat_level": 0.5,
                    "scam_tactics": [],
                    "extracted_data": {},
                    "stall_strategy": "error_recovery"
                }
            else:
                return {
                    "coaching_scripts": [
                        {"text": "Can you repeat that? I didn't hear properly.", "tone": "confused", "reasoning": "Safe stall"},
                        {"text": "Hold on, someone's at the door.", "tone": "distracted", "reasoning": "Buy time"}
                    ],
                    "intent": "error",
                    "emotion": "unknown",
                    "threat_level": 0.5,
                    "scam_tactics": [],
                    "extracted_data": {},
                    "stall_strategy": "error_recovery"
                }


# Module-level singleton
    async def get_coaching_suggestions(
        self,
        conversation: str,
        entities: List[Dict],
        threat_level: float,
        tactics: List[str]
    ) -> Dict[str, Any]:
        """
        Generate real-time coaching suggestions for operator during live call.
        Used by live_call.py for AI assistance.
        
        Args:
            conversation: Recent conversation transcript
            entities: Extracted entities so far
            threat_level: Current threat assessment (0.0-1.0)
            tactics: Detected scam tactics
        
        Returns:
            {
                "suggestions": ["suggestion 1", "suggestion 2", ...],
                "recommended_response": "Full response operator can use",
                "warning": "Optional warning message"
            }
        """
        try:
            llm = self._get_llm()
            
            # Format entities for prompt
            entities_str = "\n".join([
                f"- {e.get('type', 'unknown')}: {e.get('value', 'N/A')}"
                for e in entities
            ]) or "None detected yet"
            
            # Format tactics
            tactics_str = ", ".join(tactics) or "None detected yet"
            
            # Create coaching prompt
            prompt = f"""You are an AI assistant helping a honeypot operator during a live scam call.

**Current Conversation:**
{conversation}

**Extracted Intelligence:**
{entities_str}

**Detected Tactics:** {tactics_str}
**Threat Level:** {threat_level * 100:.0f}%

**Task:** Provide real-time coaching to help the operator extract more information from the scammer.

**Guidelines:**
- Suggest 3-5 specific questions or statements the operator should say
- Recommend one complete response they can use immediately
- Focus on extracting: names, phone numbers, addresses, payment details, organizational info
- Keep the scammer engaged and talking
- Use stalling tactics (technical issues, confusion, eagerness)
- If threat level is high, add a warning

**Output Format (JSON):**
{{
    "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"],
    "recommended_response": "Complete response operator can say right now",
    "warning": "Optional warning if needed"
}}"""

            response = await llm.ainvoke([HumanMessage(content=prompt)])
            
            # Parse JSON response
            try:
                import json
                result = json.loads(response.content)
            except:
                # Fallback if not valid JSON
                result = {
                    "suggestions": [
                        "Ask for more specific details about their organization",
                        "Request a callback number to verify identity",
                        "Express concern and ask for proof of legitimacy",
                        "Stall by mentioning you need to check with someone",
                        "Ask about payment methods and why they need it urgently"
                    ],
                    "recommended_response": "I understand, but before we proceed, can you provide me with a direct callback number so I can verify this is legitimate? I want to make sure I'm not being scammed.",
                    "warning": "⚠️ High pressure tactics detected - remain calm and skeptical" if threat_level > 0.7 else None
                }
            
            return result
        
        except Exception as e:
            logger.error(f"Coaching generation error: {e}", exc_info=True)
            return {
                "suggestions": [
                    "Keep them talking with open-ended questions",
                    "Ask for verification details",
                    "Stall for time to extract more information"
                ],
                "recommended_response": "Can you tell me more about why you're contacting me?",
                "warning": None
            }


takeover_agent = LiveTakeoverAgent()
