import { useState, useEffect, useRef, createContext, useContext } from "react";

// ─── THEME CONTEXT ───────────────────────────────────────────────────────────
const ThemeContext = createContext(null);
const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }) {
  const [dark, setDark] = useState(true);
  const [primaryColor, setPrimaryColor] = useState("#f59e0b");
  const [logo, setLogo] = useState(null);

  const toggle = () => setDark(d => !d);

  return (
    <ThemeContext.Provider value={{ dark, toggle, primaryColor, setPrimaryColor, logo, setLogo }}>
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh",
        background: dark ? "#09090b" : "#f4f4f5",
        color: dark ? "#fafafa" : "#18181b",
        transition: "background 0.3s, color 0.3s" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

// ─── APP STATE ────────────────────────────────────────────────────────────────
const initialBarbers = [
  {
    id: 1, name: "Carlos Silva", role: "barber", avatar: "CS",
    specialty: "Corte Clássico", rating: 4.9, clients: 312,
    bio: "Especialista em cortes clássicos e modernos. 8 anos de experiência.",
    instagram: "carlossilva.barber", whatsapp: "71999990001",
    promotions: [
      { id: 1, title: "Combo Verão", desc: "Corte + Barba por R$55", badge: "🔥", price: "R$55", oldPrice: "R$80", active: true }
    ],
    stories: [{ id: 1, text: "Novo corte degradê disponível!", time: "2h atrás", color: "#f59e0b" }],
    notifications: [],
    services: ["Corte Masculino", "Barba", "Degradê", "Navalhado"],
    schedule: "Seg–Sáb: 09h–20h",
    gallery: ["🪒", "✂️", "💈"]
  },
  {
    id: 2, name: "Diego Mendes", role: "barber", avatar: "DM",
    specialty: "Barba & Bigode", rating: 4.8, clients: 198,
    bio: "Apaixonado por barbas! Tratamentos especiais com produtos naturais.",
    instagram: "diegomendes.barber", whatsapp: "71999990002",
    promotions: [
      { id: 1, title: "Barba Completa", desc: "Barba + hidratação por R$45", badge: "⭐", price: "R$45", oldPrice: "R$65", active: true }
    ],
    stories: [{ id: 1, text: "Promoção especial só hoje!", time: "1h atrás", color: "#8b5cf6" }],
    notifications: [],
    services: ["Barba", "Bigode", "Hidratação", "Design de barba"],
    schedule: "Ter–Dom: 10h–21h",
    gallery: ["🧔", "💈", "🪒"]
  }
];

const initialUsers = [
  { id: 1, name: "Admin Master", role: "admin", email: "admin@barberpro.com", avatar: "AM" },
  { id: 2, name: "Carlos Silva", role: "barber", email: "carlos@barberpro.com", avatar: "CS", barberId: 1 },
  { id: 3, name: "Diego Mendes", role: "barber", email: "diego@barberpro.com", avatar: "DM", barberId: 2 },
  { id: 4, name: "João Cliente", role: "client", email: "joao@email.com", avatar: "JC" }
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const hex2rgba = (hex, a) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
};

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
function Btn({ children, onClick, variant = "primary", size = "md", style: sx = {}, disabled }) {
  const { dark, primaryColor } = useTheme();
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6, cursor: disabled ? "not-allowed" : "pointer",
    border: "none", borderRadius: 12, fontWeight: 600, transition: "all 0.18s",
    opacity: disabled ? 0.5 : 1,
    fontSize: size === "sm" ? 13 : size === "lg" ? 16 : 14,
    padding: size === "sm" ? "6px 14px" : size === "lg" ? "14px 28px" : "10px 20px",
  };
  const variants = {
    primary: { background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`, color: "#000", boxShadow: `0 4px 15px ${hex2rgba(primaryColor, 0.35)}` },
    ghost: { background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", color: dark ? "#fff" : "#000" },
    danger: { background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" },
    outline: { background: "transparent", color: primaryColor, border: `1.5px solid ${primaryColor}` }
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...sx }}>{children}</button>;
}

function Badge({ children, color = "#f59e0b" }) {
  return <span style={{ background: hex2rgba(color, 0.15), color, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{children}</span>;
}

function Card({ children, style: sx = {}, onClick }) {
  const { dark } = useTheme();
  return (
    <div onClick={onClick} style={{
      background: dark ? "#18181b" : "#fff",
      borderRadius: 20, padding: 20,
      border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}`,
      boxShadow: dark ? "0 2px 20px rgba(0,0,0,0.4)" : "0 2px 12px rgba(0,0,0,0.06)",
      cursor: onClick ? "pointer" : "default",
      transition: "box-shadow 0.2s",
      ...sx
    }}>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, rows }) {
  const { dark, primaryColor } = useTheme();
  const [focus, setFocus] = useState(false);
  const base = {
    width: "100%", boxSizing: "border-box", padding: "10px 14px",
    borderRadius: 12, border: `1.5px solid ${focus ? primaryColor : dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.15)"}`,
    background: dark ? "#09090b" : "#f9fafb", color: dark ? "#fff" : "#000",
    fontSize: 14, outline: "none", transition: "border 0.18s",
    resize: rows ? "vertical" : undefined
  };
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, opacity: 0.7 }}>{label}</label>}
      {rows
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} style={base} />
        : <input value={value} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} style={base} />
      }
    </div>
  );
}

function Avatar({ initials, size = 40, color = "#f59e0b", src }) {
  if (src) return <img src={src} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${color}cc, ${color}66)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: size * 0.38, color: "#fff", flexShrink: 0,
      border: `2px solid ${color}44`
    }}>
      {initials}
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  const { dark } = useTheme();
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "relative", zIndex: 1, width: "100%", maxWidth: 500,
        background: dark ? "#18181b" : "#fff",
        borderRadius: "24px 24px 0 0", padding: 24, paddingBottom: 32,
        boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
        animation: "slideUp 0.25s ease-out",
        maxHeight: "90vh", overflowY: "auto"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontWeight: 800, fontSize: 18, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, opacity: 0.6, color: "inherit" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({ message, onClose }) {
  const { primaryColor } = useTheme();
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999,
      background: "#18181b", color: "#fff", borderRadius: 14,
      padding: "12px 20px", boxShadow: `0 4px 20px ${hex2rgba(primaryColor, 0.3)}`,
      border: `1px solid ${primaryColor}44`, fontWeight: 600, fontSize: 14,
      animation: "slideUp 0.2s", display: "flex", alignItems: "center", gap: 10 }}>
      ✅ {message}
    </div>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({ currentUser, onLogout, setView }) {
  const { dark, toggle, primaryColor, logo } = useTheme();
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 100,
      background: dark ? "rgba(9,9,11,0.92)" : "rgba(244,244,245,0.92)",
      backdropFilter: "blur(12px)",
      borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}`,
      padding: "0 20px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setView("home")}>
        {logo
          ? <img src={logo} alt="Logo" style={{ height: 32, width: 32, borderRadius: 8, objectFit: "cover" }} />
          : <span style={{ fontSize: 24 }}>💈</span>
        }
        <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: -0.5 }}>
          <span style={{ color: primaryColor }}>Barber</span>Pro
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={toggle} title="Alternar tema" style={{
          background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          border: "none", borderRadius: 10, width: 36, height: 36,
          cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center"
        }}>{dark ? "☀️" : "🌙"}</button>

        {currentUser && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar initials={currentUser.avatar} size={32} color={primaryColor} />
            <button onClick={onLogout} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 12, opacity: 0.6, color: "inherit", fontWeight: 600
            }}>Sair</button>
          </div>
        )}
      </div>
    </header>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const { dark, primaryColor, logo } = useTheme();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const users = [
    { email: "admin@barberpro.com", pass: "admin123", id: 1 },
    { email: "carlos@barberpro.com", pass: "barber123", id: 2 },
    { email: "diego@barberpro.com", pass: "barber123", id: 3 },
    { email: "joao@email.com", pass: "cliente123", id: 4 },
  ];

  const handleLogin = () => {
    const found = users.find(u => u.email === email && u.pass === pass);
    if (found) { onLogin(found.id); setErr(""); }
    else setErr("Email ou senha incorretos");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          {logo
            ? <img src={logo} alt="Logo" style={{ height: 64, borderRadius: 16, marginBottom: 12 }} />
            : <div style={{ fontSize: 56, marginBottom: 8 }}>💈</div>
          }
          <h1 style={{ fontWeight: 900, fontSize: 32, letterSpacing: -1, margin: 0 }}>
            <span style={{ color: primaryColor }}>Barber</span>Pro
          </h1>
          <p style={{ opacity: 0.5, marginTop: 6 }}>Sistema de Barbearia Premium</p>
        </div>

        <Card>
          <h2 style={{ fontWeight: 800, fontSize: 20, margin: "0 0 20px" }}>Entrar</h2>
          <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="seu@email.com" />
          <Input label="Senha" value={pass} onChange={setPass} type="password" placeholder="••••••••" />
          {err && <p style={{ color: "#ef4444", fontSize: 13, marginTop: -8, marginBottom: 12 }}>{err}</p>}
          <Btn onClick={handleLogin} size="lg" style={{ width: "100%" }}>Entrar</Btn>
          <div style={{ marginTop: 20, padding: 14, borderRadius: 12, background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", fontSize: 12, opacity: 0.7 }}>
            <strong>Contas de teste:</strong><br />
            admin@barberpro.com / admin123 → Admin<br />
            carlos@barberpro.com / barber123 → Barbeiro<br />
            joao@email.com / cliente123 → Cliente
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── HOME CLIENTE ─────────────────────────────────────────────────────────────
function HomeClient({ barbers, currentUser }) {
  const { dark, primaryColor } = useTheme();
  const [selectedStory, setSelectedStory] = useState(null);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [bookingBarber, setBookingBarber] = useState(null);
  const [bookingStep, setBookingStep] = useState(0);
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [booked, setBooked] = useState(false);

  const allStories = barbers.flatMap(b => b.stories.map(s => ({ ...s, barberName: b.name, barberInitials: b.avatar })));
  const allPromos = barbers.flatMap(b => b.promotions.filter(p => p.active).map(p => ({ ...p, barberName: b.name })));
  const allNotifs = barbers.flatMap(b => (b.notifications || []).filter(n => n.target === "all" || n.target === currentUser?.id));

  const times = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

  const confirmBooking = () => {
    setBooked(true);
    setTimeout(() => { setBookingBarber(null); setBookingStep(0); setBooked(false); setSelectedService(""); setSelectedDate(""); setSelectedTime(""); }, 2500);
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>
      {/* Notifications */}
      {allNotifs.length > 0 && (
        <div style={{ padding: "12px 20px 0" }}>
          {allNotifs.map((n, i) => (
            <div key={i} style={{ background: hex2rgba(primaryColor, 0.12), border: `1px solid ${hex2rgba(primaryColor, 0.3)}`, borderRadius: 14, padding: "10px 16px", marginBottom: 8, fontSize: 13, display: "flex", gap: 10, alignItems: "center" }}>
              <span>🔔</span><div><strong>{n.title}</strong><br /><span style={{ opacity: 0.7 }}>{n.body}</span></div>
            </div>
          ))}
        </div>
      )}

      {/* Stories */}
      <div style={{ padding: "20px 20px 0", overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 14 }}>
          {allStories.map((s, i) => (
            <div key={i} onClick={() => setSelectedStory(s)} style={{ flexShrink: 0, textAlign: "center", cursor: "pointer" }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", padding: 3, background: `linear-gradient(135deg, ${s.color || primaryColor}, ${s.color || primaryColor}66)` }}>
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: dark ? "#09090b" : "#f4f4f5", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18 }}>
                  {s.barberInitials}
                </div>
              </div>
              <p style={{ fontSize: 11, marginTop: 5, opacity: 0.7, width: 64, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.barberName.split(" ")[0]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Hero Banner */}
      <div style={{ margin: "20px", borderRadius: 22, padding: "28px 24px", background: `linear-gradient(135deg, #1a0a00, #2d1600, ${primaryColor}22)`, border: `1px solid ${primaryColor}33`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -10, top: -10, fontSize: 80, opacity: 0.08 }}>💈</div>
        <Badge color={primaryColor}>✨ Em destaque</Badge>
        <h1 style={{ fontWeight: 900, fontSize: 26, margin: "12px 0 8px", letterSpacing: -0.5 }}>
          O melhor corte<br />da cidade
        </h1>
        <p style={{ opacity: 0.6, fontSize: 14, margin: "0 0 16px" }}>Agende com os melhores barbeiros</p>
        <Btn onClick={() => document.getElementById("barbeiros")?.scrollIntoView({ behavior: "smooth" })}>Agendar agora →</Btn>
      </div>

      {/* Promoções */}
      {allPromos.length > 0 && (
        <div style={{ padding: "0 20px" }}>
          <h2 style={{ fontWeight: 800, fontSize: 18, marginBottom: 14 }}>🔥 Promoções</h2>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
            {allPromos.map((p, i) => (
              <div key={i} style={{ flexShrink: 0, width: 200, background: dark ? "#18181b" : "#fff", borderRadius: 18, padding: 16, border: `1px solid ${primaryColor}22` }}>
                <span style={{ fontSize: 24 }}>{p.badge}</span>
                <h3 style={{ fontWeight: 800, fontSize: 15, margin: "8px 0 4px" }}>{p.title}</h3>
                <p style={{ fontSize: 12, opacity: 0.6, margin: "0 0 10px" }}>{p.desc}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 900, fontSize: 18, color: primaryColor }}>{p.price}</span>
                  <span style={{ fontSize: 12, textDecoration: "line-through", opacity: 0.4 }}>{p.oldPrice}</span>
                </div>
                <p style={{ fontSize: 11, opacity: 0.5, margin: "4px 0 0" }}>por {p.barberName}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barbeiros */}
      <div id="barbeiros" style={{ padding: "20px 20px 0" }}>
        <h2 style={{ fontWeight: 800, fontSize: 18, marginBottom: 14 }}>✂️ Nossos Barbeiros</h2>
        {barbers.map(b => (
          <Card key={b.id} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <Avatar initials={b.avatar} size={52} color={primaryColor} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: 16, margin: "0 0 2px" }}>{b.name}</h3>
                    <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>{b.specialty}</p>
                  </div>
                  <Badge color={primaryColor}>⭐ {b.rating}</Badge>
                </div>
                <p style={{ fontSize: 13, opacity: 0.7, margin: "8px 0 10px" }}>{b.schedule}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn onClick={() => setSelectedBarber(b)} variant="ghost" size="sm">Ver perfil</Btn>
                  <Btn onClick={() => { setBookingBarber(b); setBookingStep(1); }} size="sm">Agendar</Btn>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Story Viewer */}
      {selectedStory && (
        <div onClick={() => setSelectedStory(null)} style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ maxWidth: 340, width: "90%", textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: selectedStory.color || primaryColor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 28, color: "#000", margin: "0 auto 16px" }}>{selectedStory.barberInitials}</div>
            <p style={{ fontWeight: 700, fontSize: 20, color: "#fff", marginBottom: 8 }}>{selectedStory.barberName}</p>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.8)", marginBottom: 4 }}>{selectedStory.text}</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{selectedStory.time}</p>
          </div>
        </div>
      )}

      {/* Barber Profile */}
      <Modal open={!!selectedBarber} onClose={() => setSelectedBarber(null)} title="Perfil do Barbeiro">
        {selectedBarber && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <Avatar initials={selectedBarber.avatar} size={72} color={primaryColor} />
              <h2 style={{ fontWeight: 800, fontSize: 22, margin: "12px 0 4px" }}>{selectedBarber.name}</h2>
              <Badge color={primaryColor}>{selectedBarber.specialty}</Badge>
              <p style={{ fontSize: 14, opacity: 0.7, margin: "12px 0" }}>{selectedBarber.bio}</p>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
              {selectedBarber.gallery?.map((g, i) => <span key={i} style={{ fontSize: 36 }}>{g}</span>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              <div style={{ padding: 14, borderRadius: 14, background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", textAlign: "center" }}>
                <div style={{ fontWeight: 900, fontSize: 22, color: primaryColor }}>{selectedBarber.rating}</div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>Avaliação</div>
              </div>
              <div style={{ padding: 14, borderRadius: 14, background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", textAlign: "center" }}>
                <div style={{ fontWeight: 900, fontSize: 22, color: primaryColor }}>{selectedBarber.clients}</div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>Clientes</div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Serviços</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selectedBarber.services?.map((s, i) => <Badge key={i} color={primaryColor}>{s}</Badge>)}
              </div>
            </div>
            {selectedBarber.instagram && (
              <a href={`https://instagram.com/${selectedBarber.instagram}`} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, color: "#e1306c", textDecoration: "none", fontSize: 14, marginBottom: 8 }}>
                📸 @{selectedBarber.instagram}
              </a>
            )}
            {selectedBarber.whatsapp && (
              <a href={`https://wa.me/${selectedBarber.whatsapp}`} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, color: "#25d366", textDecoration: "none", fontSize: 14 }}>
                💬 WhatsApp
              </a>
            )}
            <Btn onClick={() => { setSelectedBarber(null); setBookingBarber(selectedBarber); setBookingStep(1); }} style={{ width: "100%", marginTop: 16 }}>Agendar com {selectedBarber.name.split(" ")[0]}</Btn>
          </div>
        )}
      </Modal>

      {/* Booking Flow */}
      <Modal open={!!bookingBarber} onClose={() => { setBookingBarber(null); setBookingStep(0); }} title={booked ? "Confirmado! 🎉" : `Agendar — Passo ${bookingStep}/3`}>
        {bookingBarber && !booked && (
          <div>
            {bookingStep === 1 && (
              <div>
                <p style={{ fontWeight: 700, marginBottom: 12 }}>Escolha o serviço:</p>
                {bookingBarber.services?.map(s => (
                  <div key={s} onClick={() => setSelectedService(s)} style={{ padding: "12px 16px", borderRadius: 12, marginBottom: 8, cursor: "pointer", background: selectedService === s ? hex2rgba(primaryColor, 0.15) : dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", border: `1.5px solid ${selectedService === s ? primaryColor : "transparent"}` }}>
                    ✂️ {s}
                  </div>
                ))}
                <Btn onClick={() => setBookingStep(2)} disabled={!selectedService} style={{ width: "100%", marginTop: 8 }}>Próximo →</Btn>
              </div>
            )}
            {bookingStep === 2 && (
              <div>
                <Input label="Data" value={selectedDate} onChange={setSelectedDate} type="date" />
                <p style={{ fontWeight: 700, marginBottom: 10 }}>Horário:</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {times.map(t => (
                    <div key={t} onClick={() => setSelectedTime(t)} style={{ padding: "10px 0", borderRadius: 10, textAlign: "center", fontSize: 13, fontWeight: 600, cursor: "pointer", background: selectedTime === t ? primaryColor : dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", color: selectedTime === t ? "#000" : "inherit" }}>
                      {t}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <Btn onClick={() => setBookingStep(1)} variant="ghost" style={{ flex: 1 }}>← Voltar</Btn>
                  <Btn onClick={() => setBookingStep(3)} disabled={!selectedDate || !selectedTime} style={{ flex: 1 }}>Próximo →</Btn>
                </div>
              </div>
            )}
            {bookingStep === 3 && (
              <div>
                <Card style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                    <Avatar initials={bookingBarber.avatar} size={44} color={primaryColor} />
                    <div><p style={{ fontWeight: 700, margin: 0 }}>{bookingBarber.name}</p><p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>{selectedService}</p></div>
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.8 }}>
                    📅 {selectedDate} às {selectedTime}
                  </div>
                </Card>
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn onClick={() => setBookingStep(2)} variant="ghost" style={{ flex: 1 }}>← Voltar</Btn>
                  <Btn onClick={confirmBooking} style={{ flex: 1 }}>Confirmar ✓</Btn>
                </div>
              </div>
            )}
          </div>
        )}
        {booked && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h3 style={{ fontWeight: 800, fontSize: 22 }}>Agendado!</h3>
            <p style={{ opacity: 0.7 }}>Seu horário foi confirmado com sucesso.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── PAINEL DO BARBEIRO ────────────────────────────────────────────────────────
function BarberPanel({ barber, onUpdate, toast }) {
  const { dark, primaryColor } = useTheme();
  const [tab, setTab] = useState("dash");

  const tabs = [
    { id: "dash", label: "Dashboard", icon: "📊" },
    { id: "promotions", label: "Promoções", icon: "🔥" },
    { id: "stories", label: "Stories", icon: "📸" },
    { id: "notifications", label: "Notificações", icon: "🔔" },
    { id: "profile", label: "Perfil", icon: "👤" },
  ];

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", paddingBottom: 80 }}>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, padding: "16px 20px 0", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flexShrink: 0, padding: "8px 14px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: tab === t.id ? primaryColor : dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
            color: tab === t.id ? "#000" : "inherit", transition: "all 0.18s"
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      <div style={{ padding: 20 }}>
        {tab === "dash" && <BarberDash barber={barber} />}
        {tab === "promotions" && <BarberPromotions barber={barber} onUpdate={onUpdate} toast={toast} />}
        {tab === "stories" && <BarberStories barber={barber} onUpdate={onUpdate} toast={toast} />}
        {tab === "notifications" && <BarberNotifications barber={barber} onUpdate={onUpdate} toast={toast} />}
        {tab === "profile" && <BarberProfile barber={barber} onUpdate={onUpdate} toast={toast} />}
      </div>
    </div>
  );
}

function BarberDash({ barber }) {
  const { primaryColor } = useTheme();
  const stats = [
    { label: "Clientes", value: barber.clients, icon: "👥" },
    { label: "Avaliação", value: barber.rating, icon: "⭐" },
    { label: "Promoções", value: barber.promotions.filter(p => p.active).length, icon: "🔥" },
    { label: "Stories", value: barber.stories.length, icon: "📸" },
  ];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <Avatar initials={barber.avatar} size={56} color={primaryColor} />
        <div>
          <h2 style={{ fontWeight: 900, fontSize: 22, margin: 0 }}>Olá, {barber.name.split(" ")[0]}!</h2>
          <p style={{ opacity: 0.6, margin: 0, fontSize: 14 }}>{barber.specialty}</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        {stats.map(s => (
          <Card key={s.label}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontWeight: 900, fontSize: 28, color: primaryColor }}>{s.value}</div>
            <div style={{ fontSize: 13, opacity: 0.6 }}>{s.label}</div>
          </Card>
        ))}
      </div>
      <Card>
        <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Próximos agendamentos</h3>
        {["João Silva — Corte — 10:00", "Maria Costa — Barba — 11:30", "Pedro Lima — Combo — 14:00"].map((ag, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
            <span style={{ fontSize: 14 }}>✂️ {ag}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function BarberPromotions({ barber, onUpdate, toast }) {
  const { dark, primaryColor } = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [badge, setBadge] = useState("🔥");

  const add = () => {
    if (!title) return;
    const p = { id: Date.now(), title, desc, price, oldPrice, badge, active: true };
    onUpdate({ promotions: [...barber.promotions, p] });
    setTitle(""); setDesc(""); setPrice(""); setOldPrice(""); setShowForm(false);
    toast("Promoção criada!");
  };

  const toggle = (id) => {
    onUpdate({ promotions: barber.promotions.map(p => p.id === id ? { ...p, active: !p.active } : p) });
  };

  const remove = (id) => {
    onUpdate({ promotions: barber.promotions.filter(p => p.id !== id) });
    toast("Promoção removida");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontWeight: 800, fontSize: 20, margin: 0 }}>🔥 Promoções</h2>
        <Btn onClick={() => setShowForm(s => !s)} size="sm">{showForm ? "Cancelar" : "+ Nova"}</Btn>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 14 }}>Nova promoção</h3>
          <Input label="Título" value={title} onChange={setTitle} placeholder="Ex: Combo Verão" />
          <Input label="Descrição" value={desc} onChange={setDesc} placeholder="Ex: Corte + Barba por R$55" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="Preço" value={price} onChange={setPrice} placeholder="R$55" />
            <Input label="Preço antigo" value={oldPrice} onChange={setOldPrice} placeholder="R$80" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, opacity: 0.7 }}>Emoji</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["🔥", "⭐", "💎", "🎯", "✨", "💰"].map(e => (
                <div key={e} onClick={() => setBadge(e)} style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, cursor: "pointer", fontSize: 20, background: badge === e ? hex2rgba(primaryColor, 0.2) : dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", border: badge === e ? `2px solid ${primaryColor}` : "2px solid transparent" }}>{e}</div>
              ))}
            </div>
          </div>
          <Btn onClick={add} style={{ width: "100%" }}>Criar promoção</Btn>
        </Card>
      )}

      {barber.promotions.map(p => (
        <Card key={p.id} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontSize: 32 }}>{p.badge}</span>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: 16, margin: "0 0 4px" }}>{p.title}</h3>
                <p style={{ fontSize: 13, opacity: 0.6, margin: "0 0 6px" }}>{p.desc}</p>
                <span style={{ fontWeight: 900, color: primaryColor }}>{p.price}</span>
                {p.oldPrice && <span style={{ fontSize: 12, textDecoration: "line-through", opacity: 0.4, marginLeft: 8 }}>{p.oldPrice}</span>}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
              <Badge color={p.active ? "#22c55e" : "#6b7280"}>{p.active ? "Ativo" : "Inativo"}</Badge>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn onClick={() => toggle(p.id)} variant="ghost" size="sm">{p.active ? "Pausar" : "Ativar"}</Btn>
                <Btn onClick={() => remove(p.id)} variant="danger" size="sm">✕</Btn>
              </div>
            </div>
          </div>
        </Card>
      ))}
      {barber.promotions.length === 0 && <p style={{ opacity: 0.5, textAlign: "center", padding: 30 }}>Nenhuma promoção cadastrada</p>}
    </div>
  );
}

function BarberStories({ barber, onUpdate, toast }) {
  const { primaryColor } = useTheme();
  const [text, setText] = useState("");
  const [color, setColor] = useState(primaryColor);

  const add = () => {
    if (!text) return;
    const s = { id: Date.now(), text, time: "Agora", color };
    onUpdate({ stories: [...barber.stories, s] });
    setText(""); toast("Story publicado!");
  };

  const remove = (id) => {
    onUpdate({ stories: barber.stories.filter(s => s.id !== id) });
    toast("Story removido");
  };

  return (
    <div>
      <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>📸 Stories</h2>
      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 14 }}>Novo story</h3>
        <Input label="Mensagem" value={text} onChange={setText} placeholder="Ex: Novidade! Corte degradê disponível..." rows={3} />
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, opacity: 0.7 }}>Cor</label>
          <div style={{ display: "flex", gap: 8 }}>
            {["#f59e0b", "#8b5cf6", "#ef4444", "#22c55e", "#3b82f6", "#ec4899"].map(c => (
              <div key={c} onClick={() => setColor(c)} style={{ width: 30, height: 30, borderRadius: "50%", background: c, cursor: "pointer", border: color === c ? "3px solid white" : "3px solid transparent" }} />
            ))}
          </div>
        </div>
        <Btn onClick={add} style={{ width: "100%" }} disabled={!text}>Publicar story</Btn>
      </Card>

      {barber.stories.map(s => (
        <Card key={s.id} style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#000", fontSize: 16 }}>{barber.avatar}</div>
            <div>
              <p style={{ fontSize: 14, margin: 0, fontWeight: 500 }}>{s.text}</p>
              <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>{s.time}</p>
            </div>
          </div>
          <Btn onClick={() => remove(s.id)} variant="danger" size="sm">✕</Btn>
        </Card>
      ))}
      {barber.stories.length === 0 && <p style={{ opacity: 0.5, textAlign: "center", padding: 30 }}>Nenhum story publicado</p>}
    </div>
  );
}

function BarberNotifications({ barber, onUpdate, toast }) {
  const { primaryColor } = useTheme();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("all");

  const send = () => {
    if (!title || !body) return;
    const n = { id: Date.now(), title, body, target, sentAt: new Date().toLocaleTimeString("pt-BR") };
    onUpdate({ notifications: [...(barber.notifications || []), n] });
    setTitle(""); setBody("");
    toast("Notificação enviada!");
  };

  return (
    <div>
      <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>🔔 Notificações</h2>
      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 14 }}>Nova notificação</h3>
        <Input label="Título" value={title} onChange={setTitle} placeholder="Ex: Promoção especial!" />
        <Input label="Mensagem" value={body} onChange={setBody} placeholder="Ex: Hoje com 20% de desconto..." rows={3} />
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, opacity: 0.7 }}>Destinatário</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ v: "all", l: "🌍 Todos os usuários" }, { v: "clients", l: "👥 Meus clientes" }].map(opt => (
              <div key={opt.v} onClick={() => setTarget(opt.v)} style={{ flex: 1, padding: "10px 12px", borderRadius: 12, cursor: "pointer", textAlign: "center", fontSize: 13, fontWeight: 600, background: target === opt.v ? hex2rgba(primaryColor, 0.15) : "rgba(255,255,255,0.04)", border: `1.5px solid ${target === opt.v ? primaryColor : "transparent"}` }}>{opt.l}</div>
            ))}
          </div>
        </div>
        <Btn onClick={send} style={{ width: "100%" }} disabled={!title || !body}>Enviar notificação 🔔</Btn>
      </Card>

      <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Histórico</h3>
      {(barber.notifications || []).slice().reverse().map(n => (
        <Card key={n.id} style={{ marginBottom: 10, padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong style={{ fontSize: 14 }}>{n.title}</strong>
            <span style={{ fontSize: 11, opacity: 0.5 }}>{n.sentAt}</span>
          </div>
          <p style={{ fontSize: 13, opacity: 0.7, margin: "4px 0 6px" }}>{n.body}</p>
          <Badge color={primaryColor}>{n.target === "all" ? "🌍 Geral" : "👥 Clientes"}</Badge>
        </Card>
      ))}
      {!(barber.notifications?.length) && <p style={{ opacity: 0.5, textAlign: "center", padding: 20 }}>Nenhuma notificação enviada</p>}
    </div>
  );
}

function BarberProfile({ barber, onUpdate, toast }) {
  const { primaryColor } = useTheme();
  const [name, setName] = useState(barber.name);
  const [bio, setBio] = useState(barber.bio || "");
  const [specialty, setSpecialty] = useState(barber.specialty || "");
  const [instagram, setInstagram] = useState(barber.instagram || "");
  const [whatsapp, setWhatsapp] = useState(barber.whatsapp || "");
  const [schedule, setSchedule] = useState(barber.schedule || "");

  const save = () => {
    onUpdate({ name, bio, specialty, instagram, whatsapp, schedule });
    toast("Perfil atualizado!");
  };

  return (
    <div>
      <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>👤 Meu Perfil</h2>
      <Card>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <Avatar initials={barber.avatar} size={72} color={primaryColor} />
          <p style={{ opacity: 0.5, fontSize: 12, marginTop: 8 }}>Foto do perfil</p>
        </div>
        <Input label="Nome completo" value={name} onChange={setName} placeholder="Seu nome" />
        <Input label="Especialidade" value={specialty} onChange={setSpecialty} placeholder="Ex: Corte Clássico" />
        <Input label="Biografia" value={bio} onChange={setBio} placeholder="Fale sobre você..." rows={3} />
        <Input label="Horário de atendimento" value={schedule} onChange={setSchedule} placeholder="Ex: Seg–Sáb: 09h–20h" />

        <h3 style={{ fontWeight: 700, marginBottom: 12 }}>🔗 Redes Sociais</h3>
        <Input label="Instagram (usuário)" value={instagram} onChange={setInstagram} placeholder="seuusuario" />
        <Input label="WhatsApp (com DDD)" value={whatsapp} onChange={setWhatsapp} placeholder="71999990000" />

        <Btn onClick={save} style={{ width: "100%" }}>Salvar alterações</Btn>
      </Card>
    </div>
  );
}

// ─── PAINEL ADMIN ─────────────────────────────────────────────────────────────
function AdminPanel({ barbers, onUpdateBarbers, toast }) {
  const { dark, primaryColor, setPrimaryColor, setLogo } = useTheme();
  const [tab, setTab] = useState("dash");
  const [showAddBarber, setShowAddBarber] = useState(false);
  const [newBarberName, setNewBarberName] = useState("");
  const [newBarberSpec, setNewBarberSpec] = useState("");
  const [newBarberEmail, setNewBarberEmail] = useState("");

  const stats = [
    { label: "Barbeiros", value: barbers.length, icon: "✂️", color: primaryColor },
    { label: "Clientes", value: "1.2k", icon: "👥", color: "#8b5cf6" },
    { label: "Agendamentos", value: "347", icon: "📅", color: "#22c55e" },
    { label: "Receita (mês)", value: "R$18k", icon: "💰", color: "#ef4444" },
  ];

  const addBarber = () => {
    if (!newBarberName) return;
    const initials = newBarberName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    const nb = {
      id: Date.now(), name: newBarberName, specialty: newBarberSpec || "Barbeiro",
      avatar: initials, rating: 5.0, clients: 0, bio: "", instagram: "", whatsapp: "",
      promotions: [], stories: [], notifications: [], services: ["Corte Masculino"], schedule: "Seg–Sáb: 09h–20h", gallery: ["✂️"]
    };
    onUpdateBarbers([...barbers, nb]);
    setNewBarberName(""); setNewBarberSpec(""); setNewBarberEmail("");
    setShowAddBarber(false); toast("Barbeiro adicionado!");
  };

  const removeBarber = (id) => { onUpdateBarbers(barbers.filter(b => b.id !== id)); toast("Barbeiro removido"); };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setLogo(reader.result); toast("Logo atualizado!"); };
    reader.readAsDataURL(file);
  };

  const tabs = [
    { id: "dash", label: "Dashboard", icon: "📊" },
    { id: "barbers", label: "Barbeiros", icon: "✂️" },
    { id: "customize", label: "Customizar", icon: "🎨" },
    { id: "reports", label: "Relatórios", icon: "📈" },
  ];

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", paddingBottom: 40 }}>
      {/* Admin badge */}
      <div style={{ margin: "16px 20px 0", display: "flex", alignItems: "center", gap: 10 }}>
        <Badge color={primaryColor}>🛡️ Admin Master</Badge>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: "16px 20px 0", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flexShrink: 0, padding: "8px 14px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: tab === t.id ? primaryColor : dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
            color: tab === t.id ? "#000" : "inherit", transition: "all 0.18s"
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      <div style={{ padding: 20 }}>
        {/* DASHBOARD */}
        {tab === "dash" && (
          <div>
            <h2 style={{ fontWeight: 900, fontSize: 22, margin: "0 0 20px" }}>Visão Geral</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {stats.map(s => (
                <Card key={s.label}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontWeight: 900, fontSize: 28, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 13, opacity: 0.6 }}>{s.label}</div>
                </Card>
              ))}
            </div>

            <Card style={{ marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 14 }}>📊 Atividade recente</h3>
              {[
                { msg: "Carlos Silva adicionou nova promoção", time: "2h atrás", icon: "🔥" },
                { msg: "Diego Mendes publicou um story", time: "3h atrás", icon: "📸" },
                { msg: "15 novos agendamentos hoje", time: "4h atrás", icon: "📅" },
                { msg: "João Cliente fez avaliação 5 estrelas", time: "5h atrás", icon: "⭐" },
              ].map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < 3 ? `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` : "none" }}>
                  <span style={{ fontSize: 20 }}>{a.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, margin: 0 }}>{a.msg}</p>
                    <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>{a.time}</p>
                  </div>
                </div>
              ))}
            </Card>

            <Card>
              <h3 style={{ fontWeight: 700, marginBottom: 14 }}>🏆 Top barbeiros</h3>
              {barbers.sort((a, b) => b.clients - a.clients).map((b, i) => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < barbers.length - 1 ? `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` : "none" }}>
                  <span style={{ fontWeight: 900, fontSize: 18, color: primaryColor, width: 24 }}>#{i + 1}</span>
                  <Avatar initials={b.avatar} size={36} color={primaryColor} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{b.name}</p>
                    <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>{b.clients} clientes</p>
                  </div>
                  <Badge color={primaryColor}>⭐ {b.rating}</Badge>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* BARBEIROS */}
        {tab === "barbers" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontWeight: 800, fontSize: 20, margin: 0 }}>✂️ Barbeiros</h2>
              <Btn onClick={() => setShowAddBarber(s => !s)} size="sm">{showAddBarber ? "Cancelar" : "+ Adicionar"}</Btn>
            </div>

            {showAddBarber && (
              <Card style={{ marginBottom: 16 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 14 }}>Novo barbeiro</h3>
                <Input label="Nome completo" value={newBarberName} onChange={setNewBarberName} placeholder="Nome do barbeiro" />
                <Input label="Especialidade" value={newBarberSpec} onChange={setNewBarberSpec} placeholder="Ex: Corte Clássico" />
                <Input label="Email (login)" value={newBarberEmail} onChange={setNewBarberEmail} placeholder="barbeiro@barbearia.com" />
                <div style={{ padding: 12, borderRadius: 12, background: hex2rgba(primaryColor, 0.08), marginBottom: 14, fontSize: 13, opacity: 0.8 }}>
                  💡 O barbeiro terá acesso ao painel gerencial com suas próprias promoções, stories e notificações.
                </div>
                <Btn onClick={addBarber} style={{ width: "100%" }} disabled={!newBarberName}>Adicionar barbeiro</Btn>
              </Card>
            )}

            {barbers.map(b => (
              <Card key={b.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <Avatar initials={b.avatar} size={48} color={primaryColor} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, margin: "0 0 2px" }}>{b.name}</h3>
                        <p style={{ fontSize: 12, opacity: 0.6, margin: "0 0 6px" }}>{b.specialty}</p>
                      </div>
                      <Badge color={primaryColor}>⭐ {b.rating}</Badge>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Badge color="#22c55e">🔥 {b.promotions.filter(p => p.active).length} promos</Badge>
                      <Badge color="#8b5cf6">📸 {b.stories.length} stories</Badge>
                      <Badge color="#3b82f6">👥 {b.clients} clientes</Badge>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                  <Btn onClick={() => removeBarber(b.id)} variant="danger" size="sm">Remover</Btn>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* CUSTOMIZAR */}
        {tab === "customize" && (
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 20 }}>🎨 Customização</h2>

            <Card style={{ marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 14 }}>🖼️ Logo da barbearia</h3>
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 24, borderRadius: 14, border: `2px dashed ${primaryColor}44`, cursor: "pointer" }}>
                <span style={{ fontSize: 40 }}>📁</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Clique para fazer upload da logo</span>
                <span style={{ fontSize: 12, opacity: 0.5 }}>PNG, JPG ou SVG</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
              </label>
            </Card>

            <Card style={{ marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 14 }}>🎨 Cor principal dos botões</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                {["#f59e0b", "#8b5cf6", "#ef4444", "#22c55e", "#3b82f6", "#ec4899", "#14b8a6", "#f97316"].map(c => (
                  <div key={c} onClick={() => setPrimaryColor(c)} style={{ width: 44, height: 44, borderRadius: 12, background: c, cursor: "pointer", border: primaryColor === c ? "3px solid white" : "3px solid transparent", boxShadow: primaryColor === c ? `0 0 0 2px ${c}` : "none", transition: "all 0.15s" }} />
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ width: 44, height: 44, borderRadius: 10, border: "none", cursor: "pointer", padding: 2 }} />
                <span style={{ fontSize: 14, opacity: 0.7 }}>Cor customizada: <strong>{primaryColor}</strong></span>
              </div>
              <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: hex2rgba(primaryColor, 0.1) }}>
                <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>Preview do botão:</p>
                <Btn style={{ marginTop: 8 }}>Agendar agora</Btn>
              </div>
            </Card>

            <Card>
              <h3 style={{ fontWeight: 700, marginBottom: 14 }}>🌗 Tema padrão</h3>
              <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 12 }}>Os usuários podem alternar entre claro e escuro pelo botão no cabeçalho.</p>
              <div style={{ padding: 12, borderRadius: 12, background: hex2rgba(primaryColor, 0.08), fontSize: 13 }}>
                ✅ Botão de alternância de tema disponível no cabeçalho para todos os usuários.
              </div>
            </Card>
          </div>
        )}

        {/* RELATÓRIOS */}
        {tab === "reports" && (
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>📈 Relatórios</h2>

            <Card style={{ marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 14 }}>Receita mensal</h3>
              {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"].map((m, i) => {
                const vals = [12400, 15200, 11800, 17900, 16300, 18100];
                const max = Math.max(...vals);
                const pct = (vals[i] / max) * 100;
                return (
                  <div key={m} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ width: 32, fontSize: 12, opacity: 0.7 }}>{m}</span>
                    <div style={{ flex: 1, height: 10, background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", borderRadius: 99 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: primaryColor, borderRadius: 99, transition: "width 0.5s" }} />
                    </div>
                    <span style={{ width: 60, fontSize: 13, fontWeight: 700, textAlign: "right", color: primaryColor }}>R${(vals[i] / 1000).toFixed(1)}k</span>
                  </div>
                );
              })}
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Ticket médio", value: "R$72", icon: "💳" },
                { label: "Taxa ocupação", value: "87%", icon: "📊" },
                { label: "NPS", value: "94", icon: "😊" },
                { label: "Retorno 30d", value: "68%", icon: "🔄" },
              ].map(s => (
                <Card key={s.label}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontWeight: 900, fontSize: 24, color: primaryColor }}>{s.value}</div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>{s.label}</div>
                </Card>
              ))}
            </div>

            <Card>
              <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Serviços mais populares</h3>
              {[["Corte Masculino", 42], ["Barba", 28], ["Combo", 18], ["Degradê", 12]].map(([s, pct]) => (
                <div key={s} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span>{s}</span><span style={{ fontWeight: 700, color: primaryColor }}>{pct}%</span>
                  </div>
                  <div style={{ height: 8, background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", borderRadius: 99 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: primaryColor, borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function App() {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [view, setView] = useState("home");
  const [barbers, setBarbers] = useState(initialBarbers);
  const [users] = useState(initialUsers);
  const [toastMsg, setToastMsg] = useState(null);

  const currentUser = users.find(u => u.id === currentUserId);
  const currentBarber = currentUser?.role === "barber"
    ? barbers.find(b => b.id === currentUser.barberId)
    : null;

  const showToast = (msg) => setToastMsg(msg);

  const updateBarber = (barberId, updates) => {
    setBarbers(prev => prev.map(b => b.id === barberId ? { ...b, ...updates } : b));
  };

  if (!currentUserId) {
    return (
      <ThemeProvider>
        <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
        <LoginPage onLogin={setCurrentUserId} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } } * { box-sizing: border-box; }`}</style>
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
      <Header currentUser={currentUser} onLogout={() => setCurrentUserId(null)} setView={setView} />

      <main>
        {currentUser.role === "admin" && (
          <AdminPanel
            barbers={barbers}
            onUpdateBarbers={setBarbers}
            toast={showToast}
          />
        )}
        {currentUser.role === "barber" && currentBarber && (
          <BarberPanel
            barber={currentBarber}
            onUpdate={(updates) => updateBarber(currentBarber.id, updates)}
            toast={showToast}
          />
        )}
        {currentUser.role === "client" && (
          <HomeClient barbers={barbers} currentUser={currentUser} />
        )}
      </main>
    </ThemeProvider>
  );
}

export default App;
