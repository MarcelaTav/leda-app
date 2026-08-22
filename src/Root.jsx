import React, { useState, useEffect } from "react";
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

  const estiloInput = (focado) => ({
    width: "100%",
    boxSizing: "border-box",
    fontSize: "16px",
    padding: "12px 14px",
    borderRadius: "10px",
    border: `1.5px solid ${focado ? COR.sauge : COR.linha}`,
    fontFamily: SANS,
    background: focado ? "#FFFFFF" : "#FDFBF6",
    outline: "none",
    transition: "border-color 0.15s ease, background 0.15s ease",
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
      style={{
        fontFamily: SERIF,
        background: `
          radial-gradient(ellipse 70% 45% at 18% -8%, rgba(224, 158, 148, 0.30) 0%, rgba(224, 158, 148, 0) 60%),
          radial-gradient(ellipse 65% 50% at 100% 105%, rgba(124, 144, 112, 0.22) 0%, rgba(124, 144, 112, 0) 60%),
          radial-gradient(ellipse 90% 70% at 50% 40%, #FBF6ED 0%, ${COR.fundo} 70%)
        `,
        minHeight: "100dvh",
        color: COR.textoPrincipal,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          background: COR.cartao,
          border: `1px solid ${COR.linha}`,
          borderRadius: "22px",
          padding: "36px 28px",
          boxShadow: "0 2px 8px rgba(62, 58, 49, 0.05), 0 20px 48px rgba(62, 58, 49, 0.10)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "44px", height: "44px", borderRadius: "50%", background: COR.saugeClaro, margin: "0 auto 16px", fontSize: "18px" }}>
          📚
        </div>
        <div style={{ fontFamily: SANS, fontSize: "10.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: COR.saugeEscuro, textAlign: "center", marginBottom: "6px" }}>
          Leda
        </div>
        <h1 style={{ fontSize: "23px", fontWeight: 700, margin: "0 0 6px", textAlign: "center" }}>
          {titulo}
        </h1>
        <div style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.textoSecundario, textAlign: "center", marginBottom: "26px" }}>
          {subtitulo}
        </div>

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
        minHeight: "100dvh",
        color: COR.textoPrincipal,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
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
      <div style={{ fontFamily: SANS, background: COR.fundo, minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", color: COR.textoSecundario, fontSize: "13px" }}>
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
