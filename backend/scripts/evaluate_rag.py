"""
Lightweight RAGAs-style evaluation script for the HTE KnowledgeBase.
This script tests the RAG pipeline for:
1. Faithfulness (Is the answer grounded in the retrieved documents?)
2. Answer Relevance (Does the answer directly address the question?)

Usage:
  python -m scripts.evaluate_rag
"""

import asyncio
import json
import logging
from typing import Any

from google import genai
from pydantic import BaseModel

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.services.rag_pipeline import run_rag_pipeline
from app.models.user import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rag_eval")

class EvalResult(BaseModel):
    faithfulness_score: float
    relevance_score: float
    reasoning: str


# Set of mock queries that we expect the system to answer well
TEST_QUERIES = [
    "What is the income limit for the Rajarshi Chhatrapati Shahu Maharaj Shikshan Shulkh Shishyavrutti Yojna (EBC)?",
    "What are the attendance requirements to maintain a scholarship?",
    "Can a student apply for two state scholarships simultaneously?",
]


async def evaluate_answer_with_llm(question: str, answer: str, context: str) -> EvalResult:
    """Uses Gemini as a judge to evaluate the response."""
    client = genai.Client(api_key=settings.gemini_api_key)
    
    prompt = f"""
    You are an expert evaluator for a RAG (Retrieval-Augmented Generation) system.
    Evaluate the following Answer based on the Question and the Context provided.
    
    Question: {question}
    
    Context:
    {context}
    
    Answer:
    {answer}
    
    Provide two scores from 0.0 to 10.0:
    1. Faithfulness: How well is the answer grounded in the Context? (If the answer makes up facts not in the context, score 0).
    2. Relevance: How directly does the answer address the Question?
    
    Respond in strict JSON format:
    {{
        "faithfulness_score": 8.5,
        "relevance_score": 9.0,
        "reasoning": "Brief explanation of the scores."
    }}
    """
    
    try:
        response = await client.aio.models.generate_content(
            model='models/gemini-1.5-flash',
            contents=prompt,
        )
        # Parse JSON
        text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(text)
        return EvalResult(**data)
    except Exception as e:
        logger.error(f"Failed to evaluate answer: {e}")
        return EvalResult(faithfulness_score=0.0, relevance_score=0.0, reasoning=f"Eval error: {e}")


async def run_evaluation():
    logger.info("Starting RAG Evaluation...")
    
    # Mock user (Admin role for full access)
    mock_user = User(
        id="eval-user",
        email="eval@hte.gov.in",
        role="admin",
        department="hte"
    )
    
    results = []
    
    async with AsyncSessionLocal() as db:
        for i, question in enumerate(TEST_QUERIES):
            logger.info(f"Evaluating Q{i+1}: {question}")
            
            # 1. Run the RAG pipeline to get answer and context
            full_response = ""
            sources = []
            async for chunk in run_rag_pipeline(
                user=mock_user,
                message_text=question,
                conversation_id=None,
                language="english",
                mode="grounded",
                db=db
            ):
                if chunk.startswith("event: token\n"):
                    # Extract chunk content
                    try:
                        data = json.loads(chunk.split("data: ")[1])
                        full_response += data.get("content", "")
                    except:
                        pass
                elif chunk.startswith("event: sources\n"):
                    try:
                        data = json.loads(chunk.split("data: ")[1])
                        sources = data.get("sources", [])
                    except:
                        sources = []
            
            # Combine sources into a single context string
            context = "\n".join([f"Source {s.get('id')}: {s.get('snippet')}" for s in sources])
            
            # 2. Evaluate
            if not full_response:
                logger.warning(f"No response generated for Q{i+1}")
                continue
                
            eval_res = await evaluate_answer_with_llm(question, full_response, context)
            
            logger.info(f"Q{i+1} Faithfulness: {eval_res.faithfulness_score}/10")
            logger.info(f"Q{i+1} Relevance: {eval_res.relevance_score}/10")
            logger.info(f"Q{i+1} Reasoning: {eval_res.reasoning}")
            
            results.append(eval_res)
            
    # Compute aggregates
    if results:
        avg_faithfulness = sum(r.faithfulness_score for r in results) / len(results)
        avg_relevance = sum(r.relevance_score for r in results) / len(results)
        logger.info("\n=== EVALUATION SUMMARY ===")
        logger.info(f"Average Faithfulness: {avg_faithfulness:.2f}/10.0")
        logger.info(f"Average Relevance: {avg_relevance:.2f}/10.0")
    else:
        logger.info("No evaluations completed.")

if __name__ == "__main__":
    asyncio.run(run_evaluation())
