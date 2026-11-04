import { useEffect, useState } from 'react';
import { api, Doc } from './api';
import AuthGate from './AuthGate';
import {
  Activity,
  BookOpen,
  BrainCircuit,
  ChartNoAxesCombined,
  FileText,
  FolderOpen,
  History,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sun,
  Trash2,
  UploadCloud,
  Workflow,
  PanelLeftClose,
  Stethoscope,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

type Page =
  | 'Dashboard'
  | 'AI Research Assistant'
  | 'Research Library'
  | 'Paper Analysis'
  | 'Compare Papers'
  | 'Research History'
  | 'Settings';

const nav: { name: Page; icon: any }[] = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'AI Research Assistant', icon: BrainCircuit },
  { name: 'Research Library', icon: FolderOpen },
  { name: 'Paper Analysis', icon: FileText },
  { name: 'Compare Papers', icon: Workflow },
  { name: 'Research History', icon: History },
  { name: 'Settings', icon: Settings }
];

function WorkspaceApp() {
  const [page, setPage] = useState<Page>('Dashboard');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [dash, setDash] = useState<any>({});
  const [history, setHistory] = useState<any[]>([]);
  const [conversation, setConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [question, setQuestion] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [ollama, setOllama] = useState<any>({ connected: false });
  const [dark, setDark] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [compare, setCompare] = useState<any>(null);

  const refresh = async () => {
    try {
      const [d, s, h, o] = await Promise.all([
        api.get('/documents'),
        api.get('/dashboard'),
        api.get('/history'),
        api.get('/health/ollama')
      ]);

      setDocs(d.data);
      setDash(s.data);
      setHistory(h.data);
      setOllama(o.data);
    } catch {
      setNotice('Backend unavailable. Start FastAPI and refresh.');
    }
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 7000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const notify = (s: string) => {
    setNotice(s);
    setTimeout(() => setNotice(''), 4500);
  };

  const upload = async (files: FileList | null) => {
    if (!files) return;

    for (const f of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', f);

      try {
        await api.post('/documents/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        notify(`${f.name} uploaded and indexed`);
      } catch (e: any) {
        notify(e.response?.data?.detail || `Upload failed: ${f.name}`);
      }
    }

    await refresh();
  };

  const send = async (q = question) => {
    if (!q.trim() || loading) return;

    const text = q;
    setQuestion('');
    setMessages(m => [...m, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const r = await api.post('/chat', {
        question: text,
        conversation_id: conversation,
        document_ids: selected
      });

      setConversation(r.data.conversation_id);

      setMessages(m => [
        ...m,
        {
          role: 'assistant',
          content: r.data.answer,
          citations: r.data.citations
        }
      ]);

      await refresh();
    } catch (e: any) {
      setMessages(m => [
        ...m,
        {
          role: 'assistant',
          content:
            e.response?.data?.detail ||
            'Unable to reach local AI. Check Ollama and the backend.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const openConversation = async (id: string) => {
    try {
      const r = await api.get(`/history/${id}`);
      setConversation(id);
      setMessages(r.data.messages);
      setPage('AI Research Assistant');
    } catch {
      notify('Unable to open conversation');
    }
  };

  const removeDoc = async (id: string) => {
    if (
      !confirm(
        'Permanently delete this document and its indexed vectors?'
      )
    ) return;

    try {
      await api.delete(`/documents/${id}`);
      notify('Document deleted');
      await refresh();
    } catch {
      notify('Deletion failed');
    }
  };

  const clearHistory = async () => {
    if (
      !confirm(
        'Delete all research conversations? Documents will be preserved.'
      )
    ) return;

    await api.delete('/history');
    setHistory([]);
    setConversation(null);
    setMessages([]);
    notify('History cleared');
  };

  const erase = async () => {
    if (
      !confirm(
        'ERASE ALL application documents, vectors, and conversations? This cannot be undone.'
      )
    ) return;

    try {
      await api.delete('/data/all');
      setMessages([]);
      setConversation(null);
      notify('Application data erased');
      await refresh();
    } catch {
      notify('Erase failed');
    }
  };

  const runSummary = async () => {
    if (selected.length !== 1) {
      notify('Select exactly one paper in the library first');
      return;
    }

    setLoading(true);

    try {
      const r = await api.post('/research/summarize', {
        document_ids: selected
      });
      setAnalysis(r.data);
    } catch (e: any) {
      notify(e.response?.data?.detail || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const runCompare = async () => {
    if (selected.length < 2) {
      notify('Select at least two papers in the library');
      return;
    }

    setLoading(true);

    try {
      const r = await api.post('/research/compare', {
        document_ids: selected
      });
      setCompare(r.data);
    } catch (e: any) {
      notify(e.response?.data?.detail || 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  const bytes = (n: number) =>
    n < 1024 * 1024
      ? `${(n / 1024).toFixed(0)} KB`
      : `${(n / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className={`app ${dark ? 'dark' : ''}`}>
      <aside className={`sidebar ${mobile ? 'mobile-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Stethoscope size={23} />
          </div>

          <div>
            <b>
              VetScholar<span> AI</span>
            </b>
            <small>VETSCHOLAR AI DEMO</small>
          </div>

          <button
            className="icon-btn close-mobile"
            onClick={() => setMobile(false)}
          >
            <PanelLeftClose />
          </button>
        </div>

        <div className="workspace-label">DEMO WORKSPACE</div>

        <nav>
          {nav.map(n => (
            <button
              key={n.name}
              onClick={() => {
                setPage(n.name);
                setMobile(false);
              }}
              className={`nav-item ${page === n.name ? 'active' : ''}`}
            >
              <n.icon size={18} />
              <span>{n.name}</span>
              {n.name === 'Research Library' && <em>{docs.length}</em>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="local-card">
            <div className="local-icon">
              <ShieldCheck size={17} />
            </div>
            <div>
              <b>Local-first privacy</b>
              <small>Your research stays on this device</small>
            </div>
            <span className="green-dot" />
          </div>

          <div className="profile">
            <div className="avatar">VS</div>
            <div>
              <b>Demo Workspace</b>
              <small>Independent AI project</small>
            </div>
            <button
              className="icon-btn"
              onClick={() => setDark(!dark)}
              title="Toggle theme"
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button
            className="icon-btn menu-btn"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>

          <div className="crumb">
            Workspace <span>/</span> <b>{page}</b>
          </div>

          <div className="top-actions">
            <div className={`system-pill ${ollama.connected ? 'online' : ''}`}>
              <i />
              {ollama.connected
                ? 'AI assistant ready'
                : 'AI assistant unavailable'}
            </div>

            <button
              className="icon-btn"
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="avatar small-avatar">VS</div>
          </div>
        </header>

        <div className="content">
          {page === 'Dashboard' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">YOUR RESEARCH WORKSPACE</div>
                  <h1>Welcome to VetScholar AI</h1>
                  <p>
                    Turn veterinary publications into structured,
                    searchable scientific knowledge.
                  </p>
                </div>

                <button
                  className="btn primary"
                  onClick={() => setPage('Research Library')}
                >
                  <UploadCloud size={17} />
                  Upload research paper
                </button>
              </div>

              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-tag">
                    <BrainCircuit size={14} />
                    LOCAL AI RESEARCH
                  </span>

                  <h2>
                    Research smarter.
                    <br />
                    <i>Discover more.</i>
                  </h2>

                  <p>
                    Explore your veterinary literature with
                    evidence-grounded AI summaries, comparisons and answers.
                  </p>

                  <button
                    className="btn hero-btn"
                    onClick={() => {
                      setPage('AI Research Assistant');
                      setConversation(null);
                      setMessages([]);
                    }}
                  >
                    Start new research <span>→</span>
                  </button>
                </div>

                <div className="hero-art">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />

                  <div className="art-core">
                    <Stethoscope size={54} />
                  </div>

                  <div className="float-card fc-one">
                    <BookOpen size={16} />
                    <span>Research library</span>
                    <b>{dash.documents || 0} papers</b>
                  </div>

                  <div className="float-card fc-two">
                    <Activity size={16} />
                    <span>AI engine</span>
                    <b>{ollama.connected ? 'Connected' : 'Offline'}</b>
                  </div>

                  <div className="art-dot dot-a" />
                  <div className="art-dot dot-b" />
                </div>
              </section>

              <div className="section-row">
                <div>
                  <h3>Research overview</h3>
                  <p>Your workspace at a glance</p>
                </div>
                <span className="updated">
                  <span /> Live workspace data
                </span>
              </div>

              <div className="stats-grid">
                <Stat
                  icon={FileText}
                  label="Research papers"
                  value={dash.documents ?? '—'}
                  note="Uploaded documents"
                  tone="blue"
                />
                <Stat
                  icon={CheckCircle2}
                  label="Processed papers"
                  value={dash.processed ?? '—'}
                  note="Ready for research"
                  tone="green"
                />
                <Stat
                  icon={MessageSquare}
                  label="Conversations"
                  value={dash.conversations ?? '—'}
                  note="Research discussions"
                  tone="purple"
                />
                <Stat
                  icon={ChartNoAxesCombined}
                  label="Indexed chunks"
                  value={dash.chunks ?? '—'}
                  note="Searchable passages"
                  tone="orange"
                />
              </div>

              <div className="two-col">
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h3>Recent research papers</h3>
                      <p>Your latest additions</p>
                    </div>

                    <button
                      className="text-btn"
                      onClick={() => setPage('Research Library')}
                    >
                      View library <span>→</span>
                    </button>
                  </div>

                  {docs.slice(0, 5).length ? (
                    docs.slice(0, 5).map(d => (
                      <DocRow
                        key={d.id}
                        doc={d}
                        onDelete={() => removeDoc(d.id)}
                      />
                    ))
                  ) : (
                    <Empty
                      icon={FolderOpen}
                      title="Your library is ready"
                      text="Upload a veterinary paper to begin building your research collection."
                      action={() => setPage('Research Library')}
                    />
                  )}
                </section>

                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h3>Workspace status</h3>
                      <p>Your research environment at a glance</p>
                    </div>
                    <span className="status-live">LIVE</span>
                  </div>

                  <Status
                    label="AI assistant"
                    value={
                      ollama.connected
                        ? 'Ready to help'
                        : 'Temporarily unavailable'
                    }
                    ok={ollama.connected}
                  />

                  <Status
                    label="Research papers"
                    value={`${dash.documents || 0} in your library`}
                    ok
                  />

                  <Status
                    label="Research library"
                    value="Private on this device"
                    ok
                  />

                  <Status
                    label="Data protection"
                    value="Local-first workspace"
                    ok
                  />

                  <div className="privacy-note">
                    <ShieldCheck size={17} />
                    <span>
                      <b>Your research stays private</b>
                      <small>
                        Your papers and conversations remain in your local
                        workspace.
                      </small>
                    </span>
                  </div>
                </section>
              </div>
            </>
          )}

          {page === 'Research Library' && (
            <>
              <PageTitle
                eyebrow="KNOWLEDGE COLLECTION"
                title="Research Library"
                sub="Manage, organize and search your veterinary research publications."
              />

              <div className="upload-zone">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={e => upload(e.target.files)}
                />

                <div className="upload-icon">
                  <UploadCloud size={25} />
                </div>

                <h3>Drop research papers here</h3>
                <p>
                  or <b>browse files</b> from your computer
                </p>
                <small>PDF, PNG, JPG or JPEG · Maximum 25 MB per file</small>
              </div>

              <div className="library-toolbar">
                <div>
                  <h3>
                    All documents <span className="count">{docs.length}</span>
                  </h3>
                  <p>Select papers to analyze or compare</p>
                </div>

                <div className="toolbar-actions">
                  <div className="searchbox">
                    <Search size={16} />
                    <input
                      placeholder="Search documents..."
                      onChange={e =>
                        setDash((x: any) => ({
                          ...x,
                          search: e.target.value
                        }))
                      }
                    />
                  </div>

                  <button
                    className="btn secondary"
                    onClick={() => {
                      setSelected([]);
                      notify('Selection cleared');
                    }}
                  >
                    Clear selection
                  </button>
                </div>
              </div>

              <div className="doc-grid">
                {docs
                  .filter(d =>
                    d.filename
                      .toLowerCase()
                      .includes((dash.search || '').toLowerCase())
                  )
                  .map(d => (
                    <div
                      className={`document-card ${
                        selected.includes(d.id) ? 'selected' : ''
                      }`}
                      key={d.id}
                    >
                      <div className="doc-card-top">
                        <div className="pdf-icon">
                          <FileText />
                        </div>

                        <input
                          type="checkbox"
                          checked={selected.includes(d.id)}
                          onChange={e =>
                            setSelected(s =>
                              e.target.checked
                                ? [...s, d.id]
                                : s.filter(x => x !== d.id)
                            )
                          }
                        />
                      </div>

                      <h4 title={d.filename}>{d.filename}</h4>

                      <div className="doc-meta">
                        {bytes(d.size_bytes)} <span>·</span>{' '}
                        {d.page_count || '—'} pages
                      </div>

                      <div className="doc-card-bottom">
                        <StatusBadge status={d.status} />
                        <button
                          className="icon-btn danger-hover"
                          onClick={() => removeDoc(d.id)}
                          title="Delete document"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {d.error && (
                        <small className="error-text">{d.error}</small>
                      )}
                    </div>
                  ))}
              </div>

              {!docs.length && (
                <Empty
                  icon={BookOpen}
                  title="No papers uploaded yet"
                  text="Your research library will appear here after your first upload."
                  action={() =>
                    document
                      .querySelector<HTMLInputElement>('.upload-zone input')
                      ?.click()
                  }
                />
              )}
            </>
          )}

          {page === 'AI Research Assistant' && (
            <>
              <div className="chat-layout">
                <aside className="chat-side">
                  <button
                    className="btn primary full"
                    onClick={() => {
                      setConversation(null);
                      setMessages([]);
                    }}
                  >
                    <Plus size={17} /> New conversation
                  </button>

                  <div className="chat-side-label">
                    RECENT CONVERSATIONS
                  </div>

                  {history.map(h => (
                    <button
                      className={`history-item ${
                        conversation === h.id ? 'chosen' : ''
                      }`}
                      key={h.id}
                      onClick={() => openConversation(h.id)}
                    >
                      <MessageSquare size={15} />
                      <span>{h.title}</span>
                    </button>
                  ))}

                  {!history.length && (
                    <p className="muted tiny">
                      Your conversations will appear here.
                    </p>
                  )}
                </aside>

                <section className="chat-main">
                  <div className="chat-topline">
                    <div>
                      <span className="ai-badge">
                        <BrainCircuit size={14} /> VETSCHOLAR ASSISTANT
                      </span>
                      <h2>Veterinary research, understood.</h2>
                      <p>
                        Answers grounded in your uploaded scientific
                        literature.
                      </p>
                    </div>

                    <div className="scope">
                      <BookOpen size={15} />
                      <select
                        value={selected.length ? selected[0] : 'all'}
                        onChange={e =>
                          setSelected(
                            e.target.value === 'all'
                              ? []
                              : [e.target.value]
                          )
                        }
                      >
                        <option value="all">All research papers</option>
                        {docs.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.filename}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="messages">
                    {messages.length === 0 ? (
                      <div className="chat-welcome">
                        <div className="welcome-symbol">
                          <BrainCircuit size={31} />
                        </div>

                        <h2>
                          Explore veterinary science
                          <br />
                          <span>with your research library.</span>
                        </h2>

                        <p>
                          Ask questions, summarize papers, compare findings
                          and discover evidence across your uploaded
                          publications.
                        </p>

                        <div className="suggestions">
                          {[
                            'Summarize my veterinary research paper',
                            'Extract the study methodology',
                            'What were the key research findings?',
                            'Identify limitations in this study'
                          ].map((s, i) => (
                            <button key={s} onClick={() => send(s)}>
                              <span>{['✦', '⌘', '◈', '↗'][i]}</span>
                              {s}
                              <b>↗</b>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      messages.map((m, i) => (
                        <div className={`message ${m.role}`} key={i}>
                          <div className="message-avatar">
                            {m.role === 'assistant' ? (
                              <BrainCircuit size={17} />
                            ) : (
                              <span>VS</span>
                            )}
                          </div>

                          <div className="message-body">
                            <div className="message-label">
                              {m.role === 'assistant'
                                ? 'VetScholar AI'
                                : 'You'}
                            </div>

                            <div className="message-content">
                              {m.content}
                            </div>

                            {m.citations?.length > 0 && (
                              <div className="citations">
                                <b>Sources</b>

                                {m.citations.map((c: any, j: number) => (
                                  <div className="citation" key={j}>
                                    <FileText size={14} />
                                    <span>{c.filename}</span>
                                    <em>Page {c.page}</em>
                                    <p>{c.excerpt}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}

                    {loading && (
                      <div className="message assistant">
                        <div className="message-avatar">
                          <BrainCircuit size={17} />
                        </div>

                        <div className="message-body">
                          <div className="message-label">VetScholar AI</div>
                          <div className="typing">
                            <i />
                            <i />
                            <i />
                            Searching evidence and preparing answer…
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="composer-wrap">
                    <div className="composer">
                      <textarea
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            send();
                          }
                        }}
                        placeholder="Ask a question about your veterinary research…"
                        rows={2}
                      />

                      <button
                        className="send-btn"
                        disabled={!question.trim() || loading}
                        onClick={() => send()}
                      >
                        <Send size={17} />
                      </button>
                    </div>

                    <div className="composer-foot">
                      <span>
                        <ShieldCheck size={13} /> Local AI · Evidence-based
                        answers
                      </span>
                      <span>
                        Enter to send · Shift + Enter for new line
                      </span>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}

          {page === 'Paper Analysis' && (
            <>
              <PageTitle
                eyebrow="STRUCTURED LITERATURE REVIEW"
                title="Paper Analysis"
                sub="Extract the essential scientific information from an uploaded publication."
              />

              <div className="panel analysis-panel">
                <div className="field-label">SELECT A RESEARCH PAPER</div>

                <select
                  className="select-field"
                  value={selected[0] || ''}
                  onChange={e =>
                    setSelected(e.target.value ? [e.target.value] : [])
                  }
                >
                  <option value="">Choose a paper from your library</option>
                  {docs
                    .filter(d => d.status === 'ready')
                    .map(d => (
                      <option key={d.id} value={d.id}>
                        {d.filename}
                      </option>
                    ))}
                </select>

                <button
                  className="btn primary"
                  disabled={loading || selected.length !== 1}
                  onClick={runSummary}
                >
                  <BrainCircuit size={17} />
                  {loading ? 'Analyzing…' : 'Generate research analysis'}
                </button>
              </div>

              {analysis && (
                <div className="panel report">
                  <div className="panel-head">
                    <div>
                      <h3>Research analysis report</h3>
                      <p>Generated from selected document evidence</p>
                    </div>

                    <button
                      className="btn secondary"
                      onClick={() =>
                        navigator.clipboard.writeText(analysis.summary)
                      }
                    >
                      Copy report
                    </button>
                  </div>

                  <pre>{analysis.summary}</pre>
                  <Citations citations={analysis.citations} />
                </div>
              )}
            </>
          )}

          {page === 'Compare Papers' && (
            <>
              <PageTitle
                eyebrow="CROSS-PAPER SYNTHESIS"
                title="Compare research papers"
                sub="Identify similarities, differences and evidence gaps across publications."
              />

              <div className="panel">
                <h3>Select papers to compare</h3>
                <p className="muted">
                  Choose between 2 and 10 processed research papers.
                </p>

                <div className="select-list">
                  {docs
                    .filter(d => d.status === 'ready')
                    .map(d => (
                      <label key={d.id}>
                        <input
                          type="checkbox"
                          checked={selected.includes(d.id)}
                          onChange={e =>
                            setSelected(s =>
                              e.target.checked
                                ? [...s, d.id]
                                : s.filter(x => x !== d.id)
                            )
                          }
                        />
                        <FileText size={17} />
                        {d.filename}
                      </label>
                    ))}
                </div>

                <button
                  className="btn primary"
                  disabled={loading || selected.length < 2}
                  onClick={runCompare}
                >
                  <Workflow size={17} />
                  {loading
                    ? 'Comparing…'
                    : `Compare ${selected.length} papers`}
                </button>
              </div>

              {compare && (
                <div className="panel report">
                  <h3>Research comparison</h3>
                  <pre>{compare.comparison}</pre>
                  <Citations citations={compare.citations} />
                </div>
              )}
            </>
          )}

          {page === 'Research History' && (
            <>
              <PageTitle
                eyebrow="YOUR ACTIVITY"
                title="Research History"
                sub="Return to previous questions and literature discussions."
              />

              <div className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Conversations</h3>
                    <p>{history.length} saved research sessions</p>
                  </div>

                  <button className="btn danger" onClick={clearHistory}>
                    <Trash2 size={16} /> Clear history
                  </button>
                </div>

                {history.map(h => (
                  <div className="history-row" key={h.id}>
                    <MessageSquare size={18} />

                    <div>
                      <b>{h.title}</b>
                      <small>
                        {h.message_count} messages ·{' '}
                        {new Date(h.created_at).toLocaleString()}
                      </small>
                    </div>

                    <button
                      className="btn secondary"
                      onClick={() => openConversation(h.id)}
                    >
                      Open
                    </button>
                  </div>
                ))}

                {!history.length && (
                  <Empty
                    icon={History}
                    title="No research history"
                    text="Your conversations will be saved here."
                  />
                )}
              </div>
            </>
          )}

          {page === 'Settings' && (
            <>
              <PageTitle
                eyebrow="APPLICATION PREFERENCES"
                title="Settings & privacy"
                sub="Manage your local AI configuration and research data."
              />

              <div className="settings-grid">
                <div className="panel">
                  <h3>AI assistant</h3>
                  <p className="muted">
                    Check whether your research assistant is ready to answer
                    questions about your papers.
                  </p>

                  <Status
                    label="Assistant availability"
                    value={ollama.connected ? 'Ready' : 'Unavailable'}
                    ok={ollama.connected}
                  />

                  <Status
                    label="Research library"
                    value={`${docs.length} papers available`}
                    ok
                  />

                  <Status
                    label="Workspace privacy"
                    value="Local-first"
                    ok
                  />

                  <button className="btn secondary" onClick={refresh}>
                    Refresh status
                  </button>
                </div>

                <div className="panel">
                  <h3>Privacy & data management</h3>
                  <p className="muted">
                    Manage your local research data. These operations cannot
                    be undone.
                  </p>

                  <button className="setting-action" onClick={clearHistory}>
                    <span>
                      <History />
                      Clear chat history
                    </span>
                    <Trash2 size={16} />
                  </button>

                  <button
                    className="setting-action"
                    onClick={async () => {
                      if (
                        confirm('Delete all uploaded research documents?')
                      ) {
                        await api.delete('/documents');
                        await refresh();
                        notify('All documents deleted');
                      }
                    }}
                  >
                    <span>
                      <FolderOpen />
                      Delete all documents
                    </span>
                    <Trash2 size={16} />
                  </button>

                  <button
                    className="setting-action destructive"
                    onClick={erase}
                  >
                    <span>
                      <AlertCircle />
                      Erase all application data
                    </span>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <footer>
          <span>© 2026 VetScholar AI · Independent AI Project</span>
          <span>Built for evidence-led veterinary research</span>
        </footer>
      </main>

      {notice && (
        <div className="toast">
          <CheckCircle2 size={17} />
          {notice}
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, note, tone }: any) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={19} />
      </div>
      <div className="stat-value">{value}</div>
      <b>{label}</b>
      <small>{note}</small>
    </div>
  );
}

function PageTitle({ eyebrow, title, sub }: any) {
  return (
    <div className="page-heading simple">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
    </div>
  );
}

function DocRow({ doc, onDelete }: any) {
  return (
    <div className="doc-row">
      <div className="pdf-icon small">
        <FileText size={17} />
      </div>

      <div className="doc-row-name">
        <b>{doc.filename}</b>
        <small>
          {doc.page_count || '—'} pages ·{' '}
          {(doc.size_bytes / 1024 / 1024).toFixed(1)} MB
        </small>
      </div>

      <StatusBadge status={doc.status} />

      <button
        className="icon-btn danger-hover"
        onClick={onDelete}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function StatusBadge({ status }: any) {
  return (
    <span className={`badge ${status}`}>
      <i />
      {status}
    </span>
  );
}

function Empty({ icon: Icon, title, text, action }: any) {
  return (
    <div className="empty">
      <div>
        <Icon size={25} />
      </div>
      <b>{title}</b>
      <p>{text}</p>
      {action && (
        <button className="text-btn" onClick={action}>
          Get started →
        </button>
      )}
    </div>
  );
}

function Status({ label, value, ok }: any) {
  return (
    <div className="status-row">
      <span>{label}</span>
      <b className={ok ? 'good' : 'bad'}>
        <i />
        {value}
      </b>
    </div>
  );
}

function Citations({ citations }: any) {
  return (
    <div className="citations">
      <b>Sources</b>
      {citations?.map((c: any, i: number) => (
        <div className="citation" key={i}>
          <FileText size={14} />
          <span>{c.filename}</span>
          <em>Page {c.page}</em>
          <p>{c.excerpt}</p>
        </div>
      ))}
    </div>
  );
}

// Keep the research workspace behind login / registration.
export default function App() {
  return (
    <AuthGate>
      <WorkspaceApp />
    </AuthGate>
  );
}