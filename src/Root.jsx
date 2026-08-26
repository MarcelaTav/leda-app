import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import AppLeitura from "./AppLeitura";

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Georgia, serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const COR = {
  fundo: "#F6F1E7",
  cartao: "#FFFDF8",
  linha: "#E7DFCC",
  textoPrincipal: "#3E3A31",
  textoSecundario: "#8A8168",
  sauge: "#7C9070",
  saugeEscuro: "#5F7355",
  saugeClaro: "#E7EDDF",
  alerta: "#C0604D",
};

function OlhoSenha({ visivel, onClick }) {
  return (
    <span
      onClick={onClick}
      style={{
        position: "absolute",
        right: "12px",
        top: "50%",
        transform: "translateY(-50%)",
        cursor: "pointer",
        fontSize: "15px",
        userSelect: "none",
        opacity: 0.7,
      }}
    >
      {visivel ? "🙈" : "👁️"}
    </span>
  );
}

function TelaAutenticacao() {
  const [modo, setModo] = useState("entrar"); // entrar | criar | recuperar
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [focoNome, setFocoNome] = useState(false);
  const [focoEmail, setFocoEmail] = useState(false);
  const [focoSenha, setFocoSenha] = useState(false);

  const cartaoRef = useRef(null);
  const alturaOriginalRef = useRef(null); // posição do cartão sem nenhum deslocamento
  const focoAbertoRef = useRef(false); // já tem algum campo focado agora?
  const [deslocamento, setDeslocamento] = useState(0);

  // Quando o teclado abre, a área visível encolhe. O cartão desliza pra cima
  // só o necessário pra caber. Enquanto o teclado estiver aberto, a posição
  // só pode DESCER (se sobrar mais espaço, como quando a barra de sugestão
  // de senha some) — nunca sobe mais do que na primeira medida, mesmo que o
  // iOS encolha um pouco mais a área visível ao trocar de campo. Isso evita
  // tanto o "subir de novo" ao trocar de campo quanto o vão vazio quando o
  // espaço volta. Zera e recalcula do zero quando o teclado fecha de verdade.
  useEffect(() => {
    const vv = window.visualViewport;

    function medir(permiteSubirMais) {
      if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
      const cartao = cartaoRef.current;
      if (!cartao) return;
      if (alturaOriginalRef.current === null) {
        alturaOriginalRef.current = cartao.getBoundingClientRect().bottom;
      }
      const baseFixa = alturaOriginalRef.current;
      const visivel = vv ? vv.height : window.innerHeight;
      const excesso = baseFixa - (visivel - 4);
      const novo = excesso > 0 ? Math.round(excesso) : 0;
      setDeslocamento((atual) => {
        if (atual === novo) return atual;
        if (permiteSubirMais) return novo;
        return novo < atual ? novo : atual; // só desce, nunca sobe mais
      });
    }

    function aoFocar() {
      if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
      const primeiraVez = !focoAbertoRef.current;
      focoAbertoRef.current = true;
      // na primeira vez que o teclado abre, pode medir livremente (pra
      // cima ou pra baixo); depois disso só ajusta pra baixo
      medir(primeiraVez);
      setTimeout(() => medir(primeiraVez), 120);
      setTimeout(() => medir(primeiraVez), 320);
    }

    function aoDesfocar() {
      setTimeout(() => {
        const ativo = document.activeElement;
        const aindaEmCampo = ativo && ativo.matches && ativo.matches("#tela-login input");
        if (!aindaEmCampo) {
          focoAbertoRef.current = false;
          setDeslocamento(0);
        }
      }, 80);
    }

    function aoRedimensionar() {
      if (focoAbertoRef.current) medir(false); // só ajusta pra baixo em mudanças espontâneas
    }

    const campos = document.querySelectorAll("#tela-login input");
    campos.forEach((campo) => {
      campo.addEventListener("focus", aoFocar);
      campo.addEventListener("blur", aoDesfocar);
    });
    if (vv) vv.addEventListener("resize", aoRedimensionar);
    function corrigirRolagem() {
      if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
    }
    window.addEventListener("scroll", corrigirRolagem, { passive: true });

    return () => {
      campos.forEach((campo) => {
        campo.removeEventListener("focus", aoFocar);
        campo.removeEventListener("blur", aoDesfocar);
      });
      if (vv) vv.removeEventListener("resize", aoRedimensionar);
      window.removeEventListener("scroll", corrigirRolagem);
    };
  }, []);

  const estiloInput = (focado) => ({
    width: "100%",
    boxSizing: "border-box",
    fontSize: "16px",
    padding: "10px 13px",
    borderRadius: "11px",
    border: `1.5px solid ${focado ? COR.sauge : "rgba(199, 189, 166, 0.85)"}`,
    fontFamily: SANS,
    background: focado ? "#FFFFFF" : "rgba(253, 251, 246, 0.9)",
    boxShadow: focado
      ? `inset 0 1px 2px rgba(62, 58, 49, 0.05), 0 0 0 3px rgba(124, 144, 112, 0.14)`
      : "inset 0 1px 2px rgba(62, 58, 49, 0.045)",
    outline: "none",
    transition: "border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease",
  });

  function limparMensagens() {
    setErro("");
    setMensagem("");
  }

  async function enviar(e) {
    e.preventDefault();
    limparMensagens();

    if (modo === "recuperar") {
      if (!email.trim()) {
        setErro("Preencha seu e-mail.");
        return;
      }
      setCarregando(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMensagem("Enviamos um link pro seu e-mail pra você redefinir a senha.");
      } catch (err) {
        setErro(err && err.message ? err.message : "Algo deu errado, tenta de novo.");
      } finally {
        setCarregando(false);
      }
      return;
    }

    if (modo === "criar" && !nome.trim()) {
      setErro("Preencha seu nome.");
      return;
    }
    if (!email.trim() || !senha) {
      setErro("Preencha e-mail e senha.");
      return;
    }
    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setCarregando(true);
    try {
      if (modo === "criar") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: { data: { nome: nome.trim() } },
        });
        if (error) throw error;
        setMensagem("Conta criada! Confira seu e-mail pra confirmar antes de entrar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err && err.message ? err.message : "Algo deu errado, tenta de novo.";
      if (msg.includes("Invalid login credentials")) {
        setErro("E-mail ou senha incorretos.");
      } else if (msg.includes("User already registered")) {
        setErro("Já existe uma conta com esse e-mail. Tenta entrar.");
      } else if (msg.includes("Email not confirmed")) {
        setErro("Confirme seu e-mail antes de entrar — confira sua caixa de entrada.");
      } else {
        setErro(msg);
      }
    } finally {
      setCarregando(false);
    }
  }

  const titulo =
    modo === "criar" ? "Criar sua conta" : modo === "recuperar" ? "Recuperar senha" : "Bem-vinda de volta";
  const subtitulo =
    modo === "criar"
      ? "Seu cantinho de leitura, no seu ritmo."
      : modo === "recuperar"
      ? "Informe seu e-mail e enviaremos um link de redefinição."
      : "Entre para continuar sua estante.";

  return (
    <div
      id="tela-login"
      style={{
        fontFamily: SERIF,
        background: `
          radial-gradient(ellipse 65% 42% at 15% -6%, rgba(224, 158, 148, 0.22) 0%, rgba(224, 158, 148, 0) 60%),
          radial-gradient(ellipse 60% 46% at 102% 106%, rgba(124, 144, 112, 0.40) 0%, rgba(124, 144, 112, 0) 62%),
          radial-gradient(ellipse 90% 70% at 50% 40%, #FBF6ED 0%, ${COR.fundo} 70%)
        `,
        minHeight: "100%",
        height: "100%",
        overflow: "hidden",
        overscrollBehavior: "contain",
        color: COR.textoPrincipal,
        display: "flex",
        padding: "20px 30px",
        boxSizing: "border-box",
      }}
    >
      <div
        ref={cartaoRef}
        style={{
          width: "100%",
          maxWidth: "380px",
          margin: "auto",
          transform: deslocamento > 0 ? `translateY(-${deslocamento}px)` : "none",
          transition: "transform 0.25s ease",
          background: "rgba(255, 253, 248, 0.88)",
          backdropFilter: "blur(20px) saturate(1.08)",
          WebkitBackdropFilter: "blur(20px) saturate(1.08)",
          border: `1px solid rgba(231, 223, 204, 0.9)`,
          borderRadius: "24px",
          padding: "30px 26px",
          boxShadow: [
            "inset 0 1px 0 rgba(255, 255, 255, 0.95)",
            "inset 0 0 0 1px rgba(255, 255, 255, 0.45)",
            "0 0 0 1px rgba(124, 144, 112, 0.07)",
            "0 2px 6px rgba(62, 58, 49, 0.05)",
            "0 26px 60px rgba(62, 58, 49, 0.14)",
          ].join(", "),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "50px", height: "50px", borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, #F3ECD9 0%, ${COR.saugeClaro} 75%)`, margin: "0 auto 18px", boxShadow: "0 4px 14px rgba(124, 144, 112, 0.22)" }}>
          <svg viewBox="0 0 48 48" width="26" height="26">
            <circle cx="24" cy="15" r="8.5" fill="#E7A99A" opacity="0.5" />
            <path
              d="M6 17 C6 15 10 13 16 14 C20 14.6 23 16 24 18 C25 16 28 14.6 32 14 C38 13 42 15 42 17 L42 32 C42 30 38 28 32 28.6 C28 29.2 25 30.6 24 32.4 C23 30.6 20 29.2 16 28.6 C10 28 6 30 6 32 Z"
              fill="none"
              stroke={COR.saugeEscuro}
              strokeWidth="1.7"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path d="M24 18 L24 32.4" stroke={COR.saugeEscuro} strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontFamily: SANS, fontSize: "10.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: COR.saugeEscuro, textAlign: "center", marginBottom: "6px" }}>
          <span>Leda</span>
          <svg viewBox="0 0 20 20" width="10" height="10" style={{ opacity: 0.75 }}>
            <path d="M10 2 C11 6 14 7 18 8 C14 9 11 11 10 15 C9 11 6 9 2 8 C6 7 9 6 10 2 Z" fill={COR.sauge} />
          </svg>
        </div>
        <h1 style={{ fontSize: "23px", fontWeight: 700, margin: "0 0 6px", textAlign: "center" }}>
          {titulo}
        </h1>
        <div style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.textoSecundario, textAlign: "center", marginBottom: "18px" }}>
          {subtitulo}
        </div>
        <svg viewBox="0 0 120 14" width="70" height="8" style={{ display: "block", margin: "0 auto 24px" }}>
          <path d="M2 2 C 30 14, 90 14, 118 2" fill="none" stroke={COR.sauge} strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
        </svg>

        <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {modo === "criar" && (
            <div>
              <div style={{ fontFamily: SANS, fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "5px" }}>Nome</div>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onFocus={() => setFocoNome(true)}
                onBlur={() => setFocoNome(false)}
                placeholder="Como podemos te chamar?"
                autoComplete="name"
                style={estiloInput(focoNome)}
              />
            </div>
          )}
          <div>
            <div style={{ fontFamily: SANS, fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "5px" }}>E-mail</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocoEmail(true)}
              onBlur={() => setFocoEmail(false)}
              placeholder="voce@exemplo.com"
              autoComplete="email"
              style={estiloInput(focoEmail)}
            />
          </div>

          {modo !== "recuperar" && (
            <div>
              <div style={{ fontFamily: SANS, fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "5px" }}>Senha</div>
              <div style={{ position: "relative" }}>
                <input
                  type={senhaVisivel ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onFocus={() => setFocoSenha(true)}
                  onBlur={() => setFocoSenha(false)}
                  placeholder="pelo menos 6 caracteres"
                  autoComplete={modo === "criar" ? "new-password" : "current-password"}
                  style={{ ...estiloInput(focoSenha), paddingRight: "38px" }}
                />
                <OlhoSenha visivel={senhaVisivel} onClick={() => setSenhaVisivel((v) => !v)} />
              </div>
            </div>
          )}

          {modo === "entrar" && (
            <div style={{ textAlign: "right", marginTop: "-6px" }}>
              <span
                onClick={() => {
                  setModo("recuperar");
                  limparMensagens();
                }}
                style={{ fontFamily: SANS, fontSize: "12px", color: COR.textoSecundario, textDecoration: "underline", cursor: "pointer" }}
              >
                Esqueci minha senha
              </span>
            </div>
          )}

          {erro && <div style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.alerta }}>{erro}</div>}
          {mensagem && <div style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.saugeEscuro }}>{mensagem}</div>}

          <button
            type="submit"
            disabled={carregando}
            style={{
              fontFamily: SANS,
              fontSize: "13.5px",
              fontWeight: 600,
              letterSpacing: "0.02em",
              padding: "13px",
              boxShadow: carregando ? "none" : "0 6px 16px rgba(124, 144, 112, 0.32)",
              borderRadius: "10px",
              border: "none",
              background: COR.sauge,
              color: "#FFFFFF",
              cursor: carregando ? "default" : "pointer",
              opacity: carregando ? 0.7 : 1,
              marginTop: "4px",
            }}
          >
            {carregando
              ? "Um instante…"
              : modo === "criar"
              ? "Criar conta"
              : modo === "recuperar"
              ? "Enviar link"
              : "Entrar"}
          </button>
        </form>

        <div style={{ height: "1px", background: COR.linha, margin: "22px 0 18px" }} />

        <div style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.textoSecundario, textAlign: "center" }}>
          {modo === "criar" ? (
            <>
              Já tem conta?{" "}
              <span
                onClick={() => {
                  setModo("entrar");
                  limparMensagens();
                }}
                style={{ color: COR.saugeEscuro, textDecoration: "underline", cursor: "pointer" }}
              >
                Entrar
              </span>
            </>
          ) : modo === "recuperar" ? (
            <>
              Lembrou a senha?{" "}
              <span
                onClick={() => {
                  setModo("entrar");
                  limparMensagens();
                }}
                style={{ color: COR.saugeEscuro, textDecoration: "underline", cursor: "pointer" }}
              >
                Entrar
              </span>
            </>
          ) : (
            <>
              Ainda não tem conta?{" "}
              <span
                onClick={() => {
                  setModo("criar");
                  limparMensagens();
                }}
                style={{ color: COR.saugeEscuro, textDecoration: "underline", cursor: "pointer" }}
              >
                Criar conta
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TelaNovaSenha() {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const estiloInput = {
    width: "100%",
    boxSizing: "border-box",
    fontSize: "16px",
    padding: "12px 14px",
    paddingRight: "38px",
    borderRadius: "10px",
    border: `1.5px solid ${COR.linha}`,
    fontFamily: SANS,
    background: "#FDFBF6",
    outline: "none",
  };

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setMensagem("");
    if (novaSenha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }
    setCarregando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
      setMensagem("Senha atualizada! Você já pode continuar usando o app.");
    } catch (err) {
      setErro(err && err.message ? err.message : "Algo deu errado, tenta de novo.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div
      style={{
        fontFamily: SERIF,
        background: `radial-gradient(circle at 50% 0%, #FBF7EC 0%, ${COR.fundo} 60%)`,
        minHeight: "100%",
        height: "100%",
        overflowY: "auto",
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
        color: COR.textoPrincipal,
        display: "flex",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          margin: "auto",
          background: COR.cartao,
          border: `1px solid ${COR.linha}`,
          borderRadius: "22px",
          padding: "36px 28px",
          boxShadow: "0 2px 8px rgba(62, 58, 49, 0.04), 0 12px 32px rgba(62, 58, 49, 0.08)",
        }}
      >
        <h1 style={{ fontSize: "23px", fontWeight: 700, margin: "0 0 6px", textAlign: "center" }}>
          Definir nova senha
        </h1>
        <div style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.textoSecundario, textAlign: "center", marginBottom: "26px" }}>
          Escolha uma nova senha pra sua conta.
        </div>

        <form onSubmit={salvar} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <div style={{ fontFamily: SANS, fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "5px" }}>Nova senha</div>
            <div style={{ position: "relative" }}>
              <input
                type={senhaVisivel ? "text" : "password"}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="pelo menos 6 caracteres"
                autoComplete="new-password"
                style={estiloInput}
              />
              <OlhoSenha visivel={senhaVisivel} onClick={() => setSenhaVisivel((v) => !v)} />
            </div>
          </div>
          <div>
            <div style={{ fontFamily: SANS, fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "5px" }}>Confirmar senha</div>
            <div style={{ position: "relative" }}>
              <input
                type={senhaVisivel ? "text" : "password"}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                placeholder="repita a nova senha"
                autoComplete="new-password"
                style={estiloInput}
              />
            </div>
          </div>

          {erro && <div style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.alerta }}>{erro}</div>}
          {mensagem && <div style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.saugeEscuro }}>{mensagem}</div>}

          <button
            type="submit"
            disabled={carregando}
            style={{
              fontFamily: SANS,
              fontSize: "13.5px",
              fontWeight: 600,
              letterSpacing: "0.02em",
              padding: "13px",
              boxShadow: carregando ? "none" : "0 6px 16px rgba(124, 144, 112, 0.32)",
              borderRadius: "10px",
              border: "none",
              background: COR.sauge,
              color: "#FFFFFF",
              cursor: carregando ? "default" : "pointer",
              opacity: carregando ? 0.7 : 1,
              marginTop: "4px",
            }}
          >
            {carregando ? "Um instante…" : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Root() {
  const [sessao, setSessao] = useState(undefined); // undefined = ainda carregando
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((evento, novaSessao) => {
      if (evento === "PASSWORD_RECOVERY") {
        setRecuperandoSenha(true);
      }
      setSessao(novaSessao);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (sessao === undefined) {
    return (
      <div style={{ fontFamily: SANS, background: COR.fundo, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: COR.textoSecundario, fontSize: "13px" }}>
        Carregando…
      </div>
    );
  }

  if (recuperandoSenha) {
    return <TelaNovaSenha />;
  }

  if (!sessao) {
    return <TelaAutenticacao />;
  }

  return (
    <AppLeitura
      userId={sessao.user.id}
      userEmail={sessao.user.email}
      userName={sessao.user.user_metadata?.nome || ""}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}
