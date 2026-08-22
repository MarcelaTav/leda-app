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

function TelaAutenticacao() {
  const [modo, setModo] = useState("entrar"); // entrar | criar
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function enviar(e) {
    e.preventDefault();
    setErro("");
    setMensagem("");
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
        const { error } = await supabase.auth.signUp({ email: email.trim(), password: senha });
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

  return (
    <div
      style={{
        fontFamily: SERIF,
        background: COR.fundo,
        minHeight: "100vh",
        color: COR.textoPrincipal,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          background: COR.cartao,
          border: `1px solid ${COR.linha}`,
          borderRadius: "18px",
          padding: "28px 24px",
        }}
      >
        <div style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: COR.saugeEscuro, marginBottom: "4px" }}>
          📚 LEDA
        </div>
        <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 20px" }}>
          {modo === "criar" ? "Criar sua conta" : "Entrar"}
        </h1>

        <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <div style={{ fontFamily: SANS, fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "4px" }}>E-mail</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              autoComplete="email"
              style={{ width: "100%", boxSizing: "border-box", fontSize: "14px", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${COR.linha}`, fontFamily: SANS }}
            />
          </div>
          <div>
            <div style={{ fontFamily: SANS, fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "4px" }}>Senha</div>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="pelo menos 6 caracteres"
              autoComplete={modo === "criar" ? "new-password" : "current-password"}
              style={{ width: "100%", boxSizing: "border-box", fontSize: "14px", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${COR.linha}`, fontFamily: SANS }}
            />
          </div>

          {erro && <div style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.alerta }}>{erro}</div>}
          {mensagem && <div style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.saugeEscuro }}>{mensagem}</div>}

          <button
            type="submit"
            disabled={carregando}
            style={{
              fontFamily: SANS,
              fontSize: "14px",
              fontWeight: 600,
              padding: "11px",
              borderRadius: "10px",
              border: "none",
              background: COR.sauge,
              color: "#FFFFFF",
              cursor: carregando ? "default" : "pointer",
              opacity: carregando ? 0.7 : 1,
              marginTop: "4px",
            }}
          >
            {carregando ? "Um instante…" : modo === "criar" ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <div style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.textoSecundario, marginTop: "18px", textAlign: "center" }}>
          {modo === "criar" ? (
            <>
              Já tem conta?{" "}
              <span
                onClick={() => {
                  setModo("entrar");
                  setErro("");
                  setMensagem("");
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
                  setErro("");
                  setMensagem("");
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

export default function Root() {
  const [sessao, setSessao] = useState(undefined); // undefined = ainda carregando

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (sessao === undefined) {
    return (
      <div style={{ fontFamily: SANS, background: COR.fundo, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: COR.textoSecundario, fontSize: "13px" }}>
        Carregando…
      </div>
    );
  }

  if (!sessao) {
    return <TelaAutenticacao />;
  }

  return (
    <AppLeitura
      userId={sessao.user.id}
      userEmail={sessao.user.email}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}
