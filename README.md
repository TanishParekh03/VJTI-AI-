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
    %% Define Styles
    classDef client fill:#f8f9fc,stroke:#1a73e8,stroke-width:2px,color:#1a73e8;
    classDef backend fill:#fdf8ec,stroke:#fbbc05,stroke-width:2px,color:#b07b00;
    classDef db fill:#fce8e6,stroke:#ea4335,stroke-width:2px,color:#c5221f;
    classDef ai fill:#e6f4ea,stroke:#34a853,stroke-width:2px,color:#137333;

    %% Components
    User[👤 End User / Officer]:::client
    UI[🖥️ Next.js Frontend\nReact, TailwindCSS]:::client
    
    API[⚙️ FastAPI Backend\nAuth, Rate Limiting, Orch.]:::backend
    RAG[🧠 RAG Pipeline\nHyDE, Decomposition, Hybrid Search]:::backend
    
    PG[(🐘 PostgreSQL\nUsers, Chat History, Audit)]:::db
    QD[(🎯 Qdrant\nVector Embeddings)]:::db
    
    LLM((🤖 Google Gemini\nFlash/Pro LLM)):::ai
    Emb((🔢 FastEmbed\nEmbedding Model)):::ai

    %% Connections
    User -->|Prompts / UI clicks| UI
    UI -->|REST API / SSE| API
    
    API <-->|Auth & Metadata| PG
    API <--> RAG
    
    RAG -->|1. Generate HyDE / Decompose| LLM
    RAG -->|2. Embed Queries| Emb
    RAG -->|3. Hybrid Search| QD
    RAG -->|4. Synthesis| LLM
    
    LLM -.->|Streaming Response| API
    API -.->|Server-Sent Events| UI
```

---

## 🧠 Advanced RAG Workflow

When a user asks a complex question (e.g., *"What is the eligibility for the State Merit Scholarship and has it changed since 2022?"*), the system does not simply do a vector search. Instead, it uses a multi-step orchestration pipeline:

```mermaid
sequenceDiagram
    participant U as User
    participant P as Pipeline (FastAPI)
    participant E as FastEmbed
    participant Q as Qdrant
    participant G as Gemini LLM

    U->>P: Complex Policy Query
    
    rect rgb(240, 248, 255)
    Note over P, G: 1. Query Processing
    P->>G: Extract Metadata Filters (Dept, Dates)
    G-->>P: {"dept": "HTE", "year": "2022+"}
    P->>G: Decompose Query (if multi-part)
    G-->>P: [Sub-Query 1, Sub-Query 2]
    P->>G: HyDE: Generate Hypothetical Document
    G-->>P: "Mock official answer..."
    end
    
    rect rgb(255, 245, 238)
    Note over P, Q: 2. Hybrid Retrieval
    P->>E: Embed Sub-Queries & HyDE Text
    E-->>P: Dense Vectors
    P->>Q: BM25 Sparse + Dense Search + Filters
    Q-->>P: Top N Chunks (from GRs)
    end
    
    rect rgb(245, 255, 250)
    Note over P, G: 3. Synthesis & Evaluation
    P->>P: Reciprocal Rank Fusion (RRF)
    P->>G: Grounded System Prompt + Top Chunks
    G-->>P: Final Source-Cited Answer
    P->>P: Calculate Confidence Badge
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
