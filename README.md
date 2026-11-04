
# VetScholar AI

### Independent Veterinary Research Assistant — Portfolio Demo

VetScholar AI is an independently developed demonstration project that explores how retrieval-augmented generation (RAG) can help veterinary researchers, clinicians, and students work with scientific publications.

The demo provides a local workspace to upload research papers, ask questions across uploaded literature, generate structured paper summaries, and compare publications with source references where available.

> **Project status:** Independent portfolio/demo project. It is not presented as a Care Lab product, a commercial service, a peer-reviewed research platform, or a validated veterinary clinical decision-support system.

> **Local-first design:** The default configuration uses Ollama for local language-model inference, Sentence Transformers for embeddings, SQLite for metadata and history, and persistent ChromaDB for vector search. No paid hosted LLM API is required by the default configuration.

---

## Project goals

This project demonstrates practical implementation of:

- Retrieval-augmented generation (RAG) for domain-specific research documents.
- PDF and image ingestion with text extraction and OCR fallback.
- Semantic search over document chunks.
- Research question answering with retrieved source context.
- Structured research-paper summaries.
- Comparisons across multiple uploaded papers.
- A React frontend connected to a FastAPI backend.
- Local data storage and a basic single-administrator authentication flow.

## Features

### Research library

- Upload PDF papers and supported image files.
- Extract text from digital PDFs.
- Use OCR as a fallback for scanned pages and images.
- Split extracted text into searchable chunks and index them.
- View processing status, page counts, and chunk counts.
- Remove individual papers or clear the library.

### AI research assistant

- Ask questions about one selected paper or the uploaded library.
- Retrieve relevant passages before generating an answer.
- Return source references with document names, page numbers, and excerpts where available.
- Save conversations in the local workspace.

### Paper analysis

Generate a structured research summary covering:

- Research objective
- Animal species and study population
- Sample size
- Study design and methodology
- Statistical methods
- Key findings
- Limitations and conclusion

The model may mark fields as not reported when the selected paper does not provide enough evidence.

### Compare papers

Compare multiple uploaded publications across:

- Research objectives
- Species and study populations
- Sample sizes
- Study design and methodology
- Statistical approaches
- Findings and limitations
- Conclusions and conflicting evidence

### Workspace

- Dashboard with document, conversation, and indexed-chunk counts.
- Research history and conversation deletion.
- Individual document deletion.
- Clear history and erase application data controls.
- Light and dark themes.
- First-run administrator registration and subsequent login.

---

## Technology stack

| Layer                   | Technology                                 |
| ----------------------- | ------------------------------------------ |
| Frontend                | React 18, TypeScript, Vite                 |
| UI                      | CSS, Lucide icons, Recharts, Framer Motion |
| Backend API             | Python, FastAPI, Uvicorn                   |
| Data models             | SQLAlchemy                                 |
| Metadata and history    | SQLite                                     |
| Vector database         | ChromaDB (persistent local storage)        |
| LLM runtime             | Ollama                                     |
| Default language model  | `llama3.2:3b`                            |
| Embeddings              | Sentence Transformers                      |
| Default embedding model | `sentence-transformers/all-MiniLM-L6-v2` |
| RAG framework           | LangChain integrations                     |
| PDF processing          | PyMuPDF                                    |
| OCR                     | Tesseract OCR + pytesseract                |

The default application is intended to run as a single local workspace on one computer.

---

## How it works

1. A user uploads a research PDF or supported image.
2. The FastAPI backend validates the file and extracts its text.
3. OCR is used when required for scanned content.
4. Extracted text is split into overlapping chunks.
5. Sentence Transformers generates embeddings for the chunks.
6. ChromaDB stores searchable vectors with document and page metadata.
7. When a user asks a question, relevant chunks are retrieved.
8. The retrieved context and question are sent to the local Ollama model.
9. The application displays the generated response and available source references.

**Important:** RAG can help ground responses in uploaded documents, but it does not guarantee scientific correctness. Verify important claims against the original publication.

---

## System requirements

Recommended baseline for local use:

- Windows 10 or Windows 11, 64-bit.
- Python 3.11.
- Node.js 20 or later (includes npm).
- Ollama installed and running.
- 8 GB RAM minimum; 16 GB or more is recommended for a smoother local model experience.
- Disk space for Python packages, the Ollama model, embedding model cache, uploaded papers, and vector index.
- Tesseract OCR installed separately if scanned PDFs or image uploads need OCR.

Model performance depends on available RAM, CPU/GPU, model size, and document length. The first model downloads can take time.

---

## Installation on Windows

### 1. Extract the project

Extract the project ZIP to a folder, for example:

```text
C:\Projects\VetScholar-AI
```

Open PowerShell in that folder.

### 2. Install and prepare Ollama

Install Ollama from:

https://ollama.com/download

Download the default model:

```powershell
ollama pull llama3.2:3b
```

Check available models:

```powershell
ollama list
```

The default backend expects Ollama at:

```text
http://127.0.0.1:11434
```

### 3. Set up the Python backend

```powershell
cd C:\Projects\VetScholar-AI\backend

py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
pip install -r requirements.txt

Copy-Item .env.example .env
```

If PowerShell blocks virtual-environment activation, run this in the same terminal and try activation again:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Start FastAPI:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API is available at:

- API base: http://127.0.0.1:8000
- Interactive API documentation: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/api/health

Keep this terminal open.

### 4. Set up the React frontend

Open a second PowerShell terminal:

```powershell
cd C:\Projects\VetScholar-AI\frontend

npm install
npm run dev
```

Open the local address printed by Vite. The default address is:

http://127.0.0.1:5173

Keep this terminal open while using the application.

### 5. Start the project again

After the first installation, start Ollama, then start the backend and frontend in separate terminals.

**Backend**

```powershell
cd C:\Projects\VetScholar-AI\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Frontend**

```powershell
cd C:\Projects\VetScholar-AI\frontend
npm run dev
```

The repository may also include `start-backend.ps1` and `start-frontend.ps1` helper scripts.

---

## First-time account setup

VetScholar AI includes a first-run, single-administrator login flow.

1. Open the frontend in your browser.
2. On first use, the app checks whether an account exists.
3. If no account exists, create the administrator account using an email address and a password of at least 10 characters.
4. The first successful registration closes public registration.
5. On later visits, sign in with the same credentials.

### Authentication details

- Passwords are stored as salted password hashes using Python's `hashlib.scrypt`.
- The backend issues a signed bearer token with an eight-hour lifetime.
- The frontend stores the token in browser `localStorage` and sends it with protected API requests.
- A signing key is generated automatically in `data/auth.secret` if `VETSCHOLAR_SECRET_KEY` is not configured.
- Keep `data/auth.secret` private. Losing or replacing it invalidates existing login tokens.

This is a local single-admin access gate, not a fully hardened multi-user identity system. It does not currently isolate documents and conversations by individual user.

---

## Using VetScholar AI

### Upload a paper

1. Open **Research Library**.
2. Select a PDF or supported image file.
3. Wait for processing and indexing to finish.
4. Confirm the document status is ready before querying it.

### Ask a research question

1. Open **AI Research Assistant**.
2. Select a specific paper or all papers.
3. Enter a question grounded in the uploaded literature.
4. Review the answer and its source references.
5. Open the original paper to verify clinically or scientifically important details.

### Generate a paper analysis

1. Open **Paper Analysis**.
2. Select one processed paper.
3. Generate the structured analysis.
4. Review the extracted sections and citations against the source.

### Compare papers

1. Open **Compare Papers**.
2. Select between 2 and 10 processed papers.
3. Run the comparison.
4. Check each reported difference against the original papers.

### Manage history and data

- Use **Research History** to reopen or clear conversations.
- Delete a paper from the library to remove its stored file and associated indexed content.
- Use the settings data controls carefully. Erasing application data is destructive.

---

## Supported files and OCR

The backend validates uploads and supports the file types implemented in the upload pipeline (PDF and common image formats such as JPG/JPEG/PNG).

For scanned PDFs and images, install Tesseract OCR and ensure the `tesseract` executable is available on the Windows PATH.

Verify the installation in a new terminal:

```powershell
tesseract --version
```

If OCR is unavailable, digital PDFs may still work when they contain extractable text, but scanned pages may not be readable.

The upload size limit is controlled by `MAX_UPLOAD_MB` in the backend environment configuration. The example value is 25 MB.

---

## Project structure

```text
VetScholar-AI/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── auth.py
│   │   ├── ai.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── ingestion.py
│   │   ├── models.py
│   │   ├── security.py
│   │   └── vector.py
│   ├── .env.example
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── AuthGate.tsx
│   │   ├── api.ts
│   │   ├── main.tsx
│   │   └── style.css
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── data/
│   ├── chroma/
│   ├── temp/
│   └── uploads/
├── start-backend.ps1
├── start-frontend.ps1
├── README.md
├── SECURITY.md
└── .gitignore
```

Runtime folders and files are created as the application runs.

---

## Configuration

The backend reads configuration from `backend/.env`. Start with the supplied `.env.example`:

```env
DATA_DIR=../data
MAX_UPLOAD_MB=25
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:3b
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

| Setting                   | Purpose                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `DATA_DIR`              | Local folder for database, uploads, vectors, and temporary files                   |
| `MAX_UPLOAD_MB`         | Maximum accepted upload size in MB                                                 |
| `ALLOWED_ORIGINS`       | Frontend origins permitted by CORS                                                 |
| `OLLAMA_BASE_URL`       | Local Ollama server URL                                                            |
| `OLLAMA_MODEL`          | Ollama model tag used for generation                                               |
| `EMBEDDING_MODEL`       | Sentence Transformers model used for vector embeddings                             |
| `VETSCHOLAR_SECRET_KEY` | Optional signing key; if omitted, a local key is generated in `data/auth.secret` |

Restart the backend after changing environment settings.

---

## Data storage and privacy

By default, the project stores its runtime data under `data/`:

| Data                             | Location                    |
| -------------------------------- | --------------------------- |
| SQLite database                  | `data/vetscholar.sqlite3` |
| Uploaded files                   | `data/uploads/`           |
| ChromaDB index                   | `data/chroma/`            |
| Temporary processing files       | `data/temp/`              |
| Local authentication signing key | `data/auth.secret`        |

The `data/` runtime contents should not be committed to source control. They may contain research documents, metadata, vector data, and authentication secrets.

### Backups

To back up a local workspace, stop the backend first, then securely copy the entire `data/` directory. Protect backups as confidential research data.

### Privacy boundary

“Local-first” means the default model and storage services run locally. It does not automatically mean the computer is secure. Device access, malware, browser access, backups, and network configuration remain relevant.

The development servers bind to loopback (`127.0.0.1`). Do not change them to public network binding or expose them to the internet without a security review and additional controls.

---

## Troubleshooting

### Frontend says the backend is unavailable

- Confirm the backend terminal is running.
- Open http://127.0.0.1:8000/api/health.
- Confirm the frontend is using the expected backend URL.
- Check that the configured CORS origins match the frontend URL.

### Ollama is unavailable

```powershell
ollama list
ollama pull llama3.2:3b
```

Make sure Ollama is running and that `OLLAMA_BASE_URL` matches the local Ollama server.

### Model not found

The model name in `backend/.env` must match a model shown by `ollama list`. The default is `llama3.2:3b`.

### Scanned PDF returns little or no text

- Install Tesseract OCR.
- Add the Tesseract installation directory to PATH.
- Open a new terminal and run `tesseract --version`.
- Try a clear, searchable PDF or image to distinguish OCR issues from ingestion issues.

### Python package installation fails

- Confirm Python 3.11 is installed.
- Activate the backend virtual environment.
- Upgrade pip.
- Review the first error in the terminal; large ML dependencies may require additional disk space and compatible system packages.

### Login says session expired

Sign in again. The default token lifetime is eight hours. If `data/auth.secret` was deleted or regenerated, all previously issued tokens become invalid. The administrator account remains in SQLite unless the database itself was deleted.

### Port already in use

Stop the process using port 8000 or 5173, or configure a different port and update the frontend API URL and CORS origins accordingly.

---

## API reference

The backend exposes these main routes. Protected routes require:

```http
Authorization: Bearer <access_token>
```

| Method | Endpoint                           | Purpose                                       | Access                     |
| ------ | ---------------------------------- | --------------------------------------------- | -------------------------- |
| GET    | `/api/health`                    | Backend health                                | Public                     |
| GET    | `/api/health/ollama`             | Ollama connectivity/model status              | Public                     |
| GET    | `/api/auth/status`               | Check first-run registration state            | Public                     |
| POST   | `/api/auth/register`             | Create the first administrator                | Public, first account only |
| POST   | `/api/auth/login`                | Sign in                                       | Public                     |
| GET    | `/api/dashboard`                 | Dashboard metrics                             | Protected                  |
| POST   | `/api/documents/upload`          | Upload and index a paper                      | Protected                  |
| GET    | `/api/documents`                 | List documents                                | Protected                  |
| DELETE | `/api/documents/{document_id}`   | Delete one paper                              | Protected                  |
| DELETE | `/api/documents`                 | Delete all papers                             | Protected                  |
| POST   | `/api/chat`                      | Ask a question                                | Protected                  |
| GET    | `/api/history`                   | List conversations                            | Protected                  |
| GET    | `/api/history/{conversation_id}` | Read a conversation                           | Protected                  |
| DELETE | `/api/history/{conversation_id}` | Delete a conversation                         | Protected                  |
| DELETE | `/api/history`                   | Clear conversation history                    | Protected                  |
| POST   | `/api/research/summarize`        | Summarize one paper                           | Protected                  |
| POST   | `/api/research/compare`          | Compare 2–10 papers                          | Protected                  |
| GET    | `/api/settings`                  | Read local configuration                      | Protected                  |
| DELETE | `/api/data/all`                  | Erase application documents and conversations | Protected                  |

For request/response schemas and interactive testing, open:

http://127.0.0.1:8000/docs

---

## Known limitations and production considerations

This repository is an independent portfolio/demo project and local development baseline. Before using it as a public or multi-user service, address at least the following:

1. **Multi-user ownership:** documents, vectors, and conversations are currently shared in one local workspace. Add user-level ownership and enforce authorization in every data query before allowing multiple accounts.
2. **Session security:** the frontend stores bearer tokens in `localStorage`. A public deployment should use secure, HttpOnly, SameSite cookies and appropriate CSRF protection.
3. **Transport security:** deploy behind HTTPS; do not expose the development server directly.
4. **Abuse protection:** add login rate limiting, request throttling, upload quotas, and audit logging.
5. **Database migrations:** use a migration workflow for schema changes and backups.
6. **Background processing:** large PDF/OCR jobs currently run in the request flow. Use a durable background job system for higher-volume deployments.
7. **Evaluation:** create a representative veterinary question-and-answer benchmark and evaluate retrieval quality, groundedness, citation accuracy, and model performance.
8. **Scientific review:** AI-generated summaries and answers require expert verification, especially for clinical decisions, treatment recommendations, and patient care.
9. **Security review:** review file handling, dependencies, secrets, browser storage, API authorization, and deployment configuration before production use.

**Do not use VetScholar AI as a substitute for veterinary professional judgment or validated clinical decision support.**

---

## Demo data and responsible use

Use research papers and sample documents only when you have the right to upload and process them. Uploaded scientific papers may be subject to publisher or author copyright restrictions.

Any synthetic or sample veterinary research material used for testing should be treated as demonstration data, not as a real peer-reviewed publication or evidence for clinical decisions.

---

## License and attribution

This repository is shared as an independent demonstration project. 

Review the licenses of all dependencies, model weights, and any papers you upload before redistribution or commercial use. Respect the copyright and license terms of third-party software, model weights, datasets, and scientific publications.
