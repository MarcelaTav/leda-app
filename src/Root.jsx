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
    padding: "9px 13px",
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
          radial-gradient(ellipse 78% 40% at 50% 108%, rgba(95, 115, 85, 0.62) 0%, rgba(95, 115, 85, 0.16) 45%, rgba(124, 144, 112, 0) 72%),
          radial-gradient(ellipse 62% 40% at 12% -8%, rgba(224, 158, 148, 0.50) 0%, rgba(224, 158, 148, 0) 60%),
          radial-gradient(ellipse 55% 38% at 100% 18%, rgba(124, 144, 112, 0.34) 0%, rgba(124, 144, 112, 0) 62%),
          radial-gradient(ellipse 92% 74% at 50% 42%, #FCF8F0 0%, ${COR.fundo} 72%)
        `,
        minHeight: "100%",
        height: "100%",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
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
          background: "rgba(255, 253, 248, 0.90)",
          backdropFilter: "blur(20px) saturate(1.15)",
          WebkitBackdropFilter: "blur(20px) saturate(1.15)",
          border: `1px solid rgba(124, 144, 112, 0.26)`,
          borderRadius: "26px",
          padding: "30px 26px",
          boxShadow: "0 1px 2px rgba(62, 58, 49, 0.04), 0 10px 24px rgba(62, 58, 49, 0.09), 0 30px 64px rgba(95, 115, 85, 0.20)",
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
              
