# VetScholar AI — Updated Authentication Files
This bundle contains the complete current contents of the authentication-related files. Replace files at the matching paths. `App.tsx` is the existing dashboard with the AuthGate wrapper; `style.css` contains both the dashboard styles and authentication styles.
**Flow:** first account gets Sign Up; later visits get Sign In; a valid token opens the dashboard; Sign out clears the browser token.
**Important limitation:** this is a single-admin gate. The backend protects API routes but does not yet partition documents/conversations by multiple users.

---

## `frontend/src/App.tsx`

```tsx
import {useEffect,useState} from 'react';
import {api,Doc} from './api';
import AuthGate from './AuthGate';
import {Activity,BookOpen,BrainCircuit,ChartNoAxesCombined,FileText,FolderOpen,History,LayoutDashboard,Menu,MessageSquare,Moon,Plus,Search,Send,Settings,ShieldCheck,Sun,Trash2,UploadCloud,Workflow,PanelLeftClose,Stethoscope,CheckCircle2,AlertCircle,LoaderCircle} from 'lucide-react';

type Page='Dashboard'|'AI Research Assistant'|'Research Library'|'Paper Analysis'|'Compare Papers'|'Research History'|'Settings';
const nav:{name:Page;icon:any}[]=[{name:'Dashboard',icon:LayoutDashboard},{name:'AI Research Assistant',icon:BrainCircuit},{name:'Research Library',icon:FolderOpen},{name:'Paper Analysis',icon:FileText},{name:'Compare Papers',icon:Workflow},{name:'Research History',icon:History},{name:'Settings',icon:Settings}];
function WorkspaceApp(){
 const [page,setPage]=useState<Page>('Dashboard'),[docs,setDocs]=useState<Doc[]>([]),[dash,setDash]=useState<any>({}),[history,setHistory]=useState<any[]>([]),[conversation,setConversation]=useState<string|null>(null),[messages,setMessages]=useState<any[]>([]),[question,setQuestion]=useState(''),[selected,setSelected]=useState<string[]>([]),[loading,setLoading]=useState(false),[notice,setNotice]=useState(''),[ollama,setOllama]=useState<any>({connected:false}),[dark,setDark]=useState(false),[mobile,setMobile]=useState(false),[analysis,setAnalysis]=useState<any>(null),[compare,setCompare]=useState<any>(null);
 const refresh=async()=>{try{const [d,s,h,o]=await Promise.all([api.get('/documents'),api.get('/dashboard'),api.get('/history'),api.get('/health/ollama')]);setDocs(d.data);setDash(s.data);setHistory(h.data);setOllama(o.data)}catch{setNotice('Backend unavailable. Start FastAPI and refresh.')}};
 useEffect(()=>{refresh();const t=setInterval(refresh,7000);return()=>clearInterval(t)},[]);
 useEffect(()=>{document.documentElement.classList.toggle('dark',dark)},[dark]);
 const notify=(s:string)=>{setNotice(s);setTimeout(()=>setNotice(''),4500)};
 const upload=async(files:FileList|null)=>{if(!files)return;for(const f of Array.from(files)){const fd=new FormData();fd.append('file',f);try{await api.post('/documents/upload',fd,{headers:{'Content-Type':'multipart/form-data'}});notify(`${f.name} uploaded and indexed`)}catch(e:any){notify(e.response?.data?.detail||`Upload failed: ${f.name}`)}}await refresh()};
 const send=async(q=question)=>{if(!q.trim()||loading)return;const text=q;setQuestion('');setMessages(m=>[...m,{role:'user',content:text}]);setLoading(true);try{const r=await api.post('/chat',{question:text,conversation_id:conversation,document_ids:selected});setConversation(r.data.conversation_id);setMessages(m=>[...m,{role:'assistant',content:r.data.answer,citations:r.data.citations}]);await refresh()}catch(e:any){setMessages(m=>[...m,{role:'assistant',content:e.response?.data?.detail||'Unable to reach local AI. Check Ollama and the backend.'}])}finally{setLoading(false)}};
 const openConversation=async(id:string)=>{try{const r=await api.get(`/history/${id}`);setConversation(id);setMessages(r.data.messages);setPage('AI Research Assistant')}catch{notify('Unable to open conversation')}};
 const removeDoc=async(id:string)=>{if(!confirm('Permanently delete this document and its indexed vectors?'))return;try{await api.delete(`/documents/${id}`);notify('Document deleted');await refresh()}catch{notify('Deletion failed')}}
 const clearHistory=async()=>{if(!confirm('Delete all research conversations? Documents will be preserved.'))return;await api.delete('/history');setHistory([]);setConversation(null);setMessages([]);notify('History cleared')};
 const erase=async()=>{if(!confirm('ERASE ALL application documents, vectors, and conversations? This cannot be undone.'))return;try{await api.delete('/data/all');setMessages([]);setConversation(null);notify('Application data erased');await refresh()}catch{notify('Erase failed')}}
 const runSummary=async()=>{if(selected.length!==1){notify('Select exactly one paper in the library first');return}setLoading(true);try{const r=await api.post('/research/summarize',{document_ids:selected});setAnalysis(r.data)}catch(e:any){notify(e.response?.data?.detail||'Analysis failed')}finally{setLoading(false)}};
 const runCompare=async()=>{if(selected.length<2){notify('Select at least two papers in the library');return}setLoading(true);try{const r=await api.post('/research/compare',{document_ids:selected});setCompare(r.data)}catch(e:any){notify(e.response?.data?.detail||'Comparison failed')}finally{setLoading(false)}};
 const bytes=(n:number)=>n<1024*1024?`${(n/1024).toFixed(0)} KB`:`${(n/1024/1024).toFixed(1)} MB`;
 return <div className={`app ${dark?'dark':''}`}>
  <aside className={`sidebar ${mobile?'mobile-open':''}`}><div className="brand"><div className="brand-mark"><Stethoscope size={23}/></div><div><b>VetScholar<span> AI</span></b><small>CARE LAB · RESEARCH</small></div><button className="icon-btn close-mobile" onClick={()=>setMobile(false)}><PanelLeftClose/></button></div>
   <div className="workspace-label">WORKSPACE</div><nav>{nav.map(n=><button key={n.name} onClick={()=>{setPage(n.name);setMobile(false)}} className={`nav-item ${page===n.name?'active':''}`}><n.icon size={18}/><span>{n.name}</span>{n.name==='Research Library'&&<em>{docs.length}</em>}</button>)}</nav>
   <div className="sidebar-bottom"><div className="local-card"><div className="local-icon"><ShieldCheck size={17}/></div><div><b>Local-first privacy</b><small>Your research stays on this device</small></div><span className="green-dot"/></div><div className="profile"><div className="avatar">CL</div><div><b>Care Lab</b><small>Research workspace</small></div><button className="icon-btn" onClick={()=>setDark(!dark)} title="Toggle theme">{dark?<Sun size={17}/>:<Moon size={17}/>}</button></div></div>
  </aside>
  <main className="main"><header className="topbar"><button className="icon-btn menu-btn" onClick={()=>setMobile(!mobile)}><Menu/></button><div className="crumb">Workspace <span>/</span> <b>{page}</b></div><div className="top-actions"><div className={`system-pill ${ollama.connected?'online':''}`}><i/>{ollama.connected?'AI assistant ready':'AI assistant unavailable'}</div><button className="icon-btn" onClick={()=>setDark(!dark)}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button><div className="avatar small-avatar">CL</div></div></header>
   <div className="content">
    {page==='Dashboard'&&<><div className="page-heading"><div><div className="eyebrow">YOUR RESEARCH WORKSPACE</div><h1>Welcome to VetScholar AI</h1><p>Turn veterinary publications into structured, searchable scientific knowledge.</p></div><button className="btn primary" onClick={()=>{setPage('Research Library')}}><UploadCloud size={17}/> Upload research paper</button></div>
     <section className="hero"><div className="hero-copy"><span className="hero-tag"><BrainCircuit size={14}/> LOCAL AI RESEARCH</span><h2>Research smarter.<br/><i>Discover more.</i></h2><p>Explore your veterinary literature with evidence-grounded AI summaries, comparisons and answers.</p><button className="btn hero-btn" onClick={()=>{setPage('AI Research Assistant');setConversation(null);setMessages([])}}>Start new research <span>→</span></button></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="art-core"><Stethoscope size={54}/></div><div className="float-card fc-one"><BookOpen size={16}/><span>Research library</span><b>{dash.documents||0} papers</b></div><div className="float-card fc-two"><Activity size={16}/><span>AI engine</span><b>{ollama.connected?'Connected':'Offline'}</b></div><div className="art-dot dot-a"/><div className="art-dot dot-b"/></div></section>
     <div className="section-row"><div><h3>Research overview</h3><p>Your workspace at a glance</p></div><span className="updated"><span/> Live workspace data</span></div>
     <div className="stats-grid"><Stat icon={FileText} label="Research papers" value={dash.documents??'—'} note="Uploaded documents" tone="blue"/><Stat icon={CheckCircle2} label="Processed papers" value={dash.processed??'—'} note="Ready for research" tone="green"/><Stat icon={MessageSquare} label="Conversations" value={dash.conversations??'—'} note="Research discussions" tone="purple"/><Stat icon={ChartNoAxesCombined} label="Indexed chunks" value={dash.chunks??'—'} note="Searchable passages" tone="orange"/></div>
     <div className="two-col"><section className="panel"><div className="panel-head"><div><h3>Recent research papers</h3><p>Your latest additions</p></div><button className="text-btn" onClick={()=>setPage('Research Library')}>View library <span>→</span></button></div>{docs.slice(0,5).length?docs.slice(0,5).map(d=><DocRow key={d.id} doc={d} onDelete={()=>removeDoc(d.id)}/>):<Empty icon={FolderOpen} title="Your library is ready" text="Upload a veterinary paper to begin building your research collection." action={()=>setPage('Research Library')}/>}</section>
     <section className="panel"><div className="panel-head"><div><h3>Workspace status</h3><p>Your research environment at a glance</p></div><span className="status-live">LIVE</span></div><Status label="AI assistant" value={ollama.connected?'Ready to help':'Temporarily unavailable'} ok={ollama.connected}/><Status label="Research papers" value={`${dash.documents||0} in your library`} ok/><Status label="Research library" value="Private on this device" ok/><Status label="Data protection" value="Local-first workspace" ok/><div className="privacy-note"><ShieldCheck size={17}/><span><b>Your research stays private</b><small>Your papers and conversations remain in your local workspace.</small></span></div></section></div>
    </>}
    {page==='Research Library'&&<><PageTitle eyebrow="KNOWLEDGE COLLECTION" title="Research Library" sub="Manage, organize and search your veterinary research publications."/><div className="upload-zone"><input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" onChange={e=>upload(e.target.files)}/><div className="upload-icon"><UploadCloud size={25}/></div><h3>Drop research papers here</h3><p>or <b>browse files</b> from your computer</p><small>PDF, PNG, JPG or JPEG · Maximum 25 MB per file</small></div><div className="library-toolbar"><div><h3>All documents <span className="count">{docs.length}</span></h3><p>Select papers to analyze or compare</p></div><div className="toolbar-actions"><div className="searchbox"><Search size={16}/><input placeholder="Search documents..." onChange={e=>{(window as any).__docSearch=e.target.value;setDash((x:any)=>({...x,search:e.target.value}))}}/></div><button className="btn secondary" onClick={()=>{setSelected([]);notify('Selection cleared')}}>Clear selection</button></div></div><div className="doc-grid">{docs.filter(d=>d.filename.toLowerCase().includes((dash.search||'').toLowerCase())).map(d=><div className={`document-card ${selected.includes(d.id)?'selected':''}`} key={d.id}><div className="doc-card-top"><div className="pdf-icon"><FileText/></div><input type="checkbox" checked={selected.includes(d.id)} onChange={e=>setSelected(s=>e.target.checked?[...s,d.id]:s.filter(x=>x!==d.id))}/></div><h4 title={d.filename}>{d.filename}</h4><div className="doc-meta">{bytes(d.size_bytes)} <span>·</span> {d.page_count||'—'} pages</div><div className="doc-card-bottom"><StatusBadge status={d.status}/><button className="icon-btn danger-hover" onClick={()=>removeDoc(d.id)} title="Delete document"><Trash2 size={16}/></button></div>{d.error&&<small className="error-text">{d.error}</small>}</div>)}</div>{!docs.length&&<Empty icon={BookOpen} title="No papers uploaded yet" text="Your research library will appear here after your first upload." action={()=>document.querySelector<HTMLInputElement>('.upload-zone input')?.click()}/>}</>}
    {page==='AI Research Assistant'&&<><div className="chat-layout"><aside className="chat-side"><button className="btn primary full" onClick={()=>{setConversation(null);setMessages([])}}><Plus size={17}/> New conversation</button><div className="chat-side-label">RECENT CONVERSATIONS</div>{history.map(h=><button className={`history-item ${conversation===h.id?'chosen':''}`} key={h.id} onClick={()=>openConversation(h.id)}><MessageSquare size={15}/><span>{h.title}</span></button>)}{!history.length&&<p className="muted tiny">Your conversations will appear here.</p>}</aside><section className="chat-main"><div className="chat-topline"><div><span className="ai-badge"><BrainCircuit size={14}/> VETSCHOLAR ASSISTANT</span><h2>Veterinary research, understood.</h2><p>Answers grounded in your uploaded scientific literature.</p></div><div className="scope"><BookOpen size={15}/><select value={selected.length?selected[0]:'all'} onChange={e=>setSelected(e.target.value==='all'?[]:[e.target.value])}><option value="all">All research papers</option>{docs.map(d=><option key={d.id} value={d.id}>{d.filename}</option>)}</select></div></div><div className="messages">{messages.length===0?<div className="chat-welcome"><div className="welcome-symbol"><BrainCircuit size={31}/></div><h2>Explore veterinary science<br/><span>with your research library.</span></h2><p>Ask questions, summarize papers, compare findings and discover evidence across your uploaded publications.</p><div className="suggestions">{['Summarize my veterinary research paper','Extract the study methodology','What were the key research findings?','Identify limitations in this study'].map((s,i)=><button key={s} onClick={()=>send(s)}><span>{['✦','⌘','◈','↗'][i]}</span>{s}<b>↗</b></button>)}</div></div>:messages.map((m,i)=><div className={`message ${m.role}`} key={i}><div className="message-avatar">{m.role==='assistant'?<BrainCircuit size={17}/>:<span>CL</span>}</div><div className="message-body"><div className="message-label">{m.role==='assistant'?'VetScholar AI':'You'}</div><div className="message-content">{m.content}</div>{m.citations?.length>0&&<div className="citations"><b>Sources</b>{m.citations.map((c:any,j:number)=><div className="citation" key={j}><FileText size={14}/><span>{c.filename}</span><em>Page {c.page}</em><p>{c.excerpt}</p></div>)}</div>}</div></div>)}{loading&&<div className="message assistant"><div className="message-avatar"><BrainCircuit size={17}/></div><div className="message-body"><div className="message-label">VetScholar AI</div><div className="typing"><i/><i/><i/> Searching evidence and preparing answer…</div></div></div>}</div><div className="composer-wrap"><div className="composer"><textarea value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Ask a question about your veterinary research…" rows={2}/><button className="send-btn" disabled={!question.trim()||loading} onClick={()=>send()}><Send size={17}/></button></div><div className="composer-foot"><span><ShieldCheck size={13}/> Local AI · Evidence-based answers</span><span>Enter to send · Shift + Enter for new line</span></div></div></section></div></>}
    {page==='Paper Analysis'&&<><PageTitle eyebrow="STRUCTURED LITERATURE REVIEW" title="Paper Analysis" sub="Extract the essential scientific information from an uploaded publication."/><div className="panel analysis-panel"><div className="field-label">SELECT A RESEARCH PAPER</div><select className="select-field" value={selected[0]||''} onChange={e=>setSelected(e.target.value?[e.target.value]:[])}><option value="">Choose a paper from your library</option>{docs.filter(d=>d.status==='ready').map(d=><option key={d.id} value={d.id}>{d.filename}</option>)}</select><button className="btn primary" disabled={loading||selected.length!==1} onClick={runSummary}><BrainCircuit size={17}/>{loading?'Analyzing…':'Generate research analysis'}</button></div>{analysis&&<div className="panel report"><div className="panel-head"><div><h3>Research analysis report</h3><p>Generated from selected document evidence</p></div><button className="btn secondary" onClick={()=>navigator.clipboard.writeText(analysis.summary)}>Copy report</button></div><pre>{analysis.summary}</pre><Citations citations={analysis.citations}/></div>}</>}
    {page==='Compare Papers'&&<><PageTitle eyebrow="CROSS-PAPER SYNTHESIS" title="Compare research papers" sub="Identify similarities, differences and evidence gaps across publications."/><div className="panel"><h3>Select papers to compare</h3><p className="muted">Choose between 2 and 10 processed research papers.</p><div className="select-list">{docs.filter(d=>d.status==='ready').map(d=><label key={d.id}><input type="checkbox" checked={selected.includes(d.id)} onChange={e=>setSelected(s=>e.target.checked?[...s,d.id]:s.filter(x=>x!==d.id))}/><FileText size={17}/>{d.filename}</label>)}</div><button className="btn primary" disabled={loading||selected.length<2} onClick={runCompare}><Workflow size={17}/>{loading?'Comparing…':`Compare ${selected.length} papers`}</button></div>{compare&&<div className="panel report"><h3>Research comparison</h3><pre>{compare.comparison}</pre><Citations citations={compare.citations}/></div>}</>}
    {page==='Research History'&&<><PageTitle eyebrow="YOUR ACTIVITY" title="Research History" sub="Return to previous questions and literature discussions."/><div className="panel"><div className="panel-head"><div><h3>Conversations</h3><p>{history.length} saved research sessions</p></div><button className="btn danger" onClick={clearHistory}><Trash2 size={16}/> Clear history</button></div>{history.map(h=><div className="history-row" key={h.id}><MessageSquare size={18}/><div><b>{h.title}</b><small>{h.message_count} messages · {new Date(h.created_at).toLocaleString()}</small></div><button className="btn secondary" onClick={()=>openConversation(h.id)}>Open</button></div>)}{!history.length&&<Empty icon={History} title="No research history" text="Your conversations will be saved here."/>}</div></>}
    {page==='Settings'&&<><PageTitle eyebrow="APPLICATION PREFERENCES" title="Settings & privacy" sub="Manage your local AI configuration and research data."/><div className="settings-grid"><div className="panel"><h3>AI assistant</h3><p className="muted">Check whether your research assistant is ready to answer questions about your papers.</p><Status label="Assistant availability" value={ollama.connected?'Ready':'Unavailable'} ok={ollama.connected}/><Status label="Research library" value={`${docs.length} papers available`} ok/><Status label="Workspace privacy" value="Local-first" ok/><button className="btn secondary" onClick={refresh}>Refresh status</button></div><div className="panel"><h3>Privacy & data management</h3><p className="muted">Manage your local research data. These operations cannot be undone.</p><button className="setting-action" onClick={clearHistory}><span><History/>Clear chat history</span><Trash2 size={16}/></button><button className="setting-action" onClick={async()=>{if(confirm('Delete all uploaded research documents?')){await api.delete('/documents');await refresh();notify('All documents deleted')}}}><span><FolderOpen/>Delete all documents</span><Trash2 size={16}/></button><button className="setting-action destructive" onClick={erase}><span><AlertCircle/>Erase all application data</span><Trash2 size={16}/></button></div></div></>}
   </div><footer><span>© 2026 Care Lab · VetScholar AI</span><span>Built for evidence-led veterinary research</span></footer></main>{notice&&<div className="toast"><CheckCircle2 size={17}/>{notice}</div>}</div>
}
function Stat({icon:Icon,label,value,note,tone}:any){return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19}/></div><div className="stat-value">{value}</div><b>{label}</b><small>{note}</small></div>}
function PageTitle({eyebrow,title,sub}:any){return <div className="page-heading simple"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{sub}</p></div></div>}
function DocRow({doc,onDelete}:any){return <div className="doc-row"><div className="pdf-icon small"><FileText size={17}/></div><div className="doc-row-name"><b>{doc.filename}</b><small>{doc.page_count||'—'} pages · {(doc.size_bytes/1024/1024).toFixed(1)} MB</small></div><StatusBadge status={doc.status}/><button className="icon-btn danger-hover" onClick={onDelete}><Trash2 size={15}/></button></div>}
function StatusBadge({status}:any){return <span className={`badge ${status}`}><i/>{status}</span>}
function Empty({icon:Icon,title,text,action}:any){return <div className="empty"><div><Icon size={25}/></div><b>{title}</b><p>{text}</p>{action&&<button className="text-btn" onClick={action}>Get started →</button>}</div>}
function Status({label,value,ok}:any){return <div className="status-row"><span>{label}</span><b className={ok?'good':'bad'}><i/>{value}</b></div>}
function Citations({citations}:any){return <div className="citations"><b>Sources</b>{citations?.map((c:any,i:number)=><div className="citation" key={i}><FileText size={14}/><span>{c.filename}</span><em>Page {c.page}</em><p>{c.excerpt}</p></div>)}</div>}

// Keep the research workspace behind the login / first-time registration screen.
export default function App(){
  return (
    <AuthGate>
      <WorkspaceApp />
    </AuthGate>
  );
}
```

---

## `frontend/src/AuthGate.tsx`

```tsx
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Activity, LockKeyhole, Mail, ShieldCheck, Stethoscope } from 'lucide-react';
import { api, clearToken, getToken, saveToken } from './api';

type Props = { children: ReactNode };

export default function AuthGate({ children }: Props) {
  const [authenticated, setAuthenticated] = useState(Boolean(getToken()));
  const [checking, setChecking] = useState(true);
  const [registerMode, setRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (getToken()) {
        try {
          await api.get('/dashboard');
          if (active) setAuthenticated(true);
        } catch {
          clearToken();
          if (active) setAuthenticated(false);
        }
      }
      try {
        const response = await api.get('/auth/status');
        if (active) setRegisterMode(!response.data.account_exists);
      } catch {
        if (active) setError('Cannot connect to VetScholar backend. Start the backend and refresh.');
      } finally {
        if (active) setChecking(false);
      }
    };
    check();
    const onLogout = () => { clearToken(); setAuthenticated(false); };
    window.addEventListener('vetscholar:logout', onLogout);
    return () => { active = false; window.removeEventListener('vetscholar:logout', onLogout); };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 10) { setError('Password must contain at least 10 characters.'); return; }
    if (registerMode && password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const response = await api.post(registerMode ? '/auth/register' : '/auth/login', { email, password });
      saveToken(response.data.access_token);
      setAuthenticated(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Please try again.');
    } finally { setLoading(false); }
  };

  const logout = () => {
    clearToken(); setAuthenticated(false); setPassword(''); setConfirmPassword('');
  };

  if (checking) return <div className="auth-loading"><Activity size={25} /><p>Loading VetScholar AI...</p></div>;
  if (authenticated) return <><button className="auth-logout" onClick={logout}>Sign out</button>{children}</>;

  return <div className="auth-screen"><div className="auth-card">
    <div className="auth-brand"><div className="auth-logo"><Stethoscope size={27} /></div><div><h1>VetScholar <span>AI</span></h1><p>CARE LAB · VETERINARY RESEARCH</p></div></div>
    <div className="auth-heading"><div className="auth-icon">{registerMode ? <ShieldCheck size={22} /> : <LockKeyhole size={22} />}</div>
      <h2>{registerMode ? 'Create your workspace' : 'Welcome back'}</h2>
      <p>{registerMode ? 'Create the first administrator account to secure your research workspace.' : 'Sign in to access your veterinary research workspace.'}</p>
    </div>
    <form onSubmit={submit}>
      <label>Email address</label><div className="auth-input"><Mail size={17} /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="username" required /></div>
      <label>Password</label><div className="auth-input"><LockKeyhole size={17} /><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 10 characters" autoComplete={registerMode ? 'new-password' : 'current-password'} minLength={10} required /></div>
      {registerMode && <><label>Confirm password</label><div className="auth-input"><LockKeyhole size={17} /><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Enter password again" autoComplete="new-password" required /></div></>}
      {error && <div className="auth-error">{error}</div>}
      <button className="auth-submit" type="submit" disabled={loading}>{loading ? 'Please wait...' : registerMode ? 'Create secure account' : 'Sign in to VetScholar'}</button>
    </form>
    <div className="auth-security"><ShieldCheck size={16} /><span>Local account authentication. Passwords are stored as secure hashes.</span></div>
    <div className="auth-footer">© 2026 Care Lab · VetScholar AI</div>
  </div></div>;
}
```

---

## `frontend/src/api.ts`

```tsx
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  timeout: 180000
});

const TOKEN_KEY = 'vetscholar_access_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const saveToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 &&
        !error.config?.url?.includes('/auth/login') &&
        !error.config?.url?.includes('/auth/register')) {
      clearToken();
      window.dispatchEvent(new Event('vetscholar:logout'));
    }
    return Promise.reject(error);
  }
);

export type Doc = {
  id: string; filename: string; size_bytes: number; status: string;
  page_count: number; chunk_count: number; error?: string; created_at: string;
};
```

---

## `backend/app/auth.py`

```python
import base64
import hashlib
import hmac
import json
import secrets
import time
from pathlib import Path

from fastapi import HTTPException, Request
from .config import settings

# A per-installation signing key is generated once and kept in the local data folder.
# For a network deployment, configure a dedicated secret via environment variables.
def _secret_key() -> bytes:
    import os
    configured = os.getenv("VETSCHOLAR_SECRET_KEY")
    if configured:
        if len(configured) < 32:
            raise RuntimeError("VETSCHOLAR_SECRET_KEY must be at least 32 characters.")
        return configured.encode("utf-8")
    path = settings.data_dir / "auth.secret"
    if not path.exists():
        path.write_text(secrets.token_urlsafe(48), encoding="utf-8")
    return path.read_text(encoding="utf-8").strip().encode("utf-8")

TOKEN_LIFETIME_SECONDS = 8 * 60 * 60

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    derived = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return base64.b64encode(salt).decode() + "$" + base64.b64encode(derived).decode()

def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_text, hash_text = stored_hash.split("$", 1)
        salt = base64.b64decode(salt_text)
        expected = base64.b64decode(hash_text)
        actual = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1, dklen=32)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False

def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def create_token(user_id: str) -> str:
    header = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = _b64(json.dumps({"sub": user_id, "exp": int(time.time()) + TOKEN_LIFETIME_SECONDS}, separators=(",", ":")).encode())
    message = f"{header}.{payload}".encode()
    signature = hmac.new(_secret_key(), message, hashlib.sha256).digest()
    return f"{header}.{payload}.{_b64(signature)}"

def verify_token(token: str) -> str | None:
    try:
        header, payload, signature = token.split(".")
        message = f"{header}.{payload}".encode()
        expected = hmac.new(_secret_key(), message, hashlib.sha256).digest()
        supplied = base64.urlsafe_b64decode(signature + "=" * (-len(signature) % 4))
        if not hmac.compare_digest(expected, supplied):
            return None
        data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        if int(data.get("exp", 0)) <= int(time.time()):
            return None
        subject = data.get("sub")
        return subject if isinstance(subject, str) else None
    except Exception:
        return None
```

---

## `backend/app/models.py`

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

def now(): return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Document(Base):
    __tablename__ = "documents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    mime_type: Mapped[str] = mapped_column(String(20), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="queued")
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_count: Mapped[int] = mapped_column(Integer, default=0)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    chunks: Mapped[list["DocumentChunk"]] = relationship(back_populates="document", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    text_preview: Mapped[str] = mapped_column(Text, nullable=False)
    document: Mapped[Document] = relationship(back_populates="chunks")

class Conversation(Base):
    __tablename__ = "conversations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(250), default="New research conversation")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    messages: Mapped[list["Message"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    citations_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    conversation: Mapped[Conversation] = relationship(back_populates="messages")
```

---

## `backend/app/main.py`

```python
import json, uuid, httpx, logging, time
from pathlib import Path
from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from .config import settings
from .database import Base, engine, get_db, SessionLocal
from .models import User, Document, Conversation, Message, DocumentChunk
from .security import read_valid_upload, sha256, stored_name
from .ingestion import ingest
from .ai import ask
from .vector import store
from .auth import hash_password, verify_password, create_token, verify_token

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("vetscholar.api")

Base.metadata.create_all(bind=engine)
app = FastAPI(title=settings.app_name, version="1.0.0",
              description="Local-first veterinary scientific literature assistant")
app.add_middleware(CORSMiddleware, allow_origins=settings.origins,
                   allow_credentials=False, allow_methods=["GET","POST","DELETE"],
                   allow_headers=["Content-Type", "Authorization"])


PUBLIC_AUTH_PATHS = {
    "/api/health", "/api/health/ollama", "/api/auth/status",
    "/api/auth/register", "/api/auth/login",
}

@app.middleware("http")
async def authentication_middleware(request: Request, call_next):
    path = request.url.path
    if not path.startswith("/api/") or path in PUBLIC_AUTH_PATHS:
        return await call_next(request)
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        return JSONResponse(status_code=401, content={"detail": "Please login to continue."})
    user_id = verify_token(authorization.split(" ", 1)[1].strip())
    if not user_id:
        return JSONResponse(status_code=401, content={"detail": "Session expired. Please login again."})
    db = SessionLocal()
    try:
        if not db.get(User, user_id):
            return JSONResponse(status_code=401, content={"detail": "Account not found. Please login again."})
    finally:
        db.close()
    request.state.user_id = user_id
    return await call_next(request)

@app.get("/api/auth/status")
def auth_status(db: Session = Depends(get_db)):
    exists = (db.scalar(select(func.count()).select_from(User)) or 0) > 0
    return {"account_exists": exists, "registration_allowed": not exists}

@app.post("/api/auth/register")
def register(payload: dict, db: Session = Depends(get_db)):
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    if not email or "@" not in email or len(email) > 255:
        raise HTTPException(422, "Enter a valid email address.")
    if len(password) < 10:
        raise HTTPException(422, "Password must contain at least 10 characters.")
    if (db.scalar(select(func.count()).select_from(User)) or 0) > 0:
        raise HTTPException(403, "Registration is closed. Please login.")
    user = User(email=email, password_hash=hash_password(password))
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise HTTPException(409, "Unable to create account. The email may already be registered.")
    return {"access_token": create_token(user.id), "token_type": "bearer", "email": user.email}

@app.post("/api/auth/login")
def login(payload: dict, db: Session = Depends(get_db)):
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    user = db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password.")
    return {"access_token": create_token(user.id), "token_type": "bearer", "email": user.email}

def doc_json(d):
    return {"id":d.id,"filename":d.filename,"size_bytes":d.size_bytes,"status":d.status,
            "page_count":d.page_count,"chunk_count":d.chunk_count,"error":d.error,
            "created_at":d.created_at.isoformat() if d.created_at else None}

@app.get("/api/health")
def health():
    return {"status":"ok","app":settings.app_name,"model":settings.ollama_model}

@app.get("/api/health/ollama")
def ollama_health():
    try:
        r = httpx.get(f"{settings.ollama_base_url}/api/tags", timeout=3)
        r.raise_for_status()
        models = [m.get("name") for m in r.json().get("models", [])]
        return {"connected":True,"model":settings.ollama_model,"available_models":models,
                "model_available":any(settings.ollama_model in (m or "") for m in models)}
    except Exception as e:
        return {"connected":False,"model":settings.ollama_model,"error":str(e)}

@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)):
    return {"documents":db.scalar(select(func.count()).select_from(Document)) or 0,
            "processed":db.scalar(select(func.count()).select_from(Document).where(Document.status=="ready")) or 0,
            "conversations":db.scalar(select(func.count()).select_from(Conversation)) or 0,
            "chunks":db.scalar(select(func.count()).select_from(DocumentChunk)) or 0,
            "recent_documents":[doc_json(d) for d in db.scalars(select(Document).order_by(Document.created_at.desc()).limit(5))]}

@app.post("/api/documents/upload")
async def upload(file: UploadFile = File(...), db: Session = Depends(get_db)):
    started = time.perf_counter()
    name, ext, data = await read_valid_upload(file)
    digest = sha256(data)
    existing = db.scalar(select(Document).where(Document.sha256==digest))
    if existing: raise HTTPException(409, f"Duplicate document already exists: {existing.id}")
    stored = stored_name()
    path = settings.uploads_dir / stored
    path.write_bytes(data)
    d = Document(filename=name, stored_name=stored, sha256=digest, mime_type=ext,
                 size_bytes=len(data), status="queued")
    db.add(d); db.commit(); db.refresh(d)
    try:
        ingest(db, d, data, ext)
    except Exception as e:
        d.status="failed"; d.error=str(e)[:500]; db.commit()
        raise HTTPException(422, f"Document processing failed: {d.error}")
    logger.info("UPLOAD_METRICS filename=%s bytes=%d pages=%d chunks=%d elapsed_ms=%.2f status=%s", name, len(data), d.page_count, d.chunk_count, (time.perf_counter()-started)*1000, d.status)
    return doc_json(d)

@app.get("/api/documents")
def list_documents(db: Session = Depends(get_db)):
    return [doc_json(d) for d in db.scalars(select(Document).order_by(Document.created_at.desc()))]

def delete_doc(d: Document, db: Session):
    try: store().delete(where={"document_id":d.id})
    except Exception: pass
    path = settings.uploads_dir / d.stored_name
    if path.exists(): path.unlink()
    db.delete(d); db.commit()

@app.delete("/api/documents/{document_id}")
def remove_document(document_id: str, db: Session = Depends(get_db)):
    d = db.get(Document, document_id)
    if not d: raise HTTPException(404,"Document not found")
    delete_doc(d,db)
    return {"deleted":True,"document_id":document_id}

@app.delete("/api/documents")
def remove_all_documents(db: Session = Depends(get_db)):
    docs = list(db.scalars(select(Document)))
    for d in docs: delete_doc(d,db)
    return {"deleted_count":len(docs)}

@app.post("/api/chat")
def chat(payload: dict, db: Session = Depends(get_db)):
    request_started = time.perf_counter()
    question = str(payload.get("question", "")).strip()
    if len(question)<2 or len(question)>6000: raise HTTPException(422,"Question must be 2–6000 characters.")
    conversation_id = payload.get("conversation_id")
    conv = db.get(Conversation, conversation_id) if conversation_id else None
    if conversation_id and not conv: raise HTTPException(404,"Conversation not found")
    if not conv:
        conv=Conversation(title=question[:70]); db.add(conv); db.commit(); db.refresh(conv)
    ids = payload.get("document_ids") or []
    if len(ids)>100: raise HTTPException(422,"Too many selected documents.")
    for did in ids:
        if not db.get(Document,did): raise HTTPException(404,f"Unknown document: {did}")
    db.add(Message(conversation_id=conv.id,role="user",content=question)); db.commit()
    try: answer, citations = ask(question, ids or None)
    except Exception as e: raise HTTPException(503,f"Local AI request failed. Check Ollama and ChromaDB. {str(e)[:200]}")
    db.add(Message(conversation_id=conv.id,role="assistant",content=answer,citations_json=json.dumps(citations))); db.commit()
    logger.info("CHAT_REQUEST_METRICS conversation_id=%s elapsed_ms=%.2f citations=%d", conv.id, (time.perf_counter()-request_started)*1000, len(citations))
    return {"conversation_id":conv.id,"answer":answer,"citations":citations}

@app.get("/api/history")
def history(db: Session = Depends(get_db)):
    result=[]
    for c in db.scalars(select(Conversation).order_by(Conversation.created_at.desc())):
        result.append({"id":c.id,"title":c.title,"created_at":c.created_at.isoformat(),
                       "message_count":len(c.messages)})
    return result

@app.get("/api/history/{conversation_id}")
def conversation(conversation_id: str, db: Session = Depends(get_db)):
    c=db.get(Conversation,conversation_id)
    if not c: raise HTTPException(404,"Conversation not found")
    return {"id":c.id,"title":c.title,"messages":[{"id":m.id,"role":m.role,"content":m.content,
            "citations":json.loads(m.citations_json or "[]")} for m in c.messages]}

@app.delete("/api/history/{conversation_id}")
def delete_conversation(conversation_id: str, db: Session=Depends(get_db)):
    c=db.get(Conversation,conversation_id)
    if not c: raise HTTPException(404,"Conversation not found")
    db.delete(c); db.commit(); return {"deleted":True}

@app.delete("/api/history")
def clear_history(db: Session=Depends(get_db)):
    count=db.scalar(select(func.count()).select_from(Conversation)) or 0
    for c in list(db.scalars(select(Conversation))): db.delete(c)
    db.commit(); return {"deleted_conversations":count}

@app.post("/api/research/summarize")
def summarize(payload: dict, db: Session=Depends(get_db)):
    ids=payload.get("document_ids") or []
    if len(ids)!=1: raise HTTPException(422,"Select exactly one document.")
    answer,citations=ask("Create a structured scientific summary: title, objective, animal species, study population, sample size, methodology, statistical methods, key findings, limitations and conclusion. Mark unavailable fields as not reported.",ids)
    return {"summary":answer,"citations":citations}

@app.post("/api/research/compare")
def compare(payload: dict, db: Session=Depends(get_db)):
    ids=payload.get("document_ids") or []
    if len(ids)<2 or len(ids)>10: raise HTTPException(422,"Select 2–10 documents.")
    answer,citations=ask("Compare these papers by objectives, species, sample sizes, study design, methodology, findings, statistics, limitations and conclusions. Clearly distinguish missing and conflicting evidence.",ids)
    return {"comparison":answer,"citations":citations}

@app.get("/api/settings")
def settings_api():
    return {"model":settings.ollama_model,"embedding_model":settings.embedding_model,
            "data_directory":str(settings.data_dir.resolve()),"max_upload_mb":settings.max_upload_mb,
            "ollama_url":settings.ollama_base_url}

@app.delete("/api/data/all")
def erase_all(db: Session=Depends(get_db)):
    for c in list(db.scalars(select(Conversation))): db.delete(c)
    db.commit()
    docs=list(db.scalars(select(Document)))
    for d in docs: delete_doc(d,db)
    return {"erased":True,"documents_deleted":len(docs),"conversations_deleted":True}
```

---

## `frontend/src/style.css`

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');
@tailwind base;@tailwind components;@tailwind utilities;
:root{font-family:'DM Sans',sans-serif;color:#1e293b;background:#f7f9fc;font-synthesis:none;text-rendering:optimizeLegibility}*{box-sizing:border-box}body{margin:0}button,input,textarea,select{font:inherit}button{cursor:pointer}.app{--bg:#f7f9fc;--surface:#fff;--text:#1e293b;--muted:#718096;--line:#e7edf3;--navy:#142b4a;--teal:#0d9488;min-height:100vh;background:var(--bg);color:var(--text);display:flex}.app.dark{--bg:#0e1726;--surface:#152338;--text:#e7edf5;--muted:#9aaabe;--line:#2b3a50;--navy:#d9e8fa}.sidebar{width:252px;position:fixed;inset:0 auto 0 0;background:var(--surface);border-right:1px solid var(--line);padding:25px 16px 16px;display:flex;flex-direction:column;z-index:20}.brand{display:flex;align-items:center;gap:11px;padding:0 8px 34px}.brand-mark{width:42px;height:42px;border-radius:13px;background:#e6f5f3;color:#0d9488;display:grid;place-items:center}.brand b{font:800 18px Manrope}.brand b span{color:#0d9488}.brand small{display:block;font-size:9px;letter-spacing:1.8px;color:var(--muted);margin-top:3px;font-weight:700}.workspace-label,.chat-side-label{font-size:10px;letter-spacing:1.6px;color:#9aa7b8;font-weight:700;padding:0 12px 12px}.sidebar nav{display:grid;gap:5px}.nav-item{height:43px;border:0;background:transparent;color:var(--muted);display:flex;align-items:center;gap:12px;padding:0 12px;border-radius:9px;text-align:left;font-size:13px;font-weight:600}.nav-item:hover{background:var(--bg);color:var(--text)}.nav-item.active{background:#e9f6f4;color:#087f76}.dark .nav-item.active{background:#163e43;color:#76d7cb}.nav-item em{font-style:normal;margin-left:auto;font-size:11px;background:#edf1f5;padding:2px 7px;border-radius:20px}.sidebar-bottom{margin-top:auto}.local-card{display:flex;gap:10px;align-items:center;padding:12px;background:#f0f8f6;border:1px solid #e0f0ec;border-radius:10px;margin:0 2px 15px;position:relative}.dark .local-card{background:#153b3c;border-color:#255454}.local-icon{color:#0d9488}.local-card b,.profile b{display:block;font-size:11px}.local-card small,.profile small{display:block;font-size:10px;color:var(--muted);margin-top:3px}.green-dot,.updated span{width:7px;height:7px;background:#16a34a;border-radius:50%;display:inline-block}.green-dot{margin-left:auto}.profile{border-top:1px solid var(--line);padding:15px 4px 0;display:flex;align-items:center;gap:10px}.avatar{width:34px;height:34px;border-radius:10px;background:#e6eff8;color:#244b72;display:grid;place-items:center;font-weight:800;font-size:11px}.profile .icon-btn{margin-left:auto}.main{margin-left:252px;width:calc(100% - 252px);min-height:100vh;display:flex;flex-direction:column}.topbar{height:68px;background:var(--surface);border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 36px;position:sticky;top:0;z-index:10}.crumb{font-size:12px;color:var(--muted)}.crumb span{padding:0 9px;color:#c0c9d3}.crumb b{color:var(--text);font-weight:600}.top-actions{display:flex;align-items:center;gap:16px}.system-pill{font-size:11px;color:#b45309;background:#fff7e8;padding:7px 10px;border-radius:20px;display:flex;align-items:center;gap:7px}.system-pill i{width:6px;height:6px;border-radius:50%;background:#d97706}.system-pill.online{color:#15803d;background:#edf9f0}.system-pill.online i{background:#16a34a}.small-avatar{width:31px;height:31px}.icon-btn{border:0;background:transparent;color:var(--muted);width:32px;height:32px;border-radius:8px;display:grid;place-items:center}.icon-btn:hover{background:var(--bg);color:var(--text)}.danger-hover:hover{color:#dc2626;background:#fff1f1}.menu-btn,.close-mobile{display:none}.content{max-width:1500px;width:100%;padding:34px 38px 42px;margin:0 auto;flex:1}.page-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:26px}.page-heading.simple{margin-bottom:27px}.eyebrow{font-size:10px;letter-spacing:1.8px;font-weight:800;color:#0d9488;margin-bottom:9px}.page-heading h1{font:800 27px Manrope;margin:0;color:var(--text);letter-spacing:-.8px}.page-heading p{font-size:13px;color:var(--muted);margin:8px 0 0}.btn{border:1px solid transparent;border-radius:8px;padding:10px 14px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-size:12px;font-weight:700;transition:.18s}.btn.primary{background:#0d9488;color:white;box-shadow:0 4px 12px #0d948825}.btn.primary:hover{background:#087f76;transform:translateY(-1px)}.btn.secondary{background:var(--surface);border-color:var(--line);color:var(--text)}.btn.secondary:hover{border-color:#a7c9c5}.btn.danger{background:#fff1f1;color:#b91c1c}.btn:disabled{opacity:.45;cursor:not-allowed}.hero{min-height:270px;background:linear-gradient(110deg,#142b4a 0%,#183e5b 62%,#116d70 100%);border-radius:16px;overflow:hidden;position:relative;color:white;padding:31px 38px;display:flex;justify-content:space-between;box-shadow:0 12px 30px #142b4a18}.hero-copy{max-width:480px;position:relative;z-index:2}.hero-tag,.ai-badge{display:inline-flex;align-items:center;gap:7px;background:#ffffff18;border:1px solid #ffffff20;padding:6px 9px;border-radius:30px;font-size:9px;letter-spacing:1.1px;font-weight:700;color:#b9e7e1}.hero h2{font:800 34px/1.15 Manrope;letter-spacing:-1px;margin:17px 0 9px}.hero h2 i{font-style:normal;color:#6fe0ce}.hero p{font-size:12px;color:#c4d6e2;max-width:390px;line-height:1.7;margin:0 0 17px}.hero-btn{background:white;color:#173b55;padding:10px 14px}.hero-btn span{font-size:17px}.hero-art{width:340px;position:relative;display:grid;place-items:center;margin-right:32px}.art-core{width:120px;height:120px;border-radius:50%;display:grid;place-items:center;color:#a9f1e4;background:radial-gradient(circle,#ffffff2b,#ffffff08);border:1px solid #ffffff50;box-shadow:0 0 60px #6de2d333;z-index:1}.orbit{position:absolute;border:1px solid #ffffff27;border-radius:50%;transform:rotate(-25deg)}.orbit-one{width:230px;height:145px}.orbit-two{width:300px;height:190px;transform:rotate(45deg)}.float-card{position:absolute;background:#fff;color:#213d54;padding:10px 12px;border-radius:9px;box-shadow:0 8px 25px #00182c38;display:grid;grid-template-columns:20px auto;column-gap:7px;align-items:center;font-size:10px}.float-card svg{grid-row:span 2;color:#0d9488}.float-card span{color:#718096}.float-card b{font-size:11px}.fc-one{top:28px;right:-4px}.fc-two{bottom:28px;left:-10px}.art-dot{position:absolute;width:8px;height:8px;border-radius:50%;background:#75e4d2;box-shadow:0 0 15px #75e4d2}.dot-a{top:38px;left:25px}.dot-b{bottom:30px;right:36px}.section-row{display:flex;align-items:center;justify-content:space-between;margin:28px 0 14px}.section-row h3,.panel h3,.library-toolbar h3{font:700 15px Manrope;margin:0}.section-row p,.panel-head p,.library-toolbar p{font-size:11px;color:var(--muted);margin:5px 0 0}.updated{font-size:10px;color:var(--muted);display:flex;align-items:center;gap:7px}.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.stat-card{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:16px 17px;box-shadow:0 3px 12px #142b4a05}.stat-icon{width:35px;height:35px;border-radius:9px;display:grid;place-items:center;margin-bottom:12px}.stat-icon.blue{background:#eaf2ff;color:#4b75bd}.stat-icon.green{background:#e7f7f1;color:#0d9488}.stat-icon.purple{background:#f1edff;color:#8064c5}.stat-icon.orange{background:#fff2e7;color:#d9823d}.stat-value{font:800 24px Manrope;color:var(--text);margin-bottom:2px}.stat-card>b{font-size:11px;display:block}.stat-card small{font-size:10px;color:var(--muted);display:block;margin-top:4px}.two-col{display:grid;grid-template-columns:1.25fr 1fr;gap:15px;margin-top:17px}.panel{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:19px;box-shadow:0 3px 12px #142b4a05}.panel-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}.text-btn{border:0;background:transparent;color:#0d9488;font-size:11px;font-weight:700}.text-btn span{font-size:15px;margin-left:4px}.doc-row{display:flex;align-items:center;gap:10px;padding:11px 0;border-top:1px solid var(--line)}.pdf-icon{width:39px;height:39px;background:#fff1ef;color:#d96b5c;border-radius:9px;display:grid;place-items:center;flex-shrink:0}.pdf-icon.small{width:33px;height:33px}.doc-row-name{min-width:0;flex:1}.doc-row-name b{font-size:11px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.doc-row-name small{font-size:10px;color:var(--muted);display:block;margin-top:4px}.badge{font-size:9px;font-weight:700;text-transform:capitalize;padding:5px 8px;border-radius:20px;display:inline-flex;align-items:center;gap:5px;background:#f1f5f9;color:#64748b;white-space:nowrap}.badge i,.status-row b i{width:5px;height:5px;border-radius:50%;background:currentColor}.badge.ready{background:#eaf8ef;color:#168044}.badge.processing,.badge.queued{background:#fff6e6;color:#b7791f}.badge.failed{background:#fff0f0;color:#c24141}.status-live{font-size:9px;letter-spacing:1px;color:#168044;background:#eaf8ef;padding:5px 7px;border-radius:5px;font-weight:800}.status-row{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--line);font-size:11px;color:var(--muted)}.status-row b{font-size:10px;display:flex;align-items:center;gap:6px}.status-row b.good{color:#168044}.status-row b.bad{color:#c07a25}.privacy-note{margin-top:14px;padding:11px;background:#f0f8f6;border-radius:8px;color:#0d9488;display:flex;gap:9px;align-items:center}.dark .privacy-note{background:#153b3c}.privacy-note b{display:block;font-size:10px}.privacy-note small{display:block;font-size:9px;color:var(--muted);margin-top:3px}.empty{padding:28px 10px;text-align:center;color:var(--muted)}.empty>div{width:46px;height:46px;border-radius:13px;background:#eaf6f4;color:#0d9488;display:grid;place-items:center;margin:0 auto 12px}.empty b{font-size:12px;color:var(--text)}.empty p{font-size:11px;max-width:280px;margin:7px auto 10px;line-height:1.6}.upload-zone{position:relative;border:1.5px dashed #b8d7d2;border-radius:13px;background:linear-gradient(110deg,#f0faf8,#f7fbff);padding:26px;text-align:center;margin-bottom:25px;overflow:hidden}.dark .upload-zone{background:#142e3a}.upload-zone input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}.upload-icon{width:46px;height:46px;background:#dff3ef;color:#0d9488;border-radius:13px;display:grid;place-items:center;margin:0 auto 10px}.upload-zone h3{font:700 14px Manrope;margin:0}.upload-zone p{font-size:11px;color:var(--muted);margin:6px}.upload-zone p b{color:#0d9488}.upload-zone small{font-size:9px;color:#94a3b8}.library-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:13px}.count{font:600 10px 'DM Sans';background:#eaf6f4;color:#0d9488;padding:3px 7px;border-radius:12px;margin-left:5px}.toolbar-actions{display:flex;gap:8px}.searchbox{height:36px;border:1px solid var(--line);background:var(--surface);border-radius:8px;display:flex;align-items:center;gap:7px;padding:0 10px;color:var(--muted)}.searchbox input{border:0;outline:0;background:transparent;color:var(--text);font-size:11px;width:150px}.doc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}.document-card{background:var(--surface);border:1px solid var(--line);border-radius:11px;padding:14px;min-width:0}.document-card.selected{border-color:#0d9488;box-shadow:0 0 0 2px #0d94881a}.doc-card-top{display:flex;justify-content:space-between;align-items:center}.doc-card-top input,.select-list input{accent-color:#0d9488}.document-card h4{font-size:11px;margin:13px 0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.doc-meta{font-size:10px;color:var(--muted)}.doc-meta span{padding:0 4px}.doc-card-bottom{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);margin-top:13px;padding-top:10px}.error-text{display:block;color:#c24141;font-size:9px;margin-top:8px}.chat-layout{height:calc(100vh - 145px);min-height:590px;display:grid;grid-template-columns:230px minmax(0,1fr);background:var(--surface);border:1px solid var(--line);border-radius:13px;overflow:hidden}.chat-side{background:#f9fbfd;border-right:1px solid var(--line);padding:17px 12px;overflow:auto}.dark .chat-side{background:#111f31}.full{width:100%}.chat-side-label{padding:25px 8px 10px;font-size:9px}.history-item{width:100%;display:flex;align-items:center;gap:8px;text-align:left;border:0;background:transparent;padding:10px 8px;color:var(--muted);font-size:10px;border-radius:7px}.history-item span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.history-item:hover,.history-item.chosen{background:#eaf6f4;color:#087f76}.muted{color:var(--muted);font-size:11px}.tiny{font-size:10px;padding:0 8px}.chat-main{display:flex;flex-direction:column;min-width:0}.chat-topline{padding:19px 24px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:15px}.ai-badge{background:#e8f6f3;color:#0d8177;border:0;font-size:8px}.chat-topline h2{font:800 19px Manrope;margin:8px 0 3px}.chat-topline p{font-size:10px;color:var(--muted);margin:0}.scope{border:1px solid var(--line);border-radius:7px;padding:8px;display:flex;gap:6px;align-items:center;color:var(--muted)}.scope select{border:0;outline:0;background:transparent;color:var(--text);font-size:10px;max-width:155px}.messages{flex:1;overflow:auto;padding:22px 8%;}.chat-welcome{max-width:610px;margin:35px auto 0;text-align:center}.welcome-symbol{width:58px;height:58px;border-radius:17px;background:#e5f5f2;color:#0d9488;display:grid;place-items:center;margin:0 auto 18px}.chat-welcome h2{font:800 27px/1.25 Manrope;letter-spacing:-.7px;margin:0}.chat-welcome h2 span{color:#0d9488}.chat-welcome>p{font-size:11px;color:var(--muted);line-height:1.7;max-width:430px;margin:10px auto 22px}.suggestions{display:grid;grid-template-columns:1fr 1fr;gap:9px;text-align:left}.suggestions button{border:1px solid var(--line);background:var(--surface);border-radius:8px;padding:11px;display:flex;align-items:center;gap:8px;font-size:10px;color:var(--text);text-align:left}.suggestions button:hover{border-color:#9dcfc8;background:#f5fbfa}.suggestions button span{color:#0d9488}.suggestions button b{margin-left:auto;color:#8ba0ad}.message{display:flex;gap:10px;margin:0 0 23px}.message.user{flex-direction:row-reverse}.message-avatar{width:29px;height:29px;border-radius:9px;background:#e7f5f2;color:#0d9488;display:grid;place-items:center;flex-shrink:0;font-size:9px;font-weight:800}.message.user .message-avatar{background:#eaf0f8;color:#244b72}.message-body{max-width:88%;min-width:0}.message.user .message-body{text-align:right}.message-label{font-size:9px;color:var(--muted);font-weight:700;margin:2px 0 6px}.message-content{font-size:12px;line-height:1.75;white-space:pre-wrap;background:#f7f9fc;padding:12px 14px;border-radius:3px 10px 10px 10px;text-align:left}.dark .message-content{background:#1b2c43}.message.user .message-content{background:#eaf6f4;border-radius:10px 3px 10px 10px;display:inline-block}.citations{margin-top:11px;text-align:left}.citations>b{font-size:10px;color:var(--muted);display:block;margin-bottom:6px}.citation{border:1px solid var(--line);border-radius:7px;padding:8px 10px;display:grid;grid-template-columns:16px minmax(0,1fr) auto;gap:7px;align-items:center;margin-top:6px;font-size:10px;color:#0d8177}.citation span{color:var(--text);overflow:hidden;text-overflow:ellipsis}.citation em{font-style:normal;color:var(--muted);font-size:9px}.citation p{grid-column:2/4;color:var(--muted);font-size:9px;line-height:1.5;margin:0}.typing{font-size:10px;color:var(--muted);display:flex;align-items:center;gap:5px}.typing i{width:5px;height:5px;border-radius:50%;background:#0d9488;animation:pulse 1s infinite}.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}@keyframes pulse{50%{opacity:.25;transform:translateY(-3px)}}.composer-wrap{padding:12px 8% 14px;border-top:1px solid var(--line)}.composer{border:1px solid #dbe4eb;border-radius:10px;background:var(--surface);display:flex;align-items:flex-end;padding:8px 9px;gap:10px;box-shadow:0 3px 12px #142b4a08}.composer:focus-within{border-color:#82c4bb;box-shadow:0 0 0 3px #0d948810}.composer textarea{flex:1;resize:none;border:0;outline:0;background:transparent;color:var(--text);font-size:11px;line-height:1.6;padding:5px;max-height:100px}.send-btn{width:33px;height:33px;border:0;border-radius:8px;background:#0d9488;color:white;display:grid;place-items:center}.send-btn:disabled{opacity:.4}.composer-foot{display:flex;justify-content:space-between;color:#98a5b3;font-size:9px;margin-top:7px}.composer-foot span:first-child{display:flex;align-items:center;gap:5px}.analysis-panel{display:flex;align-items:end;gap:12px;flex-wrap:wrap}.field-label{width:100%;font-size:9px;letter-spacing:1px;color:var(--muted);font-weight:800}.select-field{min-width:300px;max-width:100%;height:39px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--text);font-size:11px}.report{margin-top:17px}.report pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.8 'DM Sans';color:var(--text)}.select-list{display:grid;gap:9px;margin:16px 0}.select-list label{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--line);border-radius:8px;font-size:11px}.select-list label svg{color:#d96b5c}.history-row{display:flex;align-items:center;gap:12px;padding:13px 0;border-top:1px solid var(--line);color:#0d9488}.history-row div{flex:1;min-width:0}.history-row b{display:block;font-size:11px;color:var(--text)}.history-row small{display:block;font-size:10px;color:var(--muted);margin-top:4px}.settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}.settings-grid .panel h3{margin-bottom:14px}.setting-action{width:100%;border:0;border-top:1px solid var(--line);background:transparent;padding:13px 2px;display:flex;justify-content:space-between;align-items:center;color:var(--muted);font-size:11px}.setting-action span{display:flex;align-items:center;gap:9px;color:var(--text)}.setting-action svg{width:16px}.setting-action.destructive{color:#dc2626}.toast{position:fixed;right:24px;bottom:24px;z-index:50;background:#173b4a;color:white;padding:12px 16px;border-radius:9px;box-shadow:0 8px 25px #00182c30;font-size:11px;display:flex;gap:8px;align-items:center}footer{border-top:1px solid var(--line);padding:14px 38px;display:flex;justify-content:space-between;color:#9aa7b8;font-size:9px}.dark{background:var(--bg);color:var(--text)}.dark .topbar,.dark .panel,.dark .stat-card,.dark .document-card,.dark .chat-layout{background:var(--surface)}.dark .upload-zone{border-color:#345a63}.dark .searchbox{background:var(--surface)}.dark .suggestions button{background:var(--surface);color:var(--text)}.dark .message.user .message-content{background:#173e43}.dark .system-pill.online{background:#173b2b}.dark .pdf-icon{background:#3b2c32}.dark .select-field{background:var(--surface)}
@media(max-width:1100px){.content{padding:28px 25px}.hero-art{margin-right:0;width:280px}.stats-grid{grid-template-columns:repeat(2,1fr)}.doc-grid{grid-template-columns:repeat(2,1fr)}.chat-layout{grid-template-columns:190px minmax(0,1fr)}}
@media(max-width:760px){.sidebar{transform:translateX(-100%);transition:.25s}.sidebar.mobile-open{transform:translateX(0);box-shadow:10px 0 40px #00182c25}.close-mobile,.menu-btn{display:grid}.main{margin-left:0;width:100%}.topbar{padding:0 15px;height:58px}.crumb{font-size:10px}.top-actions{gap:8px}.system-pill{font-size:0;padding:8px}.system-pill i{width:7px;height:7px}.content{padding:23px 15px}.page-heading{align-items:flex-start;flex-direction:column}.page-heading h1{font-size:23px}.hero{padding:24px;min-height:260px}.hero h2{font-size:29px}.hero-art{position:absolute;right:-90px;opacity:.25}.stats-grid{gap:9px}.stat-card{padding:13px}.two-col,.settings-grid{grid-template-columns:1fr}.doc-grid{grid-template-columns:1fr}.library-toolbar{align-items:flex-start;gap:12px;flex-direction:column}.toolbar-actions{width:100%}.searchbox{flex:1}.searchbox input{width:100%}.chat-layout{height:calc(100vh - 105px);min-height:600px;display:flex;flex-direction:column}.chat-side{display:none}.chat-topline{padding:14px;align-items:flex-start;flex-direction:column}.chat-topline h2{font-size:16px}.messages{padding:18px 13px}.chat-welcome{margin:22px auto 0}.chat-welcome h2{font-size:22px}.suggestions{grid-template-columns:1fr}.composer-wrap{padding:10px}.composer-foot span:last-child{display:none}.analysis-panel{align-items:stretch;flex-direction:column}.select-field{min-width:0;width:100%}.history-row{gap:7px}footer{padding:13px 15px;gap:10px;flex-wrap:wrap}.fc-one,.fc-two{display:none}}

/* Authentication screen */
.auth-screen,.auth-loading{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f4f7fb;color:#172033}
.auth-loading{flex-direction:column;gap:12px;color:#52647c}
.auth-card{width:100%;max-width:440px;padding:38px;background:#fff;border:1px solid #e5eaf1;border-radius:18px;box-shadow:0 18px 55px rgba(24,45,75,.09)}
.auth-brand{display:flex;align-items:center;gap:13px;margin-bottom:38px}
.auth-logo{width:48px;height:48px;display:grid;place-items:center;border-radius:13px;background:#eaf2ff;color:#2865c7}
.auth-brand h1{margin:0;font-size:21px;font-weight:750}.auth-brand h1 span{color:#3476d4}
.auth-brand p{margin:4px 0 0;font-size:9px;letter-spacing:1.2px;color:#8290a3}
.auth-heading{margin-bottom:27px}.auth-icon{width:42px;height:42px;display:grid;place-items:center;margin-bottom:17px;border-radius:12px;background:#edf4ff;color:#3476d4}
.auth-heading h2{margin:0 0 8px;font-size:25px;font-weight:700}.auth-heading p{margin:0;color:#77849a;font-size:13px;line-height:1.6}
.auth-card form label{display:block;margin:17px 0 8px;font-size:12px;font-weight:650;color:#344258}
.auth-input{display:flex;align-items:center;gap:10px;height:47px;padding:0 13px;border:1px solid #dce3ed;border-radius:9px;color:#8492a6}
.auth-input:focus-within{border-color:#4383dc;box-shadow:0 0 0 3px rgba(67,131,220,.1)}
.auth-input input{width:100%;height:100%;border:0;outline:0;background:transparent;color:#172033;font-size:13px}
.auth-submit{width:100%;height:48px;margin-top:24px;border:0;border-radius:9px;background:#2868c7;color:white;font-size:13px;font-weight:650;cursor:pointer}
.auth-submit:hover{background:#1d56a9}.auth-submit:disabled{opacity:.6;cursor:wait}
.auth-error{margin-top:14px;padding:11px;border-radius:8px;background:#fff0f0;color:#b42318;font-size:12px}
.auth-security{display:flex;align-items:flex-start;gap:9px;margin-top:23px;padding:13px;border-radius:9px;background:#f3f8f5;color:#557363;font-size:11px;line-height:1.5}
.auth-security svg{flex-shrink:0}.auth-footer{margin-top:27px;text-align:center;color:#99a3b2;font-size:11px}
.auth-logout{position:fixed;z-index:9999;top:17px;right:18px;padding:8px 13px;border:1px solid #dce3ed;border-radius:8px;background:white;color:#344258;font-size:12px;cursor:pointer}
.dark .auth-logout{background:#1c2636;color:#e5edf8;border-color:#39465a}
@media(max-width:520px){.auth-card{padding:27px 22px}}
```

---

## `backend/.env.example`

```dotenv
DATA_DIR=../data
MAX_UPLOAD_MB=25
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:3b
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```
