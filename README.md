# 🏛️ HTE KnowledgeBase AI

An AI-powered policy intelligence platform built for the **Higher & Technical Education Department, Government of Maharashtra**. It transforms how officers, faculty, institutions, and students search and understand official Government Resolutions (GRs) and circulars.

![HTE KnowledgeBase AI](https://via.placeholder.com/1200x400/1a73e8/ffffff?text=HTE+KnowledgeBase+AI+-+Intelligent+Policy+Search)

---

## 🌟 Key Features

- **🔍 Advanced RAG Pipeline**: Combines HyDE (Hypothetical Document Embeddings), query decomposition, and hybrid (dense + sparse) search for precise retrieval.
- **🛡️ Grounded & Source-Cited**: Answers are strictly generated from official Maharashtra GRs, with exact GR numbers, page numbers, and snippet citations. Zero hallucination.
- **🌐 Bilingual (English + Marathi)**: Native support for Marathi queries and documents. Preserves official government terminology in translation.
- **📄 AI Report Generator**: Automatically generates structured Policy Summaries, Compliance Checklists, and GR Comparisons.
- **🔒 On-Premise Privacy**: Uses a local Qdrant instance for vector storage. No document data or queries are stored on external vendor servers.
- **👮 Role-Based Access Control**: Tailored document visibility for Admins, Officers, Faculty, and Students.
- **🔎 Explainability & Audit Logs**: Every query is logged with its retrieved chunks, relevance scores, and confidence badges for total transparency.

---

## 🏗️ System Architecture

The platform uses a modern, decoupled architecture designed for high throughput and security.

```mermaid
graph TD
    %% Define Styles: White BG, Black Text, Colorful Strokes
    classDef default fill:#ffffff,stroke:#64748b,stroke-width:2px,color:#000000;
    classDef client fill:#ffffff,stroke:#3b82f6,stroke-width:3px,color:#000000,rx:8px,ry:8px;
    classDef backend fill:#ffffff,stroke:#f59e0b,stroke-width:3px,color:#000000,rx:8px,ry:8px;
    classDef db fill:#ffffff,stroke:#ef4444,stroke-width:3px,color:#000000,rx:8px,ry:8px;
    classDef ai fill:#ffffff,stroke:#10b981,stroke-width:3px,color:#000000,rx:8px,ry:8px;
    classDef feature fill:#f8fafc,stroke:#8b5cf6,stroke-width:2px,stroke-dasharray: 4 4,color:#000000,rx:8px,ry:8px;

    %% User & Client Layer
    User[👤 End User / Officer]:::client
    UI[🖥️ Next.js Frontend\nReact, TailwindCSS]:::client
    Speech[🎤 Speech-to-Text &\n🔊 Text-to-Speech\n(mr-IN, hi-IN, en-US)]:::feature
    
    %% Backend Orchestration
    API[⚙️ FastAPI Backend\nAuth, Rate Limiting, Orch.]:::backend
    Trans[🌐 Dynamic Multilingual\nTranslation Service]:::feature
    
    subgraph RAG_Pipeline [🧠 Advanced RAG Pipeline]
        style RAG_Pipeline fill:#f8fafc,stroke:#cbd5e1,stroke-width:2px,color:#000000,rx:8px,ry:8px
        Decomp[🧩 Query Decomposition\nSplit complex queries]:::backend
        HyDE[💡 HyDE\nGenerate Hypothetical Doc]:::backend
        Hybrid[🎯 Hybrid Search\nDense + Sparse Vectors]:::backend
    end
    
    %% Databases
    PG[(🐘 PostgreSQL\nUsers, Docs, Audit, Lineage)]:::db
    QD[(🎯 Qdrant\nLocal Vector Storage)]:::db
    
    %% AI Models
    LLM((🤖 Maha-AI / Gemini\nFlash LLM Gateway)):::ai
    Emb((🔢 FastEmbed\nEmbedding Model BM25)):::ai

    %% Connections
    User -->|Voice / Text Prompts| UI
    UI --- Speech
    UI -->|REST API / SSE Streams| API
    
    API <-->|Check Auth / Load Metadata| PG
    API -->|Translate Document Summaries| Trans
    Trans -.-> LLM
    
    API --> Decomp
    Decomp --> HyDE
    HyDE -->|Augmented Context| Hybrid
    
    Hybrid -->|1. Vectorize Query| Emb
    Hybrid -->|2. Exact Match| QD
    Hybrid -->|3. Retrieve Top Chunks| LLM
    
    LLM -.->|Synthesise & Cite Sources| API
    API -.->|Server-Sent Events| UI
```

---

## 🧠 Advanced RAG Workflow

When a user asks a complex question (e.g., *"What is the eligibility for the State Merit Scholarship and has it changed since 2022?"*), the system does not simply do a vector search. Instead, it uses a multi-step orchestration pipeline:

```mermaid
sequenceDiagram
    participant U as User
    participant P as Pipeline (FastAPI)
    participant E as Embeddings (Gemini + FastEmbed)
    participant Q as Qdrant
    participant X as Cross-Encoder (ms-marco)
    participant G as Gemini LLM

    U->>P: Policy Query
    
    rect rgb(240, 248, 255)
    Note over P, G: 1. Query Processing & Short-Circuit
    P->>G: Extract Metadata Filters (Dept, Dates)
    G-->>P: {"dept": "HTE", "year": "2022+"}
    
    alt is Simple Query (<6 words / exact GR)
        Note over P: ⚡ FAST PATH: Skip HyDE & Decomp
    else is Complex Query
        P->>G: Decompose Query (if multi-part)
        P->>G: HyDE: Generate Hypothetical Document
    end
    end
    
    rect rgb(255, 245, 238)
    Note over P, Q: 2. Parallel Hybrid Retrieval
    par Dense Embedding
        P->>E: Gemini (async)
    and Sparse Embedding
        P->>E: FastEmbed BM25 (to_thread)
    end
    E-->>P: Dense & Sparse Vectors
    
    P->>Q: Hybrid Vector Search + Filters
    Q-->>P: Top 20 Chunks (from GRs)
    end
    
    rect rgb(245, 255, 250)
    Note over P, G: 3. Reranking & Synthesis
    P->>X: ⚡ Batch predict() Top 20 Candidates
    X-->>P: Reranked High-Precision Context
    P->>G: Grounded System Prompt + Reranked Chunks
    G-->>P: Final Source-Cited Answer
    P->>P: Calculate Confidence Badge (Telemetry Logged)
    end
    
    P-->>U: Streamed Response + Citations
```

---

## 🚀 Tech Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), React 18, TailwindCSS v4, Framer Motion, Lucide Icons, React i18next |
| **Backend** | Python 3.10+, FastAPI, Pydantic, SQLAlchemy, Alembic, slowapi (Rate Limiting) |
| **Database** | PostgreSQL (Relational), Qdrant (Vector / Hybrid Search) |
| **AI / NLP** | Google Gemini (LLM), FastEmbed (Embeddings), LangChain Text Splitters, Tesseract (OCR) |
| **Integrations** | Maha-SSO (simulated), PDF parsing (`pypdf`, `pdf2image`) |

---

## ⚡ Performance Optimizations

To ensure sub-second retrieval times, the RAG pipeline implements several advanced optimizations:
- **Parallel Retrieval**: Dense (Gemini) and Sparse (BM25 FastEmbed) embeddings are generated concurrently using `asyncio.gather()`, safely offloading CPU-bound tasks.
- **Batched Cross-Encoder Reranking**: We use `ms-marco-MiniLM-L-6-v2` to rerank the top 20 candidates. The inputs are batched into a single C++/CUDA-optimized `.predict()` call, avoiding slow loops.
- **HyDE Short-Circuiting**: Simple queries (e.g. `< 6` words, or exact GR numbers) bypass the expensive LLM decomposition and HyDE generation steps entirely, dropping straight into the hybrid vector search for lightning-fast lookups.
- **Telemetry**: Full `time.perf_counter()` instrumentation tracks the exact latency of Qdrant and the Cross-Encoder per query.

---

## 💻 Local Development Setup

Follow these steps to run the HTE KnowledgeBase AI on your local machine.

### 1. Prerequisites
- **Node.js** (v18+ recommended)
- **Python** (v3.10+ recommended)
- **PostgreSQL** running locally (or via Docker)
- **Qdrant** running locally (or via Docker)

### 2. Backend Setup
Navigate to the `backend` directory and set up the Python environment:

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**Environment Variables:**
Create a `.env` file in the `backend` directory:
```ini
# Database configuration
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/hte_db
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_key # Optional if running locally without auth

# Security
SECRET_KEY=your_super_secret_jwt_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI Configuration
GEMINI_API_KEY=your_google_gemini_api_key
```

**Initialize Database:**
```bash
# Run Alembic migrations to create tables
alembic upgrade head

# Start the FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
The backend API will be available at `http://localhost:8000`.

### 3. Frontend Setup
Navigate to the `app` (frontend) directory:

```bash
cd ../app

# Install dependencies
npm install
# or
pnpm install

# Start the Next.js development server
npm run dev
```
The frontend application will be available at `http://localhost:3000`.

---

## 📂 Project Structure

```text
VJTI-AI-/
├── app/                        # Next.js Frontend App Router
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Main App entry (AppShell container)
│   └── globals.css             # Tailwind & theme variables
│
├── components/                 # Frontend React Components
│   ├── about/                  # About page with architecture details
│   ├── chat/                   # AI Assistant UI (Streaming, Dictation, Citations)
│   ├── layout/                 # AppShell, Topbar, Sidebar, Command Palette
│   ├── reports/                # AI Report Generator tool
│   └── documents/              # Document Library & Search
│
├── backend/                    # FastAPI Backend
│   ├── alembic/                # Database migration scripts
│   ├── app/
│   │   ├── api/                # API route controllers (documents, chat, auth)
│   │   ├── core/               # Security, config, dependencies
│   │   ├── models/             # SQLAlchemy DB models (User, AuditLog, Chat)
│   │   └── services/           # Business logic
│   │       ├── rag_pipeline.py # Orchestrator for RAG (Decomp, HyDE, Search)
│   │       ├── llm_service.py  # Abstraction layer for Gemini LLM calls
│   │       └── retrieval_service.py # Qdrant vector database operations
│   ├── scripts/                # Data ingestion and DB reset utilities
│   └── requirements.txt        # Python dependencies
│
└── README.md                   # This file
```

---

## 📊 Key Use Cases

1. **Policy Clarification**: An officer wants to know if a 2018 GR on scholarship eligibility was superseded. The system detects the supersession and cites the 2021 amendment.
2. **Compliance Auditing**: A university administrator uploads a new AICTE circular and uses the **Report Generator** to instantly extract a compliance checklist with deadlines.
3. **Cross-Language Access**: A student asks a question in Marathi regarding hostel fee concessions. The system retrieves the Marathi GR, processes it, and replies in Marathi using official phrasing.

---

## 🤝 Contributing & Team

Built by the **VJTI AI Research Team** in collaboration with the **Higher & Technical Education Department**.
Historical GR dataset indexing powered by [orgpedia/mahGRs](https://github.com/orgpedia/mahGRs).

---

*For technical support or feature requests, please refer to the internal HTE IT documentation or raise an issue in the repository.*
