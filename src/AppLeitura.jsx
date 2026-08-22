import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabaseClient";

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Georgia, serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// paleta "cantinho de leitura": sálvia suave + creme quente + mel
const COR = {
  fundo: "#F6F1E7",
  cartao: "#FFFDF8",
  linha: "#E7DFCC",
  textoPrincipal: "#3E3A31",
  textoSecundario: "#8A8168",
  sauge: "#7C9070",
  saugeEscuro: "#5F7355",
  saugeClaro: "#E7EDDF",
  mel: "#D9A855",
  melEscuro: "#8A6423",
  melClaro: "#F6E7C9",
  alerta: "#B4694F",
  // acento próprio do módulo Escritos — distinto do sálvia (Estante) e do mel (Resenhas)
  ameixa: "#7D5470",
  ameixaEscuro: "#5C3D51",
  ameixaClaro: "#EFE4EC",
};

const STATUSES = [
  { key: "quero_ler", label: "Quero ler" },
  { key: "lendo", label: "Lendo" },
  { key: "lido", label: "Lido" },
  { key: "pausado", label: "Pausado" },
];

const FORMATOS = [
  { key: "fisico", label: "Físico", icone: "📕" },
  { key: "ebook", label: "E-book", icone: "📱" },
  { key: "pdf", label: "PDF", icone: "🗎" },
  { key: "kindle", label: "Kindle", icone: "🔖" },
  { key: "audiobook", label: "Audiobook", icone: "🎧" },
];

const CORES_STATUS = {
  quero_ler: { fundo: "#F6E7C9", texto: "#7A5A24" },
  lendo: { fundo: "#E7EDDF", texto: "#4A5F41" },
  lido: { fundo: "#DCEAEA", texto: "#2E5C5C" },
  pausado: { fundo: "#EFE1E6", texto: "#7A4356" },
};

const GENEROS = [
  "Romance",
  "Fantasia",
  "Ficção científica",
  "Suspense",
  "Terror",
  "Biografia",
  "Autoajuda",
  "História",
  "Poesia",
  "Infantil/Juvenil",
  "Quadrinhos/HQ",
  "Não-ficção",
  "Clássico",
  "Espiritualidade",
];

const LIVROS_KEY = "estante:livros";
const RESENHAS_KEY = "resenhas:lista";
const OBRAS_KEY = "escritos:obras";
const MARCADORES_KEY = "estante:marcadores";
const MARCADORES_ESCRITOS_KEY = "escritos:marcadores";
const COR_ESCRITOS_KEY = "escritos:cor_personalizada";
const DOACOES_KEY = "estante:doacoes";
const DOACAO_PREF_KEY = "estante:doacao_pref";

const PALETA_PERSONALIZACAO = [
  "#7D5470", // ameixa (padrão)
  "#4A7C82", // azul-petróleo
  "#B5652E", // terracota
  "#5C7A9E", // azul-acinzentado
  "#7C9070", // sálvia
  "#B4694F", // tijolo
  "#8A6D3B", // caramelo
  "#6B5B95", // lavanda escura
  "#C0637F", // rosa queimado
  "#D48DA8", // rosa suave
];

const CORES_MARCADOR = [
  "#B5652E", // terracota
  "#7C9070", // sálvia
  "#D9A855", // mel
  "#7D5470", // ameixa
  "#4A7C82", // azul-petróleo
  "#B4694F", // tijolo
  "#5C7A9E", // azul-acinzentado
  "#8A6D3B", // caramelo
  "#C0637F", // rosa queimado
  "#D48DA8", // rosa suave
  "#A63D3D", // vermelho
];

// cor própria da tela "Adicionar livro" — terracota quente, distinta do
// sálvia da Estante e do mel/ameixa das outras abas, mas dentro da mesma paleta
const COR_NOVO_LIVRO = "#D98368";

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// clareia/escurece uma cor hex misturando com branco/preto — usado pra gerar
// as variantes clara/escura de uma cor que a pessoa escolhe pra personalizar
function misturarHex(hex, alvo, quantidade) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const mix = (c) => Math.round(c + (alvo - c) * quantidade);
  const paraHex = (c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0");
  return `#${paraHex(mix(r))}${paraHex(mix(g))}${paraHex(mix(b))}`;
}
function clarear(hex, quantidade = 0.85) {
  return misturarHex(hex, 255, quantidade);
}
function escurecer(hex, quantidade = 0.35) {
  return misturarHex(hex, 0, quantidade);
}

function normalizar(texto) {
  return (texto || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatarData(iso) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch (e) {
    return "";
  }
}

// ---------- helpers puros de meta de leitura (fáceis de testar isolados) ----------

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function diasEntre(dataInicioISO, dataFimISO) {
  const a = new Date(dataInicioISO + "T00:00:00");
  const b = new Date(dataFimISO + "T00:00:00");
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function somarDias(dataISO, n) {
  const d = new Date(dataISO + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatarDataCurta(dataISO) {
  try {
    return new Date(dataISO + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch (e) {
    return dataISO;
  }
}

// calcula o estado atual da leitura de um livro a partir dos check-ins —
// função pura, sem efeitos colaterais, fácil de testar isolada
function calcularProgresso(livro) {
  const checkins = livro.checkins || {};
  const datas = Object.keys(checkins).sort();
  if (datas.length === 0 || !livro.paginasTotais) {
    return { temDados: false };
  }
  const primeiraData = datas[0];
  const ultimaData = datas[datas.length - 1];
  const paginaAtual = checkins[ultimaData].pagina;
  const paginaInicial = checkins[primeiraData].pagina;
  const hoje = hojeISO();
  const diasDecorridos = Math.max(1, diasEntre(primeiraData, hoje));
  const ritmoMedio = (paginaAtual - paginaInicial) / diasDecorridos;
  const paginasRestantes = Math.max(0, livro.paginasTotais - paginaAtual);
  const percent = Math.min(100, Math.round((paginaAtual / livro.paginasTotais) * 100));

  let diasRestantes = null;
  let dataPrevista = null;
  if (ritmoMedio > 0 && paginasRestantes > 0) {
    diasRestantes = Math.ceil(paginasRestantes / ritmoMedio);
    dataPrevista = somarDias(hoje, diasRestantes);
  }

  return {
    temDados: true,
    paginaAtual,
    percent,
    ritmoMedio,
    diasRestantes,
    dataPrevista,
    primeiraData,
    concluido: paginaAtual >= livro.paginasTotais,
  };
}

// gera a série de dias pro gráfico (progresso real x meta ideal), dentro
// de um período (7 dias / 30 dias / desde o início)
function gerarSerieProgresso(livro, periodo) {
  const checkins = livro.checkins || {};
  const datas = Object.keys(checkins).sort();
  if (datas.length === 0) return [];
  const primeiraData = datas[0];
  const hoje = hojeISO();
  const totalDias = Math.max(1, diasEntre(primeiraData, hoje));

  let dataInicio = primeiraData;
  if (periodo === "7") dataInicio = somarDias(hoje, -6);
  else if (periodo === "30") dataInicio = somarDias(hoje, -29);
  if (diasEntre(primeiraData, dataInicio) < 0) dataInicio = primeiraData;

  const qtdDias = Math.max(1, diasEntre(dataInicio, hoje) + 1);
  const metaDiaria = livro.metaDiaria || 0;

  let ultimaPaginaConhecida = 0;
  // acha a última página conhecida antes do início da janela, pra não começar do zero
  datas.forEach((d) => {
    if (d < dataInicio) ultimaPaginaConhecida = checkins[d].pagina;
  });

  const serie = [];
  for (let i = 0; i < qtdDias; i++) {
    const dataISO = somarDias(dataInicio, i);
    if (checkins[dataISO]) ultimaPaginaConhecida = checkins[dataISO].pagina;
    const diasDesdeInicioLivro = diasEntre(primeiraData, dataISO) + 1;
    const metaIdeal = livro.paginasTotais ? Math.min(livro.paginasTotais, Math.round(metaDiaria * diasDesdeInicioLivro)) : 0;
    serie.push({
      dataISO,
      real: ultimaPaginaConhecida,
      meta: Math.max(0, metaIdeal),
      temRegistro: Boolean(checkins[dataISO]),
    });
  }
  return serie;
}

function formatoDe(key) {
  return FORMATOS.find((f) => f.key === key) || FORMATOS[0];
}

// ---------- helpers puros de meta de doação (testados isolados antes da interface) ----------

function anoDe(dataISO) {
  return parseInt(dataISO.slice(0, 4), 10);
}

// calcula a meta de doação de um ano específico, considerando toda a
// história desde o ano em que a pessoa entrou na meta — dobra a cada ano
// não cumprido, volta pra 1 assim que cumprir de novo
function calcularMetaAno(anoAlvo, anoInicio, doacoesPorAno) {
  if (!anoInicio || anoAlvo < anoInicio) return null;
  let meta = 1;
  for (let ano = anoInicio; ano < anoAlvo; ano++) {
    const total = doacoesPorAno[ano] || 0;
    meta = total >= meta ? 1 : meta * 2;
  }
  return meta;
}

function agruparDoacoesPorAno(doacoes) {
  const c = {};
  doacoes.forEach((d) => {
    const ano = anoDe(d.data);
    c[ano] = (c[ano] || 0) + (d.quantidade || 1);
  });
  return c;
}

function Estrelas({ valor, tamanho = 15 }) {
  const estrelas = [0, 1, 2, 3, 4].map((i) => {
    const preench = Math.max(0, Math.min(1, valor - i)) * 100;
    return (
      <span
        key={i}
        style={{ position: "relative", display: "inline-block", fontSize: tamanho, lineHeight: 1, width: tamanho }}
      >
        <span style={{ color: COR.linha }}>★</span>
        <span
          style={{ position: "absolute", left: 0, top: 0, overflow: "hidden", width: `${preench}%`, color: COR.mel }}
        >
          ★
        </span>
      </span>
    );
  });
  return <span style={{ display: "inline-flex", gap: "1px" }}>{estrelas}</span>;
}

// ------- hook genérico de persistência: estado na tela sempre imediato,
// uma única tentativa de salvar em segundo plano, sem laço automático.
// Guarda tudo numa tabela só do Supabase (app_dados), uma linha por
// usuário+chave — exatamente a mesma ideia do "window.storage" de antes,
// só que agora protegido por login de verdade e visível só pro dono. -------
function usarListaPersistida(chave, userId) {
  const [dados, setDados] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [statusSalvamento, setStatusSalvamento] = useState("ok"); // ok | pendente
  const dadosRef = useRef(dados);
  dadosRef.current = dados;
  const pendenteRef = useRef(null);
  const sincronizandoRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    let cancelado = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("app_dados")
          .select("valor")
          .eq("user_id", userId)
          .eq("chave", chave)
          .maybeSingle();
        if (error) throw error;
        if (!cancelado && data && Array.isArray(data.valor)) {
          setDados(data.valor);
        }
      } catch (e) {
        // primeira vez usando o app: a chave ainda não existe, é normal
      } finally {
        if (!cancelado) setLoaded(true);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [chave, userId]);

  async function garantirSincronizacao() {
    if (sincronizandoRef.current) return;
    if (pendenteRef.current === null) return;
    if (!userId) return;
    sincronizandoRef.current = true;
    const alvo = pendenteRef.current;
    try {
      const { error } = await supabase
        .from("app_dados")
        .upsert({ user_id: userId, chave, valor: alvo, atualizado_em: new Date().toISOString() }, { onConflict: "user_id,chave" });
      if (!error && pendenteRef.current === alvo) {
        pendenteRef.current = null;
        setStatusSalvamento("ok");
      } else if (error) {
        throw error;
      }
    } catch (e) {
      console.error(`Falha ao salvar ${chave}:`, e);
      setStatusSalvamento("pendente");
    } finally {
      sincronizandoRef.current = false;
    }
  }

  function salvar(novaLista) {
    setDados(novaLista);
    pendenteRef.current = novaLista;
    garantirSincronizacao();
  }

  return { dados, dadosRef, loaded, statusSalvamento, salvar };
}

// mesma ideia do hook acima, mas pra um valor único (não uma lista) — usa um
// booleano à parte pra saber se há algo pendente, já que o próprio valor pode
// legitimamente ser null (ex: "sem cor personalizada")
function usarValorPersistido(chave, valorInicial, userId) {
  const [valor, setValor] = useState(valorInicial);
  const [loaded, setLoaded] = useState(false);
  const [statusSalvamento, setStatusSalvamento] = useState("ok");
  const pendenteRef = useRef(false);
  const valorPendenteRef = useRef(valorInicial);
  const sincronizandoRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    let cancelado = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("app_dados")
          .select("valor")
          .eq("user_id", userId)
          .eq("chave", chave)
          .maybeSingle();
        if (error) throw error;
        if (!cancelado && data && data.valor !== undefined) {
          setValor(data.valor);
        }
      } catch (e) {
        // primeira vez usando: a chave ainda não existe, é normal
      } finally {
        if (!cancelado) setLoaded(true);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [chave, userId]);

  async function garantirSincronizacao() {
    if (sincronizandoRef.current) return;
    if (!pendenteRef.current) return;
    if (!userId) return;
    sincronizandoRef.current = true;
    const alvo = valorPendenteRef.current;
    try {
      const { error } = await supabase
        .from("app_dados")
        .upsert({ user_id: userId, chave, valor: alvo, atualizado_em: new Date().toISOString() }, { onConflict: "user_id,chave" });
      if (!error) {
        pendenteRef.current = false;
        setStatusSalvamento("ok");
      } else {
        throw error;
      }
    } catch (e) {
      console.error(`Falha ao salvar ${chave}:`, e);
      setStatusSalvamento("pendente");
    } finally {
      sincronizandoRef.current = false;
    }
  }

  function salvar(novoValor) {
    setValor(novoValor);
    valorPendenteRef.current = novoValor;
    pendenteRef.current = true;
    garantirSincronizacao();
  }

  return { valor, loaded, statusSalvamento, salvar };
}

function AppLeitura({ userId, userEmail, onSignOut }) {
  const [aba, setAba] = useState("estante");
  const [buscaResenhaPedida, setBuscaResenhaPedida] = useState(null); // { texto, ts }

  const estanteState = usarListaPersistida(LIVROS_KEY, userId);
  const resenhasState = usarListaPersistida(RESENHAS_KEY, userId);
  const escritosState = usarListaPersistida(OBRAS_KEY, userId);
  const marcadoresState = usarListaPersistida(MARCADORES_KEY, userId);
  const marcadoresEscritosState = usarListaPersistida(MARCADORES_ESCRITOS_KEY, userId);
  const corEscritosState = usarValorPersistido(COR_ESCRITOS_KEY, null, userId);
  const corEscritosAtiva = corEscritosState.valor || COR.ameixa;
  const doacoesState = usarListaPersistida(DOACOES_KEY, userId);
  const doacaoPrefState = usarValorPersistido(DOACAO_PREF_KEY, { participando: false, anoInicio: null, publico: false }, userId);

  // migração única: os marcadores de Escritos nasceram compartilhando a mesma
  // lista da Estante. Na primeira vez que os dois carregam, se Escritos ainda
  // está vazio e a Estante já tem marcadores, copiamos pra Escritos como
  // ponto de partida — a partir daí os dois evoluem de forma independente
  const migracaoMarcadoresFeitaRef = useRef(false);
  useEffect(() => {
    if (migracaoMarcadoresFeitaRef.current) return;
    if (!marcadoresState.loaded || !marcadoresEscritosState.loaded) return;
    migracaoMarcadoresFeitaRef.current = true;
    if (marcadoresEscritosState.dados.length === 0 && marcadoresState.dados.length > 0) {
      marcadoresEscritosState.salvar(marcadoresState.dados.map((m) => ({ ...m, id: uid() })));
    }
  }, [marcadoresState.loaded, marcadoresEscritosState.loaded]);

  const pendente =
    estanteState.statusSalvamento === "pendente" ||
    resenhasState.statusSalvamento === "pendente" ||
    escritosState.statusSalvamento === "pendente" ||
    marcadoresState.statusSalvamento === "pendente" ||
    marcadoresEscritosState.statusSalvamento === "pendente" ||
    doacoesState.statusSalvamento === "pendente";

  function irParaResenhasDoLivro(titulo) {
    setBuscaResenhaPedida({ texto: titulo, ts: Date.now() });
    setAba("resenhas");
  }

  function trocarAba(novaAba) {
    if (novaAba !== "resenhas") setBuscaResenhaPedida(null); // limpa o filtro pedido antes
    setAba(novaAba);
  }

  return (
    <div
      style={{
        fontFamily: SERIF,
        background: COR.fundo,
        height: "100dvh",
        color: COR.textoPrincipal,
        maxWidth: "480px",
        margin: "0 auto",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 16px",
          fontFamily: SANS,
          fontSize: "10.5px",
          color: COR.textoSecundario,
          background: COR.fundo,
          borderBottom: `1px solid ${COR.linha}`,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{userEmail}</span>
        <span onClick={onSignOut} style={{ cursor: "pointer", textDecoration: "underline", flexShrink: 0 }}>
          Sair
        </span>
      </div>
      <div style={{ flex: 1, overflow: "hidden", position: "relative", background: aba === "escritos" ? clarear(corEscritosAtiva, 0.92) : "transparent" }}>
        {aba === "estante" ? (
          <TelaEstante estado={estanteState} pendente={pendente} resenhas={resenhasState.dados} onVerResenhas={irParaResenhasDoLivro} marcadoresState={marcadoresState} />
        ) : aba === "resenhas" ? (
          <TelaResenhas estado={resenhasState} livros={estanteState.dados} pendente={pendente} buscaPedida={buscaResenhaPedida} />
        ) : aba === "escritos" ? (
          <TelaEscritos estado={escritosState} pendente={pendente} corPersonalizada={corEscritosState.valor} onMudarCor={corEscritosState.salvar} marcadoresState={marcadoresEscritosState} />
        ) : (
          <TelaSementes doacoesState={doacoesState} doacaoPrefState={doacaoPrefState} livros={estanteState.dados} pendente={pendente} />
        )}
      </div>

      {/* navegação por abas — fica FORA da área que rola, por isso nunca desce com a lista.
          zIndex alto de propósito: garante que a barra nunca fica bloqueada por
          um modal aberto em qualquer aba, permitindo trocar de aba a qualquer momento */}
      <div
        style={{
          display: "flex",
          borderTop: `1px solid ${COR.linha}`,
          background: COR.cartao,
          fontFamily: SANS,
          flexShrink: 0,
          position: "relative",
          zIndex: 2000,
        }}
      >
        <button
          onClick={() => trocarAba("estante")}
          style={{
            flex: 1,
            padding: "12px 8px 14px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: aba === "estante" ? COR.saugeEscuro : COR.textoSecundario,
            fontWeight: aba === "estante" ? 700 : 500,
          }}
        >
          <div style={{ fontSize: "17px", marginBottom: "2px" }}>📚</div>
          <div style={{ fontSize: "11.5px" }}>Estante</div>
        </button>
        <button
          onClick={() => trocarAba("resenhas")}
          style={{
            flex: 1,
            padding: "12px 8px 14px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: aba === "resenhas" ? COR.melEscuro : COR.textoSecundario,
            fontWeight: aba === "resenhas" ? 700 : 500,
          }}
        >
          <div style={{ fontSize: "17px", marginBottom: "2px" }}>✍️</div>
          <div style={{ fontSize: "11.5px" }}>Resenhas</div>
        </button>
        <button
          onClick={() => trocarAba("escritos")}
          style={{
            flex: 1,
            padding: "12px 8px 14px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: aba === "escritos" ? escurecer(corEscritosAtiva, 0.25) : COR.textoSecundario,
            fontWeight: aba === "escritos" ? 700 : 500,
          }}
        >
          <div style={{ fontSize: "17px", marginBottom: "2px" }}>🖋️</div>
          <div style={{ fontSize: "11.5px" }}>Escritos</div>
        </button>
        <button
          onClick={() => trocarAba("sementes")}
          style={{
            flex: 1,
            padding: "12px 8px 14px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: aba === "sementes" ? COR.saugeEscuro : COR.textoSecundario,
            fontWeight: aba === "sementes" ? 700 : 500,
          }}
        >
          <div style={{ fontSize: "17px", marginBottom: "2px" }}>🌱</div>
          <div style={{ fontSize: "11.5px" }}>Sementes</div>
        </button>
      </div>
    </div>
  );
}

// ======================= ABA 1: ESTANTE (privado) =======================

// pequena barra horizontal reutilizável pro Painel — mostra um rótulo, uma
// barra colorida proporcional e a contagem, tudo no mesmo estilo do app
function BarraContagem({ rotulo, valor, maximo, cor, corFundo }) {
  const largura = maximo > 0 ? Math.max(4, Math.round((valor / maximo) * 100)) : 0;
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: SANS, fontSize: "12.5px", color: COR.textoPrincipal, marginBottom: "4px" }}>
        <span>{rotulo}</span>
        <span style={{ color: COR.textoSecundario }}>{valor}</span>
      </div>
      <div style={{ height: "8px", borderRadius: "6px", background: corFundo, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${largura}%`, borderRadius: "6px", background: cor }} />
      </div>
    </div>
  );
}

function TelaSementes({ doacoesState, doacaoPrefState, livros, pendente }) {
  const { dados: sementes, dadosRef: sementesRef, salvar: salvarSementes } = doacoesState;
  const { valor: pref, salvar: salvarPref } = doacaoPrefState;

  const [modo, setModo] = useState("lista"); // "lista" | "leitura" | "form"
  const [registroSelecionadoId, setRegistroSelecionadoId] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [quantidade, setQuantidade] = useState("1");
  const [titulo, setTitulo] = useState("");
  const [tituloForaDaEstante, setTituloForaDaEstante] = useState(false);
  const [genero, setGenero] = useState("");
  const [generoCustom, setGeneroCustom] = useState("");
  const [anotacao, setAnotacao] = useState("");
  const [erro, setErro] = useState("");
  const [confirmandoRemocaoId, setConfirmandoRemocaoId] = useState(null);

  const totalCompartilhado = useMemo(() => sementes.reduce((acc, d) => acc + (d.quantidade || 1), 0), [sementes]);

  const registroSelecionado = sementes.find((d) => d.id === registroSelecionadoId);

  function limparForm() {
    setEditandoId(null);
    setQuantidade("1");
    setTitulo("");
    setTituloForaDaEstante(false);
    setGenero("");
    setGeneroCustom("");
    setAnotacao("");
    setErro("");
    setModo("lista");
  }

  function abrirNovoRegistro() {
    setEditandoId(null);
    setQuantidade("1");
    setTitulo("");
    setTituloForaDaEstante(false);
    setGenero("");
    setGeneroCustom("");
    setAnotacao("");
    setErro("");
    setModo("form");
  }

  function abrirEdicaoRegistro(item) {
    setEditandoId(item.id);
    setQuantidade(String(item.quantidade || 1));
    const estaNaEstante = livros.some((l) => l.titulo === item.titulo);
    setTitulo(item.titulo);
    setTituloForaDaEstante(!estaNaEstante);
    if (item.genero && GENEROS.includes(item.genero)) {
      setGenero(item.genero);
      setGeneroCustom("");
    } else if (item.genero) {
      setGenero("Outro");
      setGeneroCustom(item.genero);
    } else {
      setGenero("");
      setGeneroCustom("");
    }
    setAnotacao(item.anotacao || "");
    setErro("");
    setConfirmandoRemocaoId(null);
    setModo("form");
  }

  function abrirLeituraRegistro(item) {
    setRegistroSelecionadoId(item.id);
    setConfirmandoRemocaoId(null);
    setModo("leitura");
  }

  function fecharLeitura() {
    setRegistroSelecionadoId(null);
    setConfirmandoRemocaoId(null);
    setModo("lista");
  }

  function salvarRegistro(e) {
    e.preventDefault();
    const qtd = parseInt(quantidade, 10);
    if (!qtd || qtd <= 0) {
      setErro("Digite uma quantidade válida.");
      return;
    }
    if (!titulo.trim()) {
      setErro("Digite ao menos o título de um dos livros.");
      return;
    }
    const generoFinal = genero === "Outro" ? generoCustom.trim() : genero;
    if (editandoId) {
      salvarSementes(
        sementesRef.current.map((d) =>
          d.id === editandoId ? { ...d, quantidade: qtd, titulo: titulo.trim(), genero: generoFinal, anotacao: anotacao.trim() } : d
        )
      );
    } else {
      const novo = {
        id: uid(),
        quantidade: qtd,
        titulo: titulo.trim(),
        genero: generoFinal,
        anotacao: anotacao.trim(),
        data: hojeISO(),
        criadoEm: new Date().toISOString(),
      };
      salvarSementes([novo, ...sementesRef.current]);
    }
    limparForm();
  }

  function removerRegistro(id) {
    salvarSementes(sementesRef.current.filter((d) => d.id !== id));
    setConfirmandoRemocaoId(null);
    if (modo === "leitura") fecharLeitura();
  }

  // ---------- tela: leitura de um registro ----------
  if (modo === "leitura" && registroSelecionado) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ flexShrink: 0, padding: "20px 20px 14px", borderBottom: `1px solid ${COR.linha}` }}>
          <button
            onClick={fecharLeitura}
            style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.saugeEscuro, background: "transparent", border: "none", padding: 0, marginBottom: "10px", cursor: "pointer" }}
          >
            ← Sementes
          </button>
          <div style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: COR.saugeEscuro, fontWeight: 700 }}>
            🌱 Esse registro
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ padding: "16px 20px 20px" }}>
            <div style={{ fontFamily: SERIF, fontSize: "19px", fontWeight: 700, color: COR.textoPrincipal, marginBottom: "6px" }}>
              {registroSelecionado.quantidade > 1 ? `${registroSelecionado.quantidade}× ` : ""}
              {registroSelecionado.titulo}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
              {registroSelecionado.genero && (
                <span style={{ fontFamily: SANS, fontSize: "10.5px", padding: "3px 10px", borderRadius: "20px", background: COR.saugeClaro, color: COR.saugeEscuro }}>
                  {registroSelecionado.genero}
                </span>
              )}
              <span style={{ fontFamily: SANS, fontSize: "10.5px", padding: "3px 10px", borderRadius: "20px", background: COR.saugeClaro, color: COR.saugeEscuro }}>
                {formatarDataCurta(registroSelecionado.data)}
              </span>
            </div>

            {registroSelecionado.anotacao ? (
              <div style={{ fontFamily: SANS, fontSize: "14px", color: COR.textoPrincipal, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                {registroSelecionado.anotacao}
              </div>
            ) : (
              <div style={{ fontFamily: SANS, fontSize: "13px", color: COR.textoSecundario, fontStyle: "italic" }}>Sem anotação nesse registro.</div>
            )}
          </div>
        </div>

        <div style={{ flexShrink: 0, padding: "12px 20px", borderTop: `1px solid ${COR.linha}`, background: COR.fundo }}>
          {!confirmandoRemocaoId ? (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setConfirmandoRemocaoId(registroSelecionado.id)}
                style={{ fontSize: "12.5px", padding: "10px 12px", borderRadius: "20px", border: `1px solid ${COR.alerta}`, background: "transparent", color: COR.alerta, cursor: "pointer" }}
              >
                Excluir
              </button>
              <button
                onClick={() => abrirEdicaoRegistro(registroSelecionado)}
                style={{ flex: 1, fontSize: "13px", fontWeight: 600, padding: "10px", borderRadius: "20px", border: "none", background: COR.sauge, color: "#FFFFFF", cursor: "pointer" }}
              >
                Editar
              </button>
            </div>
          ) : (
            <div style={{ background: COR.cartao, border: `1px solid ${COR.alerta}`, borderRadius: "10px", padding: "12px" }}>
              <div style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.textoPrincipal, marginBottom: "10px" }}>
                Remover esse registro não pode ser desfeito.
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setConfirmandoRemocaoId(null)} style={{ flex: 1, fontFamily: SANS, fontSize: "12.5px", padding: "9px", borderRadius: "8px", border: `1px solid ${COR.linha}`, background: "#FFFFFF", color: COR.textoPrincipal, cursor: "pointer" }}>
                  Cancelar
                </button>
                <button onClick={() => removerRegistro(registroSelecionado.id)} style={{ flex: 1, fontFamily: SANS, fontSize: "12.5px", fontWeight: 600, padding: "9px", borderRadius: "8px", border: "none", background: COR.alerta, color: "#FFFFFF", cursor: "pointer" }}>
                  Sim, remover
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- tela: novo registro / editando registro ----------
  if (modo === "form") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ flexShrink: 0, padding: "20px 20px 14px", borderBottom: `1px solid ${COR.linha}` }}>
          <button
            onClick={limparForm}
            style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.saugeEscuro, background: "transparent", border: "none", padding: 0, marginBottom: "10px", cursor: "pointer" }}
          >
            ← Sementes
          </button>
          <div style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: COR.saugeEscuro, fontWeight: 700 }}>
            🌱 {editandoId ? "Editando esse registro" : "Novo registro"}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ padding: "16px 20px 20px" }}>
            <form id="form-sementes" onSubmit={salvarRegistro} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "4px" }}>Quantidade</div>
                <input
                  type="number"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  style={{ width: "90px", fontSize: "13.5px", padding: "8px 10px", borderRadius: "8px", border: `1px solid ${COR.linha}` }}
                />
              </div>

              <div>
                <div style={{ fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "4px" }}>Título do livro</div>
                {!tituloForaDaEstante ? (
                  <select
                    value={livros.some((l) => l.titulo === titulo) ? titulo : ""}
                    onChange={(e) => {
                      if (e.target.value === "__fora__") {
                        setTituloForaDaEstante(true);
                        setTitulo("");
                      } else {
                        setTitulo(e.target.value);
                      }
                    }}
                    style={{ width: "100%", boxSizing: "border-box", fontSize: "13.5px", padding: "9px 10px", borderRadius: "8px", border: `1px solid ${COR.linha}`, background: "#FFFFFF", color: COR.textoPrincipal }}
                  >
                    <option value="">Selecione um livro da sua Estante</option>
                    {livros.map((l) => (
                      <option key={l.id} value={l.titulo}>
                        {l.titulo}
                      </option>
                    ))}
                    <option value="__fora__">Esse título não está na minha Estante…</option>
                  </select>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <input
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Digite o título do livro"
                      style={{ width: "100%", boxSizing: "border-box", fontSize: "13.5px", padding: "9px 10px", borderRadius: "8px", border: `1px solid ${COR.linha}`, color: COR.textoPrincipal }}
                    />
                    {livros.length > 0 && (
                      <span
                        onClick={() => {
                          setTituloForaDaEstante(false);
                          setTitulo("");
                        }}
                        style={{ fontFamily: SANS, fontSize: "11.5px", color: COR.saugeEscuro, textDecoration: "underline", cursor: "pointer" }}
                      >
                        ← escolher da minha Estante
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "4px" }}>Gênero (opcional)</div>
                <select
                  value={genero}
                  onChange={(e) => setGenero(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", fontSize: "13.5px", padding: "9px 10px", borderRadius: "8px", border: `1px solid ${COR.linha}`, background: "#FFFFFF", color: COR.textoPrincipal }}
                >
                  <option value="">Gênero (opcional)</option>
                  {GENEROS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                  <option value="Outro">Outro…</option>
                </select>
                {genero === "Outro" && (
                  <input
                    value={generoCustom}
                    onChange={(e) => setGeneroCustom(e.target.value)}
                    placeholder="Digite o gênero"
                    style={{ width: "100%", boxSizing: "border-box", fontSize: "13.5px", padding: "9px 10px", borderRadius: "8px", border: `1px solid ${COR.linha}`, marginTop: "6px", color: COR.textoPrincipal }}
                  />
                )}
              </div>

              <div>
                <div style={{ fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "4px" }}>Conte um pouco, se quiser (opcional)</div>
                <textarea
                  value={anotacao}
                  onChange={(e) => setAnotacao(e.target.value)}
                  placeholder="Pra quem foi, onde, como foi essa história…"
                  style={{ width: "100%", boxSizing: "border-box", height: "260px", overflowY: "auto", resize: "none", fontSize: "13.5px", padding: "10px", borderRadius: "8px", border: `1px solid ${COR.linha}`, fontFamily: "inherit", color: COR.textoPrincipal }}
                />
              </div>

              {erro && <div style={{ fontSize: "12px", color: COR.alerta }}>{erro}</div>}
            </form>
          </div>
        </div>

        <div style={{ flexShrink: 0, padding: "12px 20px", borderTop: `1px solid ${COR.linha}`, background: COR.fundo, display: "flex", gap: "8px" }}>
          <button type="button" onClick={limparForm} style={{ flex: 1, fontFamily: SANS, fontSize: "13px", padding: "10px", borderRadius: "10px", border: `1px solid ${COR.linha}`, background: "#FFFFFF", color: COR.textoPrincipal, cursor: "pointer" }}>
            Cancelar
          </button>
          <button type="submit" form="form-sementes" style={{ flex: 1, fontFamily: SANS, fontSize: "13px", fontWeight: 600, padding: "10px", borderRadius: "10px", border: "none", background: COR.sauge, color: "#FFFFFF", cursor: "pointer" }}>
            Salvar
          </button>
        </div>
      </div>
    );
  }

  // ---------- tela: visão geral ----------
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flexShrink: 0, padding: "22px 20px 14px", borderBottom: `1px solid ${COR.linha}` }}>
        <div style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: COR.saugeEscuro, marginBottom: "4px" }}>
          🌱 Sementes
        </div>
        <h1 style={{ fontSize: "22px", fontWeight: 600, margin: 0 }}>Livros que você compartilhou</h1>
      </div>

      <div style={{ flexShrink: 0 }}>
        <div style={{ padding: "16px 20px 20px" }}>
          {pendente && (
            <div style={{ margin: "0 0 12px", padding: "8px 12px", borderRadius: "10px", background: COR.saugeClaro, fontFamily: SANS, fontSize: "11.5px", color: COR.saugeEscuro }}>
              Modo de teste: essa versão ainda não guarda os dados de forma permanente.
            </div>
          )}

          <div style={{ fontFamily: SANS, fontSize: "13px", color: COR.textoSecundario, lineHeight: 1.6, marginBottom: "16px" }}>
            Um espaço só seu pra guardar a lembrança de um livro que você passou adiante — no seu tempo, do seu jeito, se e quando fizer sentido pra você.
          </div>

          {totalCompartilhado > 0 && (
            <div style={{ background: COR.saugeClaro, borderRadius: "14px", padding: "16px", marginBottom: "16px", textAlign: "center" }}>
              <div style={{ fontSize: "26px", marginBottom: "4px" }}>🌱</div>
              <div style={{ fontFamily: SANS, fontSize: "13.5px", color: COR.saugeEscuro, lineHeight: 1.5 }}>
                Você já compartilhou <strong>{totalCompartilhado}</strong> {totalCompartilhado === 1 ? "livro" : "livros"} — cada um talvez tenha começado alguma coisa boa pra alguém.
              </div>
            </div>
          )}

          <button
            onClick={abrirNovoRegistro}
            style={{ width: "100%", fontFamily: SANS, fontSize: "14px", fontWeight: 600, padding: "12px", borderRadius: "10px", border: "none", background: COR.sauge, color: "#FFFFFF", cursor: "pointer", marginBottom: "20px" }}
          >
            + Guardar a lembrança de um livro
          </button>

          <div
            onClick={() => salvarPref({ ...pref, publico: !pref.publico })}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: "10px", background: pref.publico ? COR.melClaro : COR.saugeClaro, cursor: "pointer" }}
          >
            <div>
              <div style={{ fontFamily: SANS, fontSize: "12.5px", fontWeight: 600, color: pref.publico ? COR.melEscuro : COR.saugeEscuro }}>
                {pref.publico ? "Esses registros estão visíveis pra outras pessoas" : "Deixar esses registros visíveis pra outras pessoas"}
              </div>
              <div style={{ fontFamily: SANS, fontSize: "11px", color: COR.textoSecundario, marginTop: "1px" }}>Fica só com você, a não ser que você mude isso</div>
            </div>
            <div style={{ width: "36px", height: "20px", borderRadius: "20px", background: pref.publico ? COR.mel : COR.linha, position: "relative", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: "2px", left: pref.publico ? "18px" : "2px", width: "16px", height: "16px", borderRadius: "50%", background: "#FFFFFF" }} />
            </div>
          </div>
        </div>
      </div>

      {sementes.length > 0 && (
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", borderTop: `1px solid ${COR.linha}` }}>
          <div style={{ padding: "16px 20px 20px" }}>
            <div style={{ fontFamily: SANS, fontSize: "12.5px", fontWeight: 600, color: COR.textoPrincipal, marginBottom: "10px" }}>O que você já guardou aqui</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {sementes.map((d) => (
                <div
                  key={d.id}
                  onClick={() => abrirLeituraRegistro(d)}
                  style={{ background: COR.cartao, border: `1px solid ${COR.linha}`, borderRadius: "12px", padding: "12px", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: d.anotacao ? "4px" : 0 }}>
                    <div style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, color: COR.textoPrincipal, minWidth: 0 }}>
                      {d.quantidade > 1 ? `${d.quantidade}× ` : ""}
                      {d.titulo}
                    </div>
                    <div style={{ fontFamily: SANS, fontSize: "11px", color: COR.textoSecundario, flexShrink: 0 }}>{formatarDataCurta(d.data)}</div>
                  </div>
                  {d.anotacao && <div style={{ fontFamily: SANS, fontSize: "12px", color: COR.textoSecundario, lineHeight: 1.5, marginBottom: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.anotacao}</div>}
                  <div style={{ display: "flex", gap: "10px", marginTop: "4px" }} onClick={(e) => e.stopPropagation()}>
                    <span onClick={() => abrirEdicaoRegistro(d)} style={{ fontFamily: SANS, fontSize: "11.5px", color: COR.saugeEscuro, textDecoration: "underline", cursor: "pointer" }}>
                      editar
                    </span>
                    <span onClick={() => setConfirmandoRemocaoId(d.id)} style={{ fontFamily: SANS, fontSize: "11.5px", color: COR.textoSecundario, textDecoration: "underline", cursor: "pointer" }}>
                      remover
                    </span>
                  </div>
                  {confirmandoRemocaoId === d.id && (
                    <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "6px" }}>
                      <span style={{ fontFamily: SANS, fontSize: "11.5px", color: COR.textoSecundario }}>Remover esse registro?</span>
                      <button onClick={() => setConfirmandoRemocaoId(null)} style={{ fontFamily: SANS, fontSize: "11.5px", padding: "4px 9px", borderRadius: "20px", border: `1px solid ${COR.linha}`, background: "#FFFFFF", cursor: "pointer" }}>
                        Não
                      </button>
                      <button onClick={() => removerRegistro(d.id)} style={{ fontFamily: SANS, fontSize: "11.5px", padding: "4px 9px", borderRadius: "20px", border: "none", background: COR.alerta, color: "#FFFFFF", cursor: "pointer" }}>
                        Sim, remover
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ---- gráficos SVG simples, feitos à mão (sem biblioteca externa) — usados só no Painel ----

function polarParaXY(cx, cy, r, anguloGraus) {
  const rad = ((anguloGraus - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function GraficoPizza({ dados, tamanho = 132, corCentro }) {
  const total = dados.reduce((acc, d) => acc + d.valor, 0);
  const raio = tamanho / 2;
  const centro = raio;
  const raioInterno = raio * 0.58;

  let anguloAcumulado = 0;
  const fatias = dados.map((d) => {
    const fatiaGraus = total > 0 ? (d.valor / total) * 360 : 0;
    const inicio = anguloAcumulado;
    const fim = anguloAcumulado + fatiaGraus;
    anguloAcumulado = fim;
    const p1 = polarParaXY(centro, centro, raio, inicio);
    const p2 = polarParaXY(centro, centro, raio, fim);
    const arcoGrande = fatiaGraus > 180 ? 1 : 0;
    const path = fatiaGraus >= 359.99 ? null : `M ${centro} ${centro} L ${p1.x} ${p1.y} A ${raio} ${raio} 0 ${arcoGrande} 1 ${p2.x} ${p2.y} Z`;
    return { ...d, path };
  });

  return (
    <svg viewBox={`0 0 ${tamanho} ${tamanho}`} width={tamanho} height={tamanho}>
      {total === 0 ? (
        <circle cx={centro} cy={centro} r={raio} fill={COR.linha} />
      ) : (
        fatias.map((f, i) =>
          f.path ? (
            <path key={i} d={f.path} fill={f.cor} />
          ) : (
            <circle key={i} cx={centro} cy={centro} r={raio} fill={f.cor} />
          )
        )
      )}
      <circle cx={centro} cy={centro} r={raioInterno} fill={corCentro} />
    </svg>
  );
}

function GraficoBarrasColunas({ dados, altura = 150, cor }) {
  const largura = 300;
  const margemLateral = 14;
  const areaUtil = largura - margemLateral * 2;
  const maximo = Math.max(1, ...dados.map((d) => d.valor));
  const n = Math.max(1, dados.length);
  const espacoColuna = areaUtil / n;
  const larguraBarra = Math.min(34, espacoColuna * 0.55);
  const alturaRotulo = 34;
  const baseY = altura - alturaRotulo;
  const alturaUtil = baseY - 20;

  // encurta o rótulo pra caber embaixo da barra sem embolar com o vizinho
  const maxChars = n <= 3 ? 14 : n <= 5 ? 9 : 7;
  const encurtar = (txt) => (txt.length > maxChars ? txt.slice(0, maxChars - 1) + "…" : txt);

  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} width="100%" height={altura} preserveAspectRatio="xMidYMax meet">
      <line x1="0" y1={baseY} x2={largura} y2={baseY} stroke={COR.linha} strokeWidth="1" />
      {dados.map((d, i) => {
        const h = Math.max(3, (d.valor / maximo) * alturaUtil);
        const cx = margemLateral + i * espacoColuna + espacoColuna / 2;
        return (
          <g key={i}>
            <rect x={cx - larguraBarra / 2} y={baseY - h} width={larguraBarra} height={h} rx="5" fill={cor} />
            <text x={cx} y={baseY - h - 6} textAnchor="middle" fontSize="11" fill={COR.textoPrincipal} fontFamily="sans-serif">
              {d.valor}
            </text>
            <text
              x={cx}
              y={baseY + 13}
              textAnchor="end"
              fontSize="9.5"
              fill={COR.textoSecundario}
              fontFamily="sans-serif"
              transform={`rotate(-35 ${cx} ${baseY + 13})`}
            >
              {encurtar(d.label)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function GraficoLinhaArea({ dados, altura = 110, cor }) {
  const largura = 300;
  const maximo = Math.max(1, ...dados.map((d) => d.valor));
  const n = dados.length;
  const passo = n > 1 ? largura / (n - 1) : 0;
  const alturaUtil = altura - 26;
  const pontos = dados.map((d, i) => ({
    x: n > 1 ? i * passo : largura / 2,
    y: altura - 18 - (d.valor / maximo) * alturaUtil,
    valor: d.valor,
  }));
  const caminhoLinha = pontos.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const caminhoArea = `${caminhoLinha} L ${pontos[pontos.length - 1].x} ${altura - 2} L ${pontos[0].x} ${altura - 2} Z`;

  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} width="100%" height={altura}>
      <line x1="0" y1={altura - 2} x2={largura} y2={altura - 2} stroke={COR.linha} strokeWidth="1" />
      <path d={caminhoArea} fill={cor} fillOpacity="0.16" />
      <path d={caminhoLinha} fill="none" stroke={cor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pontos.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill={cor} />
          <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="10.5" fill={COR.textoPrincipal} fontFamily="sans-serif">
            {p.valor}
          </text>
        </g>
      ))}
    </svg>
  );
}

function PainelEstante({ livros }) {
  const total = livros.length;

  const porFormato = useMemo(() => {
    return FORMATOS.map((f) => ({ label: f.label, icone: f.icone, valor: livros.filter((l) => l.formato === f.key).length })).filter(
      (f) => f.valor > 0
    );
  }, [livros]);

  const porGenero = useMemo(() => {
    const c = {};
    livros.forEach((l) => {
      const g = l.genero && l.genero.trim() ? l.genero.trim() : "Sem gênero definido";
      c[g] = (c[g] || 0) + 1;
    });
    return Object.entries(c)
      .map(([label, valor]) => ({ label, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [livros]);

  const porStatus = useMemo(() => {
    return STATUSES.map((s) => ({ label: s.label, valor: livros.filter((l) => l.status === s.key).length })).filter((s) => s.valor > 0);
  }, [livros]);

  const queroComprar = useMemo(() => livros.filter((l) => l.aindaVouComprar), [livros]);

  const porIndicacao = useMemo(() => {
    const c = {};
    livros.forEach((l) => {
      if (l.indicadoPor && l.indicadoPor.trim()) {
        const nome = l.indicadoPor.trim();
        c[nome] = (c[nome] || 0) + 1;
      }
    });
    return Object.entries(c)
      .map(([label, valor]) => ({ label, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [livros]);

  const porMes = useMemo(() => {
    const meses = [];
    const agora = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const chave = `${d.getFullYear()}-${d.getMonth()}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      meses.push({ chave, label, valor: 0 });
    }
    livros.forEach((l) => {
      const d = new Date(l.criadoEm);
      const chave = `${d.getFullYear()}-${d.getMonth()}`;
      const mes = meses.find((m) => m.chave === chave);
      if (mes) mes.valor += 1;
    });
    return meses;
  }, [livros]);

  const maximoMes = Math.max(1, ...porMes.map((m) => m.valor));

  const livrosTitulos = useMemo(() => livros.map((l) => l.titulo), [livros]);

  if (total === 0) {
    return (
      <div style={{ padding: "16px" }}>
        <div style={{ padding: "30px 26px", fontFamily: SANS, fontSize: "13.5px", color: COR.textoSecundario, textAlign: "center", lineHeight: 1.6 }}>
          O resto do painel aparece assim que você cadastrar o primeiro livro.
        </div>
      </div>
    );
  }

  const lidoCount = (porStatus.find((s) => s.label === "Lido") || { valor: 0 }).valor;

  return (
    <div style={{ padding: "16px" }}>
      {/* topo do dashboard — as 3 métricas mais importantes, em destaque */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
        <div style={{ flex: 1, background: COR.sauge, borderRadius: "14px", padding: "12px 10px" }}>
          <div style={{ fontSize: "18px", marginBottom: "6px" }}>📚</div>
          <div style={{ fontSize: "21px", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.1 }}>{total}</div>
          <div style={{ fontFamily: SANS, fontSize: "10px", color: "#FFFFFF", opacity: 0.9, marginTop: "2px" }}>na Estante</div>
        </div>
        <div style={{ flex: 1, background: COR.mel, borderRadius: "14px", padding: "12px 10px" }}>
          <div style={{ fontSize: "18px", marginBottom: "6px" }}>✅</div>
          <div style={{ fontSize: "21px", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.1 }}>{lidoCount}</div>
          <div style={{ fontFamily: SANS, fontSize: "10px", color: "#FFFFFF", opacity: 0.9, marginTop: "2px" }}>lidos</div>
        </div>
        <div style={{ flex: 1, background: COR.ameixa, borderRadius: "14px", padding: "12px 10px" }}>
          <div style={{ fontSize: "18px", marginBottom: "6px" }}>🛒</div>
          <div style={{ fontSize: "21px", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.1 }}>{queroComprar.length}</div>
          <div style={{ fontFamily: SANS, fontSize: "10px", color: "#FFFFFF", opacity: 0.9, marginTop: "2px" }}>na mira</div>
        </div>
      </div>

      {/* segunda linha de destaque — acervo próprio, um pouco menos evidente que o topo */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
        <div style={{ flex: 1, background: COR.saugeClaro, borderRadius: "14px", padding: "14px" }}>
          <div style={{ fontFamily: SANS, fontSize: "10.5px", letterSpacing: "0.04em", textTransform: "uppercase", color: COR.saugeEscuro, marginBottom: "2px" }}>
            Seu acervo
          </div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: COR.saugeEscuro }}>{total - queroComprar.length}</div>
          <div style={{ fontFamily: SANS, fontSize: "11px", color: COR.saugeEscuro }}>já é seu</div>
        </div>
        <div style={{ flex: 1, background: COR.melClaro, borderRadius: "14px", padding: "14px" }}>
          <div style={{ fontFamily: SANS, fontSize: "10.5px", letterSpacing: "0.04em", textTransform: "uppercase", color: COR.melEscuro, marginBottom: "2px" }}>
            Cadastrados
          </div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: COR.melEscuro }}>{porMes[porMes.length - 1].valor}</div>
          <div style={{ fontFamily: SANS, fontSize: "11px", color: COR.melEscuro }}>livros esse mês</div>
        </div>
      </div>

      <div style={{ background: COR.cartao, border: `1px solid ${COR.linha}`, borderRadius: "14px", padding: "16px", marginBottom: "12px" }}>
        <div style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, marginBottom: "12px" }}>Status de leitura</div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <GraficoPizza
            dados={porStatus.map((s, i) => ({ ...s, cor: [COR.ameixa, COR.mel, COR.sauge, COR.linha][STATUSES.findIndex((st) => st.label === s.label)] || COR.linha }))}
            corCentro={COR.cartao}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
            {porStatus.map((s) => {
              const cor = [COR.ameixa, COR.mel, COR.sauge, COR.linha][STATUSES.findIndex((st) => st.label === s.label)] || COR.linha;
              const pct = total > 0 ? Math.round((s.valor / total) * 100) : 0;
              return (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: SANS, fontSize: "12px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: cor, flexShrink: 0 }} />
                  <div style={{ flex: 1, color: COR.textoPrincipal }}>{s.label}</div>
                  <div style={{ color: COR.textoSecundario }}>
                    {s.valor} · {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: `1px solid ${COR.linha}` }}>
          <div style={{ fontFamily: SANS, fontSize: "11.5px", fontWeight: 600, color: COR.textoSecundario, marginBottom: "8px" }}>Por formato</div>
          {porFormato.map((f) => (
            <BarraContagem key={f.label} rotulo={`${f.icone} ${f.label}`} valor={f.valor} maximo={total} cor={COR.sauge} corFundo={COR.saugeClaro} />
          ))}
        </div>
      </div>

      <div style={{ background: COR.cartao, border: `1px solid ${COR.linha}`, borderRadius: "14px", padding: "16px", marginBottom: "12px" }}>
        <div style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, marginBottom: "2px" }}>Por gênero</div>
        {porGenero.length > 6 && (
          <div style={{ fontFamily: SANS, fontSize: "11px", color: COR.textoSecundario, marginBottom: "6px" }}>
            Os 6 mais presentes na sua estante
          </div>
        )}
        <GraficoBarrasColunas dados={porGenero.slice(0, 6)} cor={COR.ameixa} />
      </div>

      <div style={{ background: COR.cartao, border: `1px solid ${COR.linha}`, borderRadius: "14px", padding: "16px", marginBottom: "12px" }}>
        <div style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, marginBottom: "2px" }}>Ritmo de cadastro</div>
        <div style={{ fontFamily: SANS, fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "6px" }}>
          {porMes.filter((m) => m.valor > 0).length <= 1
            ? "A linha ganha forma conforme você for cadastrando ao longo dos meses"
            : "Livros adicionados por mês, últimos 6 meses"}
        </div>
        <GraficoLinhaArea dados={porMes} cor={COR.sauge} />
        <div style={{ display: "flex", marginTop: "2px" }}>
          {porMes.map((m) => (
            <div key={m.chave} style={{ flex: 1, textAlign: "center", fontFamily: SANS, fontSize: "10px", color: COR.textoSecundario, textTransform: "capitalize" }}>
              {m.label}
            </div>
          ))}
        </div>
      </div>

      {/* menos prioritárias — compactas, no rodapé do painel */}
      <div style={{ display: "flex", gap: "10px" }}>
        {porIndicacao.length > 0 && (
          <div style={{ flex: 1, background: COR.cartao, border: `1px solid ${COR.linha}`, borderRadius: "14px", padding: "14px" }}>
            <div style={{ fontFamily: SANS, fontSize: "11.5px", fontWeight: 600, color: COR.textoSecundario, marginBottom: "8px" }}>💌 Quem te indica</div>
            {porIndicacao.map((p) => (
              <BarraContagem key={p.label} rotulo={p.label} valor={p.valor} maximo={porIndicacao[0].valor} cor={COR.ameixa} corFundo={COR.ameixaClaro} />
            ))}
          </div>
        )}

        <div style={{ flex: 1, background: COR.cartao, border: `1px solid ${COR.linha}`, borderRadius: "14px", padding: "14px" }}>
          <div style={{ fontFamily: SANS, fontSize: "11.5px", fontWeight: 600, color: COR.textoSecundario, marginBottom: "2px" }}>🛒 Quero comprar</div>
          <div style={{ fontFamily: SANS, fontSize: "11px", color: COR.textoSecundario, marginBottom: "8px" }}>
            {queroComprar.length === 0 ? "Nada na lista agora" : `${queroComprar.length} ${queroComprar.length === 1 ? "livro" : "livros"}`}
          </div>
          {queroComprar.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {queroComprar.map((l) => (
                <div key={l.id} style={{ fontFamily: SANS, fontSize: "12px", color: COR.textoPrincipal, display: "flex", justifyContent: "space-between", gap: "8px" }}>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.titulo}</span>
                  <span style={{ color: COR.textoSecundario, flexShrink: 0 }}>{formatoDe(l.formato).icone}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// gráfico de linha simples, em SVG puro (sem biblioteca) — progresso real x meta ideal
function GraficoProgresso({ serie, paginasTotais }) {
  if (serie.length < 2) {
    return (
      <div style={{ fontFamily: SANS, fontSize: "12px", color: COR.textoSecundario, padding: "16px 0", textAlign: "center" }}>
        Registre pelo menos dois dias pra ver o gráfico.
      </div>
    );
  }
  const largura = 300;
  const altura = 100;
  const padding = 6;
  const maxY = Math.max(paginasTotais || 0, ...serie.map((s) => Math.max(s.real, s.meta)), 1);

  function pontos(chave) {
    return serie
      .map((s, i) => {
        const x = padding + (i / (serie.length - 1)) * (largura - 2 * padding);
        const y = altura - padding - (s[chave] / maxY) * (altura - 2 * padding);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  return (
    <div>
      <svg viewBox={`0 0 ${largura} ${altura}`} width="100%" height={altura} style={{ display: "block" }}>
        <polyline points={pontos("meta")} fill="none" stroke={COR.textoSecundario} strokeWidth="2" strokeDasharray="4,3" />
        <polyline points={pontos("real")} fill="none" stroke={COR.sauge} strokeWidth="2.5" />
      </svg>
      <div style={{ display: "flex", gap: "14px", fontFamily: SANS, fontSize: "11px", color: COR.textoSecundario, marginTop: "4px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: "12px", height: "2.5px", background: COR.sauge, display: "inline-block" }} /> seu progresso
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: "12px", height: "2px", borderTop: `2px dashed ${COR.textoSecundario}`, display: "inline-block" }} /> meta ideal
        </span>
      </div>
    </div>
  );
}

function ProgressoLeitura({ livro, onDefinirMeta, onCheckin }) {
  const [periodo, setPeriodo] = useState("30"); // '7' | '30' | 'inicio'
  const [paginasInput, setPaginasInput] = useState(livro.paginasTotais ? String(livro.paginasTotais) : "");
  const [metaInput, setMetaInput] = useState(livro.metaDiaria ? String(livro.metaDiaria) : "");
  const [editandoData, setEditandoData] = useState(null);
  const [paginaEdit, setPaginaEdit] = useState("");
  const [notaEdit, setNotaEdit] = useState("");
  const [erroSetup, setErroSetup] = useState("");
  const [erroCheckin, setErroCheckin] = useState("");

  const progresso = useMemo(() => calcularProgresso(livro), [livro]);
  const serieGrafico = useMemo(() => gerarSerieProgresso(livro, periodo), [livro, periodo]);
  const serieHistorico = useMemo(() => gerarSerieProgresso(livro, "7"), [livro]);

  function salvarSetup(e) {
    e.preventDefault();
    const paginas = parseInt(paginasInput, 10);
    const meta = parseInt(metaInput, 10);
    if (!paginas || paginas <= 0) {
      setErroSetup("Diga quantas páginas o livro tem.");
      return;
    }
    if (!meta || meta <= 0) {
      setErroSetup("Diga uma meta de páginas por dia (pode mudar depois).");
      return;
    }
    setErroSetup("");
    onDefinirMeta(paginas, meta);
  }

  function abrirEdicaoDia(dataISO) {
    const existente = (livro.checkins || {})[dataISO];
    setEditandoData(dataISO);
    setPaginaEdit(existente ? String(existente.pagina) : "");
    setNotaEdit(existente ? existente.anotacao || "" : "");
    setErroCheckin("");
  }

  function salvarCheckin(e) {
    e.preventDefault();
    const pagina = parseInt(paginaEdit, 10);
    if (isNaN(pagina) || pagina < 0) {
      setErroCheckin("Digite um número de página válido.");
      return;
    }
    onCheckin(editandoData, pagina, notaEdit.trim());
    setEditandoData(null);
  }

  if (!livro.paginasTotais) {
    return (
      <div style={{ background: COR.saugeClaro, borderRadius: "12px", padding: "14px", marginBottom: "14px", fontFamily: SANS }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: COR.saugeEscuro, marginBottom: "8px" }}>
          📈 Acompanhar o progresso dessa leitura?
        </div>
        <form onSubmit={salvarSetup} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <input
            type="number"
            min="1"
            value={paginasInput}
            onChange={(e) => setPaginasInput(e.target.value)}
            placeholder="Quantas páginas tem o livro?"
            style={{ fontSize: "13.5px", padding: "8px 10px", borderRadius: "8px", border: `1px solid ${COR.linha}` }}
          />
          <input
            type="number"
            min="1"
            value={metaInput}
            onChange={(e) => setMetaInput(e.target.value)}
            placeholder="Meta de páginas por dia"
            style={{ fontSize: "13.5px", padding: "8px 10px", borderRadius: "8px", border: `1px solid ${COR.linha}` }}
          />
          {erroSetup && <div style={{ fontSize: "12px", color: COR.alerta }}>{erroSetup}</div>}
          <button type="submit" style={{ fontSize: "13px", fontWeight: 600, padding: "9px", borderRadius: "8px", border: "none", background: COR.sauge, color: "#FFFFFF", cursor: "pointer" }}>
            Começar a acompanhar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ background: COR.cartao, border: `1px solid ${COR.linha}`, borderRadius: "12px", padding: "14px", marginBottom: "14px", fontFamily: SANS }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600 }}>📈 Progresso de leitura</div>
        <div style={{ fontSize: "11.5px", color: COR.textoSecundario }}>
          {progresso.paginaAtual} de {livro.paginasTotais} págs
        </div>
      </div>

      <div style={{ height: "8px", borderRadius: "6px", background: COR.saugeClaro, overflow: "hidden", marginBottom: "8px" }}>
        <div style={{ height: "100%", width: `${progresso.percent}%`, background: COR.sauge, borderRadius: "6px" }} />
      </div>

      <div style={{ fontSize: "12.5px", color: COR.textoPrincipal, marginBottom: "12px" }}>
        {progresso.concluido
          ? "🎉 Livro concluído!"
          : progresso.dataPrevista
          ? `No ritmo atual, previsão de terminar em ${formatarDataCurta(progresso.dataPrevista)}`
          : "Ainda sem ritmo suficiente pra prever uma data — continue registrando"}
      </div>

      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontSize: "12px", color: COR.textoSecundario, marginBottom: "6px" }}>Últimos dias</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {serieHistorico.map((dia) => (
            <div
              key={dia.dataISO}
              onClick={() => abrirEdicaoDia(dia.dataISO)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 10px",
                borderRadius: "8px",
                background: dia.temRegistro ? "#FFFFFF" : COR.melClaro,
                border: `1px solid ${dia.temRegistro ? COR.linha : "transparent"}`,
                cursor: "pointer",
                fontSize: "12.5px",
              }}
            >
              <span style={{ color: COR.textoPrincipal }}>
                {dia.dataISO === hojeISO() ? "Hoje" : formatarDataCurta(dia.dataISO)}
              </span>
              <span style={{ color: dia.temRegistro ? COR.textoSecundario : COR.melEscuro }}>
                {dia.temRegistro ? `pág. ${dia.real}` : "sem registro — toque pra editar"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {editandoData && (
        <form
          onSubmit={salvarCheckin}
          style={{ background: COR.saugeClaro, borderRadius: "10px", padding: "10px", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "6px" }}
        >
          <div style={{ fontSize: "12px", fontWeight: 600, color: COR.saugeEscuro }}>
            {editandoData === hojeISO() ? "Registrar hoje" : `Editar ${formatarDataCurta(editandoData)}`}
          </div>
          <input
            type="number"
            min="0"
            value={paginaEdit}
            onChange={(e) => setPaginaEdit(e.target.value)}
            placeholder="Em que página você parou?"
            style={{ fontSize: "13px", padding: "7px 9px", borderRadius: "8px", border: `1px solid ${COR.linha}` }}
          />
          <input
            value={notaEdit}
            onChange={(e) => setNotaEdit(e.target.value)}
            placeholder="Alguma anotação desse dia? (opcional)"
            style={{ fontSize: "13px", padding: "7px 9px", borderRadius: "8px", border: `1px solid ${COR.linha}` }}
          />
          {erroCheckin && <div style={{ fontSize: "11.5px", color: COR.alerta }}>{erroCheckin}</div>}
          <div style={{ display: "flex", gap: "6px" }}>
            <button type="button" onClick={() => setEditandoData(null)} style={{ flex: 1, fontSize: "12px", padding: "7px", borderRadius: "8px", border: `1px solid ${COR.linha}`, background: "#FFFFFF", cursor: "pointer" }}>
              Cancelar
            </button>
            <button type="submit" style={{ flex: 1, fontSize: "12px", fontWeight: 600, padding: "7px", borderRadius: "8px", border: "none", background: COR.sauge, color: "#FFFFFF", cursor: "pointer" }}>
              Salvar
            </button>
          </div>
        </form>
      )}

      {!editandoData && (
        <button
          onClick={() => abrirEdicaoDia(hojeISO())}
          style={{ width: "100%", fontSize: "12.5px", fontWeight: 600, padding: "9px", borderRadius: "8px", border: "none", background: COR.sauge, color: "#FFFFFF", cursor: "pointer", marginBottom: "12px" }}
        >
          + Registrar hoje
        </button>
      )}

      <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
        {[
          { key: "7", label: "7 dias" },
          { key: "30", label: "30 dias" },
          { key: "inicio", label: "Desde o início" },
        ].map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriodo(p.key)}
            style={{
              fontSize: "11px",
              padding: "4px 9px",
              borderRadius: "20px",
              border: periodo === p.key ? `1px solid ${COR.saugeEscuro}` : `1px solid ${COR.linha}`,
              background: periodo === p.key ? COR.sauge : "#FFFFFF",
              color: periodo === p.key ? "#FFFFFF" : COR.textoSecundario,
              cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <GraficoProgresso serie={serieGrafico} paginasTotais={livro.paginasTotais} />
    </div>
  );
}

function TelaEstante({ estado, pendente, resenhas, onVerResenhas, marcadoresState }) {
  const { dados: livros, dadosRef: livrosRef, loaded, salvar } = estado;
  const { dados: marcadores, dadosRef: marcadoresRef, salvar: salvarMarcadores } = marcadoresState;

  const contagemResenhasPorLivro = useMemo(() => {
    const c = {};
    resenhas.forEach((r) => {
      c[r.livroId] = (c[r.livroId] || 0) + 1;
    });
    return c;
  }, [resenhas]);

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [filtroFormato, setFiltroFormato] = useState("todos");
  const [livroAberto, setLivroAberto] = useState(null);
  const [erroForm, setErroForm] = useState("");
  const [vista, setVista] = useState("lista"); // 'lista' | 'painel' | 'adicionarLivro'
  const [gerenciandoMarcadores, setGerenciandoMarcadores] = useState(false);
  const [novoNomeMarcador, setNovoNomeMarcador] = useState("");
  const [novaCorMarcador, setNovaCorMarcador] = useState(CORES_MARCADOR[0]);
  const [marcadorParaConfirmar, setMarcadorParaConfirmar] = useState(null);
  const [verMarcadoresCriados, setVerMarcadoresCriados] = useState(false);
  const painelMarcadoresRef = useRef(null);
  const botaoMarcadoresRef = useRef(null);

  // fecha o painel de marcadores se a pessoa clicar em qualquer lugar fora dele
  useEffect(() => {
    if (!gerenciandoMarcadores) return;
    function aoClicarFora(e) {
      const dentroDoPainel = painelMarcadoresRef.current && painelMarcadoresRef.current.contains(e.target);
      const noBotao = botaoMarcadoresRef.current && botaoMarcadoresRef.current.contains(e.target);
      if (!dentroDoPainel && !noBotao) {
        setGerenciandoMarcadores(false);
        setMarcadorParaConfirmar(null);
        setVerMarcadoresCriados(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [gerenciandoMarcadores]);

  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoAutor, setNovoAutor] = useState("");
  const [novoStatus, setNovoStatus] = useState("quero_ler");
  const [novoFormato, setNovoFormato] = useState("fisico");
  const [novaLocalizacao, setNovaLocalizacao] = useState("");
  const [novoGenero, setNovoGenero] = useState("");
  const [novoGeneroCustom, setNovoGeneroCustom] = useState("");
  const [novoAindaVouComprar, setNovoAindaVouComprar] = useState(false);
  const [novoIndicadoPor, setNovoIndicadoPor] = useState("");
  const [novoMarcadorIds, setNovoMarcadorIds] = useState([]);
  const [novaNotaLivro, setNovaNotaLivro] = useState("");
  const [voltarParaAdicionarLivro, setVoltarParaAdicionarLivro] = useState(false);
  const [mostrarMarcadoresAdicionar, setMostrarMarcadoresAdicionar] = useState(false);
  const marcadoresAdicionarRef = useRef(null);

  // fecha o menu de marcadores de "Adicionar livro" se clicar fora dele
  useEffect(() => {
    if (!mostrarMarcadoresAdicionar) return;
    function aoClicarFora(e) {
      if (marcadoresAdicionarRef.current && !marcadoresAdicionarRef.current.contains(e.target)) {
        setMostrarMarcadoresAdicionar(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [mostrarMarcadoresAdicionar]);
  const [livroOrigemMarcador, setLivroOrigemMarcador] = useState(null);

  const [mostrarMarcadoresEdicao, setMostrarMarcadoresEdicao] = useState(false);
  const marcadoresEdicaoRef = useRef(null);

  // fecha o menu de marcadores da edição de livro se clicar fora dele
  useEffect(() => {
    if (!mostrarMarcadoresEdicao) return;
    function aoClicarFora(e) {
      if (marcadoresEdicaoRef.current && !marcadoresEdicaoRef.current.contains(e.target)) {
        setMostrarMarcadoresEdicao(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [mostrarMarcadoresEdicao]);

  function criarMarcador(e) {
    e.preventDefault();
    const nome = novoNomeMarcador.trim();
    if (!nome) return;
    const marcador = { id: uid(), nome, cor: novaCorMarcador };
    salvarMarcadores([...marcadoresRef.current, marcador]);
    setNovoNomeMarcador("");
    setNovaCorMarcador(CORES_MARCADOR[0]);
    setGerenciandoMarcadores(false);
  }

  function removerMarcador(id) {
    salvarMarcadores(marcadoresRef.current.filter((m) => m.id !== id));
    // também tira esse marcador de qualquer livro que o usava
    salvar(livrosRef.current.map((l) => ({ ...l, marcadorIds: (l.marcadorIds || []).filter((mid) => mid !== id) })));
    setMarcadorParaConfirmar(null);
  }

  function alternarMarcadorNoLivro(livroId, marcadorId) {
    salvar(
      livrosRef.current.map((l) => {
        if (l.id !== livroId) return l;
        const atuais = l.marcadorIds || [];
        const tem = atuais.includes(marcadorId);
        return { ...l, marcadorIds: tem ? atuais.filter((id) => id !== marcadorId) : [...atuais, marcadorId] };
      })
    );
  }
  const [generoModoOutro, setGeneroModoOutro] = useState(false);
  const [confirmandoRemocaoLivro, setConfirmandoRemocaoLivro] = useState(false);
  const [mostrarMaisDetalhesLivro, setMostrarMaisDetalhesLivro] = useState(false);

  useEffect(() => {
    setGeneroModoOutro(false);
  }, [livroAberto]);

  function abrirAdicionarLivro() {
    setErroForm("");
    setVista("adicionarLivro");
  }

  function cancelarAdicionarLivro() {
    setNovoTitulo("");
    setNovoAutor("");
    setNovoStatus("quero_ler");
    setNovoFormato("fisico");
    setNovaLocalizacao("");
    setNovoGenero("");
    setNovoGeneroCustom("");
    setNovoAindaVouComprar(false);
    setNovoIndicadoPor("");
    setNovoMarcadorIds([]);
    setMostrarMarcadoresAdicionar(false);
    setNovaNotaLivro("");
    setErroForm("");
    setVista("lista");
  }

  function adicionarLivro(e) {
    e.preventDefault();
    const tituloLimpo = novoTitulo.trim();
    if (!tituloLimpo) {
      setErroForm("Digite pelo menos o título do livro.");
      return;
    }
    const generoFinal = novoGenero === "Outro" ? novoGeneroCustom.trim() : novoGenero;
    const livro = {
      id: uid(),
      titulo: tituloLimpo,
      autor: novoAutor.trim(),
      status: novoStatus,
      formato: novoFormato,
      localizacao: novoFormato === "fisico" ? novaLocalizacao.trim() : "",
      genero: generoFinal,
      aindaVouComprar: novoAindaVouComprar,
      indicadoPor: novoIndicadoPor.trim(),
      marcadorIds: novoMarcadorIds,
      nota: novaNotaLivro.trim(),
      criadoEm: new Date().toISOString(),
    };
    salvar([livro, ...livrosRef.current]);
    setNovoTitulo("");
    setNovoAutor("");
    setNovoStatus("quero_ler");
    setNovoFormato("fisico");
    setNovaLocalizacao("");
    setNovoGenero("");
    setNovoGeneroCustom("");
    setNovoAindaVouComprar(false);
    setNovoIndicadoPor("");
    setNovoMarcadorIds([]);
    setMostrarMarcadoresAdicionar(false);
    setNovaNotaLivro("");
    setErroForm("");
    setVista("lista");
  }

  function atualizarGenero(id, genero) {
    salvar(livrosRef.current.map((l) => (l.id === id ? { ...l, genero } : l)));
  }

  function atualizarAindaVouComprar(id, valor) {
    salvar(livrosRef.current.map((l) => (l.id === id ? { ...l, aindaVouComprar: valor } : l)));
  }

  function atualizarIndicadoPor(id, valor) {
    salvar(livrosRef.current.map((l) => (l.id === id ? { ...l, indicadoPor: valor } : l)));
  }

  function definirMetaLeitura(id, paginasTotais, metaDiaria) {
    salvar(
      livrosRef.current.map((l) => (l.id === id ? { ...l, paginasTotais, metaDiaria, checkins: l.checkins || {} } : l))
    );
  }

  function registrarCheckin(id, dataISO, pagina, anotacao) {
    salvar(
      livrosRef.current.map((l) =>
        l.id === id ? { ...l, checkins: { ...(l.checkins || {}), [dataISO]: { pagina, anotacao } } } : l
      )
    );
  }

  function atualizarStatus(id, status) {
    salvar(livrosRef.current.map((l) => (l.id === id ? { ...l, status } : l)));
  }

  function atualizarLocalizacao(id, localizacao) {
    salvar(livrosRef.current.map((l) => (l.id === id ? { ...l, localizacao } : l)));
  }

  function atualizarAutor(id, autor) {
    salvar(livrosRef.current.map((l) => (l.id === id ? { ...l, autor } : l)));
  }

  function atualizarFormato(id, formato) {
    salvar(livrosRef.current.map((l) => (l.id === id ? { ...l, formato, localizacao: formato === "fisico" ? l.localizacao : "" } : l)));
  }

  function atualizarNota(id, nota) {
    salvar(livrosRef.current.map((l) => (l.id === id ? { ...l, nota } : l)));
  }

  function removerLivro(id) {
    salvar(livrosRef.current.filter((l) => l.id !== id));
    setLivroAberto(null);
  }

  const termoBusca = normalizar(busca);
  const buscando = termoBusca.length > 0;

  // o filtro de formato é sempre aplicado, mesmo durante uma busca — é uma
  // escolha mais "dura" (tipo separar uma prateleira física) do que o status,
  // que é mais fluido e por isso cede lugar à busca
  const livrosFiltrados = useMemo(() => {
    return livros.filter((l) => {
      const bateBusca =
        !buscando || normalizar(l.titulo).includes(termoBusca) || normalizar(l.autor).includes(termoBusca);
      const bateStatus = buscando || filtro === "todos" || l.status === filtro;
      const bateFormato = filtroFormato === "todos" || l.formato === filtroFormato;
      return bateBusca && bateStatus && bateFormato;
    });
  }, [livros, termoBusca, buscando, filtro, filtroFormato]);

  const contagem = useMemo(() => {
    let base = filtroFormato === "todos" ? livros : livros.filter((l) => l.formato === filtroFormato);
    if (buscando) {
      base = base.filter((l) => normalizar(l.titulo).includes(termoBusca) || normalizar(l.autor).includes(termoBusca));
    }
    const c = { todos: base.length };
    STATUSES.forEach((s) => {
      c[s.key] = base.filter((l) => l.status === s.key).length;
    });
    return c;
  }, [livros, buscando, termoBusca, filtroFormato]);

  const contagemFormato = useMemo(() => {
    const c = { todos: livros.length };
    FORMATOS.forEach((f) => {
      c[f.key] = livros.filter((l) => l.formato === f.key).length;
    });
    return c;
  }, [livros]);

  const aberto = livros.find((l) => l.id === livroAberto) || null;
      if (aberto) {
    return (
      <>
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ flexShrink: 0, padding: "20px 20px 14px", borderBottom: `1px solid ${COR.linha}` }}>
            <button
              onClick={() => setLivroAberto(null)}
              style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.saugeEscuro, background: "transparent", border: "none", padding: 0, marginBottom: "10px", cursor: "pointer" }}
            >
              ← Voltar
            </button>

            <div style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: COR.saugeEscuro, fontWeight: 700, marginBottom: "8px" }}>
              📖 Editando livro
            </div>

            <div style={{ fontFamily: SERIF, fontSize: "19px", fontWeight: 700, marginBottom: "2px", color: COR.textoPrincipal }}>
              {aberto.titulo}
            </div>
            <div style={{ fontSize: "12.5px", color: COR.textoSecundario }}>
              {aberto.autor ? aberto.autor : "Autor não informado"} · {formatoDe(aberto.formato).icone} {formatoDe(aberto.formato).label}
              {aberto.genero ? ` · ${aberto.genero}` : ""}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ padding: "16px 20px 20px" }}>
            <div style={{ fontSize: "12px", color: COR.textoSecundario, marginBottom: "6px" }}>Status de leitura</div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
              {STATUSES.map((s) => {
                const ativo = aberto.status === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => atualizarStatus(aberto.id, s.key)}
                    style={{ fontSize: "12px", padding: "6px 11px", borderRadius: "20px", border: ativo ? `1px solid ${COR.saugeEscuro}` : `1px solid ${COR.linha}`, background: ativo ? COR.sauge : "#FFFFFF", color: ativo ? "#FFFFFF" : COR.textoPrincipal, cursor: "pointer" }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            {aberto.status === "lendo" && (
              <ProgressoLeitura
                livro={aberto}
                onDefinirMeta={(paginas, meta) => definirMetaLeitura(aberto.id, paginas, meta)}
                onCheckin={(dataISO, pagina, nota) => registrarCheckin(aberto.id, dataISO, pagina, nota)}
              />
            )}

            <button
              type="button"
              onClick={() => setMostrarMaisDetalhesLivro(!mostrarMaisDetalhesLivro)}
              style={{
                width: "100%",
                textAlign: "left",
                fontFamily: SANS,
                fontSize: "12.5px",
                fontWeight: 600,
                color: COR.saugeEscuro,
                background: COR.saugeClaro,
                border: `1px solid ${COR.saugeEscuro}30`,
                borderRadius: "10px",
                padding: "10px 14px",
                cursor: "pointer",
                marginTop: "4px",
                marginBottom: "16px",
              }}
            >
              {mostrarMaisDetalhesLivro ? "▲ Esconder detalhes" : "▼ Mais detalhes (gênero, indicado por, marcadores…)"}
            </button>

            <div style={{ height: "1px", background: COR.linha, margin: "0 0 16px" }} />

            <div
              style={{
                background: aberto.nota && aberto.nota.trim() ? COR.saugeClaro : COR.fundo,
                border: aberto.nota && aberto.nota.trim() ? `2px solid ${COR.saugeEscuro}66` : `1px solid ${COR.linha}`,
                borderRadius: "12px",
                padding: "12px",
              }}
            >
              <div style={{ fontSize: "12.5px", color: aberto.nota && aberto.nota.trim() ? COR.saugeEscuro : COR.textoSecundario, fontWeight: 700, marginBottom: "2px" }}>✏️ Sua anotação (só você vê)</div>
              <div style={{ fontSize: "10.5px", color: aberto.nota && aberto.nota.trim() ? COR.saugeEscuro : COR.textoSecundario, marginBottom: "8px" }}>O texto salva sozinho — clique em "Salvar edição" pra sair</div>
              <textarea
                value={aberto.nota}
                onChange={(e) => atualizarNota(aberto.id, e.target.value)}
                placeholder="Escreva o que quiser sobre esse livro…"
                style={{ width: "100%", boxSizing: "border-box", height: "180px", overflowY: "auto", fontSize: "13.5px", padding: "9px 10px", borderRadius: "8px", border: `1.5px solid ${aberto.nota && aberto.nota.trim() ? COR.saugeEscuro + "55" : COR.linha}`, fontFamily: "inherit", resize: "vertical", color: COR.textoPrincipal, background: "#FFFFFF" }}
              />
            </div>
          </div>
          </div>

          <div style={{ flexShrink: 0, padding: "12px 20px", borderTop: `1px solid ${COR.linha}`, background: COR.fundo }}>
            {!confirmandoRemocaoLivro ? (
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setConfirmandoRemocaoLivro(true)}
                  style={{ flex: 1, fontSize: "12.5px", padding: "9px", borderRadius: "20px", border: `1px solid ${COR.alerta}`, background: "transparent", color: COR.alerta, cursor: "pointer" }}
                >
                  Remover livro da estante
                </button>
                <button
                  onClick={() => setLivroAberto(null)}
                  style={{ flex: 1, fontSize: "13px", fontWeight: 600, padding: "9px", borderRadius: "20px", border: `1.5px solid ${COR.saugeEscuro}`, background: COR.sauge, color: "#FFFFFF", cursor: "pointer" }}
                >
                  Salvar edição
                </button>
              </div>
            ) : (
              <div style={{ background: "#FDF1EE", border: `1px solid ${COR.alerta}`, borderRadius: "10px", padding: "12px" }}>
                <div style={{ fontSize: "12.5px", color: COR.textoPrincipal, marginBottom: "10px" }}>
                  Remover "{aberto.titulo}" tira esse livro da sua estante. Não dá pra desfazer.
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setConfirmandoRemocaoLivro(false)}
                    style={{ flex: 1, fontSize: "12.5px", padding: "9px", borderRadius: "8px", border: `1px solid ${COR.linha}`, background: "#FFFFFF", color: COR.textoPrincipal, cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => removerLivro(aberto.id)}
                    style={{ flex: 1, fontSize: "12.5px", fontWeight: 600, padding: "9px", borderRadius: "8px", border: "none", background: COR.alerta, color: "#FFFFFF", cursor: "pointer" }}
                  >
                    Sim, remover
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

            {mostrarMaisDetalhesLivro && aberto && (
              <div
                onClick={() => setMostrarMaisDetalhesLivro(false)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(62,58,49,0.35)",
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                  padding: "16px 16px 40px",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  overflowY: "auto",
                  zIndex: 1100,
                }}
              >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: COR.cartao,
                  borderRadius: "18px",
                  padding: "20px",
                  width: "100%",
                  maxWidth: "440px",
                  boxSizing: "border-box",
                  fontFamily: SANS,
                  border: `2px solid ${COR.saugeEscuro}55`,
                  boxShadow: `0 8px 28px rgba(62,58,49,0.28), 0 0 0 4px ${COR.saugeEscuro}0D`,
                  margin: "0 auto",
                }}
              >
                <button
                  type="button"
                  onClick={() => setMostrarMaisDetalhesLivro(false)}
                  style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.saugeEscuro, background: "transparent", border: "none", padding: 0, marginBottom: "12px", cursor: "pointer" }}
                >
                  ← Voltar pra edição
                </button>
                <div
                  onClick={() => {
                    if (contagemResenhasPorLivro[aberto.id] > 0) onVerResenhas(aberto.titulo);
                  }}
                  style={{
                    fontSize: "12.5px",
                    color: contagemResenhasPorLivro[aberto.id] > 0 ? COR.melEscuro : COR.textoSecundario,
                    background: contagemResenhasPorLivro[aberto.id] > 0 ? COR.melClaro : "transparent",
                    padding: contagemResenhasPorLivro[aberto.id] > 0 ? "6px 10px" : "0",
                    borderRadius: "8px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: contagemResenhasPorLivro[aberto.id] > 0 ? "pointer" : "default",
                  }}
                >
                  <span>
                    {contagemResenhasPorLivro[aberto.id] > 0
                      ? `✍️ ${contagemResenhasPorLivro[aberto.id]} ${contagemResenhasPorLivro[aberto.id] === 1 ? "resenha escrita" : "resenhas escritas"} pra esse livro`
                      : "Ainda sem resenha escrita pra esse livro"}
                  </span>
                  {contagemResenhasPorLivro[aberto.id] > 0 && <span style={{ textDecoration: "underline" }}>ver</span>}
                </div>

                <div style={{ fontSize: "12px", color: COR.textoSecundario, marginBottom: "6px" }}>Autor</div>
                <input
                  value={aberto.autor || ""}
                  onChange={(e) => atualizarAutor(aberto.id, e.target.value)}
                  placeholder="Nome do autor"
                  style={{ width: "100%", boxSizing: "border-box", fontSize: "13.5px", padding: "9px 10px", borderRadius: "8px", border: `1px solid ${COR.linha}`, marginBottom: "16px", color: COR.textoPrincipal }}
                />

                <div style={{ fontSize: "12px", color: COR.textoSecundario, marginBottom: "6px" }}>Formato</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
                  {FORMATOS.map((f) => {
                    const ativo = aberto.formato === f.key;
                    return (
                      <button
                        key={f.key}
                        onClick={() => atualizarFormato(aberto.id, f.key)}
                        style={{
                          fontSize: "12px",
                          padding: "6px 10px",
                          borderRadius: "20px",
                          border: ativo ? `1px solid ${COR.saugeEscuro}` : `1px solid ${COR.linha}`,
                          background: ativo ? COR.sauge : "#FFFFFF",
                          color: ativo ? "#FFFFFF" : COR.textoPrincipal,
                          cursor: "pointer",
                        }}
                      >
                        {f.icone} {f.label}
                      </button>
                    );
                  })}
                </div>

                {aberto.formato === "fisico" && (
                  <>
                    <div style={{ fontSize: "12px", color: COR.textoSecundario, marginBottom: "6px" }}>Onde está guardado</div>
                    <input
                      value={aberto.localizacao || ""}
                      onChange={(e) => atualizarLocalizacao(aberto.id, e.target.value)}
                      placeholder="ex: estante da sala, emprestado pro Rafael"
                      style={{ width: "100%", boxSizing: "border-box", fontSize: "13.5px", padding: "9px 10px", borderRadius: "8px", border: `1px solid ${COR.linha}`, marginBottom: "16px", color: COR.textoPrincipal }}
                    />
                  </>
                )}

                <div style={{ fontSize: "12px", color: COR.textoSecundario, marginBottom: "6px" }}>Gênero</div>
                <select
                  value={generoModoOutro ? "Outro" : GENEROS.includes(aberto.genero) ? aberto.genero : aberto.genero ? "Outro" : ""}
                  onChange={(e) => {
                    if (e.target.value === "Outro") {
                      setGeneroModoOutro(true);
                    } else {
                      setGeneroModoOutro(false);
                      atualizarGenero(aberto.id, e.target.value);
                    }
                  }}
                  style={{ width: "100%", boxSizing: "border-box", fontSize: "13.5px", padding: "9px 10px", borderRadius: "8px", border: `1px solid ${COR.linha}`, background: "#FFFFFF", marginBottom: "10px", color: COR.textoPrincipal }}
                >
                  <option value="">Gênero (opcional)</option>
                  {GENEROS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                  <option value="Outro">Outro…</option>
                </select>
                {(generoModoOutro || (aberto.genero && !GENEROS.includes(aberto.genero))) && (
                  <input
                    value={aberto.genero || ""}
                    onChange={(e) => atualizarGenero(aberto.id, e.target.value)}
                    placeholder="Digite o gênero"
                    style={{ width: "100%", boxSizing: "border-box", fontSize: "13.5px", padding: "9px 10px", borderRadius: "8px", border: `1px solid ${COR.linha}`, marginBottom: "16px", color: COR.textoPrincipal }}
                  />
                )}

                <div
                  onClick={() => atualizarAindaVouComprar(aberto.id, !aberto.aindaVouComprar)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: "10px", background: aberto.aindaVouComprar ? COR.melClaro : COR.saugeClaro, cursor: "pointer", marginBottom: "16px" }}
                >
                  <div style={{ fontSize: "13px", fontWeight: 600, color: aberto.aindaVouComprar ? COR.melEscuro : COR.saugeEscuro }}>
                    {aberto.aindaVouComprar ? "🛒 Ainda vou comprar" : "✅ Já tenho esse livro"}
                  </div>
                  <div style={{ width: "40px", height: "22px", borderRadius: "20px", background: aberto.aindaVouComprar ? COR.mel : COR.linha, position: "relative", flexShrink: 0 }}>
                    <div style={{ position: "absolute", top: "2px", left: aberto.aindaVouComprar ? "20px" : "2px", width: "18px", height: "18px", borderRadius: "50%", background: "#FFFFFF" }} />
                  </div>
                </div>

                <div style={{ fontSize: "12px", color: COR.textoSecundario, marginBottom: "6px" }}>Indicado por</div>
                <input
                  value={aberto.indicadoPor || ""}
                  onChange={(e) => atualizarIndicadoPor(aberto.id, e.target.value)}
                  placeholder="ex: minha irmã, um vídeo que vi"
                  style={{ width: "100%", boxSizing: "border-box", fontSize: "13.5px", padding: "9px 10px", borderRadius: "8px", border: `1px solid ${COR.linha}`, marginBottom: "16px", color: COR.textoPrincipal }}
                />

                <div ref={marcadoresEdicaoRef}>
                  <div style={{ fontSize: "12px", color: COR.textoSecundario, marginBottom: "6px" }}>Marcadores</div>
                  <button
                    type="button"
                    onClick={() => setMostrarMarcadoresEdicao(!mostrarMarcadoresEdicao)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontFamily: SANS,
                      fontSize: "12.5px",
                      fontWeight: 600,
                      padding: "6px 12px",
                      borderRadius: "20px",
                      border: `1px solid ${COR.saugeEscuro}55`,
                      background: mostrarMarcadoresEdicao ? COR.sauge : "#FFFFFF",
                      color: mostrarMarcadoresEdicao ? "#FFFFFF" : COR.textoPrincipal,
                      cursor: "pointer",
                      marginBottom: "8px",
                    }}
                  >
                    🏷️ Marcadores {(aberto.marcadorIds || []).length > 0 ? `(${(aberto.marcadorIds || []).length})` : ""} {mostrarMarcadoresEdicao ? "▲" : "▼"}
                  </button>

                  {mostrarMarcadoresEdicao && (
                    <div style={{ marginBottom: "8px", padding: "10px", borderRadius: "10px", border: `1px solid ${COR.linha}`, background: COR.cartao }}>
                      {marcadores.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                          {marcadores.map((m) => {
                            const ativo = (aberto.marcadorIds || []).includes(m.id);
                            return (
                              <span
                                key={m.id}
                                onClick={() => {
                                  alternarMarcadorNoLivro(aberto.id, m.id);
                                  setMostrarMarcadoresEdicao(false);
                                }}
                                style={{
                                  fontSize: "12px",
                                  padding: "5px 12px",
                                  borderRadius: "20px",
                                  cursor: "pointer",
                                  background: ativo ? m.cor : "#FFFFFF",
                                  color: ativo ? "#FFFFFF" : COR.textoSecundario,
                                  border: ativo ? `1px solid ${m.cor}` : `1px solid ${COR.linha}`,
                                }}
                              >
                                {m.nome}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <div style={{ fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "6px" }}>Criar um novo marcador</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <input
                          value={novoNomeMarcador}
                          onChange={(e) => setNovoNomeMarcador(e.target.value)}
                          placeholder="Nome do novo marcador"
                          style={{ fontSize: "13px", padding: "8px 10px", borderRadius: "8px", border: `1px solid ${COR.linha}` }}
                        />
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                          {CORES_MARCADOR.map((c) => (
                            <div
                              key={c}
                              onClick={() => setNovaCorMarcador(c)}
                              style={{
                                width: "22px",
                                height: "22px",
                                borderRadius: "50%",
                                background: c,
                                cursor: "pointer",
                                border: novaCorMarcador === c ? `2px solid ${COR.textoPrincipal}` : "2px solid transparent",
                                boxSizing: "border-box",
                              }}
                            />
                          ))}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              const nome = novoNomeMarcador.trim();
                              if (!nome) return;
                              const marcador = { id: uid(), nome, cor: novaCorMarcador };
                              salvarMarcadores([...marcadoresRef.current, marcador]);
                              alternarMarcadorNoLivro(aberto.id, marcador.id);
                              setNovoNomeMarcador("");
                              setNovaCorMarcador(CORES_MARCADOR[0]);
                              setMostrarMarcadoresEdicao(false);
                            }}
                            style={{ marginLeft: "auto", fontSize: "11.5px", fontWeight: 600, padding: "5px 12px", borderRadius: "20px", border: `1px solid ${COR.saugeEscuro}`, background: "transparent", color: COR.saugeEscuro, cursor: "pointer" }}
                          >
                            Criar marcador
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setMostrarMaisDetalhesLivro(false)}
                  style={{ width: "100%", fontSize: "13px", fontWeight: 600, padding: "10px", borderRadius: "20px", border: `1.5px solid ${COR.saugeEscuro}`, background: COR.sauge, color: "#FFFFFF", cursor: "pointer", marginTop: "16px" }}
                >
                  Salvar
                </button>
              </div>
              </div>
            )}
      </>
    );
  }


  // ---------- VISTA: ADICIONAR LIVRO (dedicada, com cor própria) ----------
  if (vista === "adicionarLivro") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ padding: "18px 20px 14px" }}>
            <button
              onClick={cancelarAdicionarLivro}
              style={{ fontFamily: SANS, fontSize: "12.5px", color: escurecer(COR_NOVO_LIVRO, 0.35), background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
            >
              ← toda a estante
            </button>
          </div>

          <div style={{ padding: "0 20px 20px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: 600, margin: "0 0 4px", fontFamily: SERIF }}>🎉 Mais livros chegando!</h1>
            <div style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.textoSecundario, marginBottom: "18px" }}>
              Conta pra gente o que você quer catalogar.
            </div>

            <form onSubmit={adicionarLivro} style={{ display: "flex", flexDirection: "column", gap: "8px", fontFamily: SANS }}>
              <input
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                placeholder="Título do livro"
                autoFocus
                style={{ fontSize: "15px", padding: "10px 12px", borderRadius: "10px", border: `1.5px solid ${COR_NOVO_LIVRO}40` }}
              />
              <input
                value={novoAutor}
                onChange={(e) => setNovoAutor(e.target.value)}
                placeholder="Autor (opcional)"
                style={{ fontSize: "14px", padding: "10px 12px", borderRadius: "10px", border: `1.5px solid ${COR_NOVO_LIVRO}40` }}
              />

              <div>
                <div style={{ fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "6px" }}>Formato</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {FORMATOS.map((f) => {
                    const ativo = novoFormato === f.key;
                    return (
                      <button
                        type="button"
                        key={f.key}
                        onClick={() => setNovoFormato(f.key)}
                        style={{
                          fontSize: "12px",
                          padding: "6px 10px",
                          borderRadius: "20px",
                          border: ativo ? `1px solid ${escurecer(COR_NOVO_LIVRO, 0.3)}` : `1px solid ${COR.linha}`,
                          background: ativo ? COR_NOVO_LIVRO : "#FFFFFF",
                          color: ativo ? "#FFFFFF" : COR.textoPrincipal,
                          cursor: "pointer",
                        }}
                      >
                        {f.icone} {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {novoFormato === "fisico" && (
                <input
                  value={novaLocalizacao}
                  onChange={(e) => setNovaLocalizacao(e.target.value)}
                  placeholder="Onde está guardado? (ex: estante da sala, emprestado pro Rafael)"
                  style={{ fontSize: "14px", padding: "10px 12px", borderRadius: "10px", border: `1.5px solid ${COR_NOVO_LIVRO}40` }}
                />
              )}

              <select
                value={novoGenero}
                onChange={(e) => setNovoGenero(e.target.value)}
                style={{ fontSize: "14px", padding: "10px 12px", borderRadius: "10px", border: `1.5px solid ${COR_NOVO_LIVRO}40`, background: "#FFFFFF", color: novoGenero ? COR.textoPrincipal : COR.textoSecundario }}
              >
                <option value="">Gênero (opcional)</option>
                {GENEROS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
                <option value="Outro">Outro…</option>
              </select>

              {novoGenero === "Outro" && (
                <input
                  value={novoGeneroCustom}
                  onChange={(e) => setNovoGeneroCustom(e.target.value)}
                  placeholder="Digite o gênero"
                  style={{ fontSize: "14px", padding: "10px 12px", borderRadius: "10px", border: `1.5px solid ${COR_NOVO_LIVRO}40` }}
                />
              )}

              <select
                value={novoStatus}
                onChange={(e) => setNovoStatus(e.target.value)}
                style={{ fontSize: "14px", padding: "10px 12px", borderRadius: "10px", border: `1.5px solid ${COR_NOVO_LIVRO}40`, background: "#FFFFFF" }}
              >
                {STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>

              <div
                onClick={() => setNovoAindaVouComprar(!novoAindaVouComprar)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: "10px", background: clarear(COR_NOVO_LIVRO), cursor: "pointer" }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: escurecer(COR_NOVO_LIVRO, 0.3) }}>
                    {novoAindaVouComprar ? "🛒 Ainda vou comprar" : "✅ Já tenho esse livro"}
                  </div>
                </div>
                <div style={{ width: "40px", height: "22px", borderRadius: "20px", background: novoAindaVouComprar ? COR_NOVO_LIVRO : COR.linha, position: "relative", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: "2px", left: novoAindaVouComprar ? "20px" : "2px", width: "18px", height: "18px", borderRadius: "50%", background: "#FFFFFF" }} />
                </div>
              </div>

              <input
                value={novoIndicadoPor}
                onChange={(e) => setNovoIndicadoPor(e.target.value)}
                placeholder="Indicado por (opcional)"
                style={{ fontSize: "14px", padding: "10px 12px", borderRadius: "10px", border: `1.5px solid ${COR_NOVO_LIVRO}40` }}
              />

              <div ref={marcadoresAdicionarRef}>
                <button
                  type="button"
                  onClick={() => setMostrarMarcadoresAdicionar(!mostrarMarcadoresAdicionar)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontFamily: SANS,
                    fontSize: "12.5px",
                    fontWeight: 600,
                    padding: "6px 12px",
                    borderRadius: "20px",
                    border: `1px solid ${COR_NOVO_LIVRO}55`,
                    background: mostrarMarcadoresAdicionar ? COR_NOVO_LIVRO : "#FFFFFF",
                    color: mostrarMarcadoresAdicionar ? "#FFFFFF" : COR.textoPrincipal,
                    cursor: "pointer",
                  }}
                >
                  🏷️ Marcadores {novoMarcadorIds.length > 0 ? `(${novoMarcadorIds.length})` : ""} {mostrarMarcadoresAdicionar ? "▲" : "▼"}
                </button>

                {mostrarMarcadoresAdicionar && (
                  <div style={{ marginTop: "8px", padding: "10px", borderRadius: "10px", border: `1px solid ${COR.linha}`, background: COR.cartao }}>
                    {marcadores.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                        {marcadores.map((m) => {
                          const ativo = novoMarcadorIds.includes(m.id);
                          return (
                            <span
                              key={m.id}
                              onClick={() => {
                                setNovoMarcadorIds(ativo ? novoMarcadorIds.filter((id) => id !== m.id) : [...novoMarcadorIds, m.id]);
                                setMostrarMarcadoresAdicionar(false);
                              }}
                              style={{
                                fontSize: "12px",
                                padding: "5px 12px",
                                borderRadius: "20px",
                                cursor: "pointer",
                                background: ativo ? m.cor : "#FFFFFF",
                                color: ativo ? "#FFFFFF" : COR.textoSecundario,
                                border: ativo ? `1px solid ${m.cor}` : `1px solid ${COR.linha}`,
                              }}
                            >
                              {m.nome}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "6px" }}>Criar um novo marcador</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <input
                        value={novoNomeMarcador}
                        onChange={(e) => setNovoNomeMarcador(e.target.value)}
                        placeholder="Nome do novo marcador"
                        style={{ fontSize: "13px", padding: "8px 10px", borderRadius: "8px", border: `1px solid ${COR.linha}` }}
                      />
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                        {CORES_MARCADOR.map((c) => (
                          <div
                            key={c}
                            onClick={() => setNovaCorMarcador(c)}
                            style={{
                              width: "22px",
                              height: "22px",
                              borderRadius: "50%",
                              background: c,
                              cursor: "pointer",
                              border: novaCorMarcador === c ? `2px solid ${COR.textoPrincipal}` : "2px solid transparent",
                              boxSizing: "border-box",
                            }}
                          />
                        ))}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            const nome = novoNomeMarcador.trim();
                            if (!nome) return;
                            const marcador = { id: uid(), nome, cor: novaCorMarcador };
                            salvarMarcadores([...marcadoresRef.current, marcador]);
                            setNovoMarcadorIds([...novoMarcadorIds, marcador.id]);
                            setNovoNomeMarcador("");
                            setNovaCorMarcador(CORES_MARCADOR[0]);
                            setMostrarMarcadoresAdicionar(false);
                          }}
                          style={{ marginLeft: "auto", fontSize: "11.5px", fontWeight: 600, padding: "5px 12px", borderRadius: "20px", border: `1px solid ${COR_NOVO_LIVRO}`, background: "transparent", color: COR_NOVO_LIVRO, cursor: "pointer" }}
                        >
                          Criar marcador
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: "12px", color: COR.textoSecundario, marginBottom: "6px" }}>Sua anotação (opcional, só você vê)</div>
                <textarea
                  value={novaNotaLivro}
                  onChange={(e) => setNovaNotaLivro(e.target.value)}
                  placeholder="Escreva o que quiser sobre esse livro…"
                  rows={3}
                  style={{ width: "100%", boxSizing: "border-box", resize: "vertical", fontSize: "13.5px", padding: "9px 10px", borderRadius: "8px", border: `1.5px solid ${COR_NOVO_LIVRO}40`, fontFamily: "inherit", color: COR.textoPrincipal }}
                />
              </div>

              {erroForm && <div style={{ fontSize: "12.5px", color: COR.alerta }}>{erroForm}</div>}

              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={cancelarAdicionarLivro}
                  style={{ flex: 1, fontSize: "13.5px", padding: "10px", borderRadius: "8px", border: `1px solid ${COR.linha}`, background: "#FFFFFF", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, fontSize: "13.5px", fontWeight: 600, padding: "10px", borderRadius: "8px", border: "none", background: COR_NOVO_LIVRO, color: "#FFFFFF", cursor: "pointer" }}
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
    <div style={{ padding: "22px 20px 16px", borderBottom: `1px solid ${COR.linha}`, flexShrink: 0 }}>
        <div
          style={{
            fontFamily: SANS,
            fontSize: "11px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: COR.textoSecundario,
            marginBottom: "4px",
          }}
        >
          Minha Estante · privado
        </div>
        <h1 style={{ fontSize: "23px", fontWeight: 600, margin: "0 0 14px" }}>Seus livros</h1>
        {vista === "lista" && (
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "14px",
              color: COR.textoSecundario,
              pointerEvents: "none",
            }}
          >
            ⌕
          </span>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título ou autor"
            style={{
              width: "100%",
              boxSizing: "border-box",
              fontFamily: SANS,
              fontSize: "14px",
              padding: "10px 12px 10px 30px",
              borderRadius: "10px",
              border: `1px solid ${COR.linha}`,
              background: COR.cartao,
              outline: "none",
              color: COR.textoPrincipal,
            }}
          />
          {busca && (
            <button
              onClick={() => setBusca("")}
              aria-label="Limpar busca"
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                color: COR.textoSecundario,
                fontSize: "14px",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              ×
            </button>
          )}
        </div>
        )}
      </div>

      <div style={{ padding: "0 16px", display: "flex", gap: "6px", flexShrink: 0 }}>
        <button
          onClick={() => setVista("lista")}
          style={{ flex: 1, fontFamily: SANS, fontSize: "12.5px", fontWeight: vista === "lista" ? 700 : 500, padding: "8px", borderRadius: "8px", border: vista === "lista" ? `1px solid ${COR.saugeEscuro}` : `1px solid ${COR.linha}`, background: vista === "lista" ? COR.sauge : "#FFFFFF", color: vista === "lista" ? "#FFFFFF" : COR.textoPrincipal, cursor: "pointer" }}
        >
          📋 Lista
        </button>
        <button
          onClick={() => setVista("painel")}
          style={{ flex: 1, fontFamily: SANS, fontSize: "12.5px", fontWeight: vista === "painel" ? 700 : 500, padding: "8px", borderRadius: "8px", border: vista === "painel" ? `1px solid ${COR.saugeEscuro}` : `1px solid ${COR.linha}`, background: vista === "painel" ? COR.sauge : "#FFFFFF", color: vista === "painel" ? "#FFFFFF" : COR.textoPrincipal, cursor: "pointer" }}
        >
          📊 Painel
        </button>
      </div>

      {vista === "lista" && (
      <div style={{ flexShrink: 0 }}>
      <div style={{ display: "flex", gap: "6px", padding: "12px 16px 4px", overflowX: "auto", fontFamily: SANS, opacity: buscando ? 0.45 : 1 }}>
        {[{ key: "todos", label: "Todos" }, ...STATUSES].map((f) => {
          const ativo = filtro === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              disabled={buscando}
              style={{
                flexShrink: 0,
                fontSize: "12.5px",
                padding: "6px 12px",
                borderRadius: "20px",
                border: ativo ? `1px solid ${COR.saugeEscuro}` : `1px solid ${COR.linha}`,
                background: ativo ? COR.sauge : COR.cartao,
                color: ativo ? "#FFFFFF" : COR.textoPrincipal,
                cursor: buscando ? "default" : "pointer",
              }}
            >
              {f.label} ({f.key === "todos" ? contagem.todos : contagem[f.key] || 0})
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "6px", padding: "0 16px 12px", overflowX: "auto", fontFamily: SANS }}>
        {[{ key: "todos", label: "Todos os formatos", icone: "" }, ...FORMATOS].map((f) => {
          const ativo = filtroFormato === f.key;
          const contador = f.key === "todos" ? contagemFormato.todos : contagemFormato[f.key] || 0;
          return (
            <button
              key={f.key}
              onClick={() => setFiltroFormato(ativo ? "todos" : f.key)}
              style={{
                flexShrink: 0,
                fontSize: "12px",
                padding: "5px 11px",
                borderRadius: "20px",
                border: ativo ? `1px solid ${COR.melEscuro}` : `1px solid ${COR.linha}`,
                background: ativo ? COR.mel : "transparent",
                color: ativo ? "#FFFFFF" : COR.textoSecundario,
                cursor: "pointer",
              }}
            >
              {f.icone ? `${f.icone} ` : ""}{f.label} ({contador})
            </button>
          );
        })}
      </div>

      <div style={{ padding: "0 16px 12px", display: "flex", gap: "6px", alignItems: "flex-start", flexWrap: "wrap" }}>
        {livroOrigemMarcador && (
          <button
            onClick={() => {
              const id = livroOrigemMarcador;
              setLivroOrigemMarcador(null);
              setGerenciandoMarcadores(false);
              setConfirmandoRemocaoLivro(false);
              setMostrarMaisDetalhesLivro(true);
              setLivroAberto(id);
            }}
            style={{ width: "100%", fontFamily: SANS, fontSize: "13px", fontWeight: 600, padding: "9px", borderRadius: "10px", border: "none", background: COR.sauge, color: "#FFFFFF", cursor: "pointer" }}
          >
            ← Retomar edição do livro
          </button>
        )}
        <button
          ref={botaoMarcadoresRef}
          onClick={() => {
            setGerenciandoMarcadores(!gerenciandoMarcadores);
            setMarcadorParaConfirmar(null);
            setVerMarcadoresCriados(false);
          }}
          style={{ fontFamily: SANS, fontSize: "12px", padding: "5px 11px", borderRadius: "20px", border: `1px dashed ${COR.linha}`, background: "transparent", color: COR.textoSecundario, cursor: "pointer" }}
        >
          🏷️ Marcadores {gerenciandoMarcadores ? "▲" : "▼"}
        </button>
        {(filtro !== "todos" || filtroFormato !== "todos") && (
          <button
            onClick={() => {
              setFiltro("todos");
              setFiltroFormato("todos");
            }}
            style={{ fontFamily: SANS, fontSize: "12px", padding: "5px 11px", borderRadius: "20px", border: `1px solid ${COR.alerta}`, background: "#FDF1EE", color: COR.alerta, cursor: "pointer" }}
          >
            ✕ Limpar filtros ativos
          </button>
        )}
        {gerenciandoMarcadores && (
          <div ref={painelMarcadoresRef} style={{ marginTop: "10px", width: "100%", background: COR.cartao, border: `1.5px solid ${COR.saugeEscuro}40`, boxShadow: `0 0 0 3px ${COR.saugeEscuro}10`, borderRadius: "12px", padding: "12px", fontFamily: SANS }}>
            {marcadores.length > 0 && (
              <button
                type="button"
                onClick={() => setVerMarcadoresCriados(!verMarcadoresCriados)}
                style={{ fontFamily: SANS, fontSize: "11.5px", color: COR.saugeEscuro, background: "transparent", border: "none", padding: 0, marginBottom: "10px", cursor: "pointer", display: "block" }}
              >
                👁️ {verMarcadoresCriados ? "Esconder" : "Ver"} marcadores criados ({marcadores.length}) {verMarcadoresCriados ? "▲" : "▼"}
              </button>
            )}
            {marcadores.length > 0 && verMarcadoresCriados && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                {marcadores.map((m) => (
                  <span
                    key={m.id}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "4px 10px", borderRadius: "20px", background: m.cor, color: "#FFFFFF" }}
                  >
                    {m.nome}
                    <span onClick={() => setMarcadorParaConfirmar(m.id)} style={{ cursor: "pointer", fontWeight: 700, padding: "4px 6px", marginRight: "-4px", marginLeft: "2px" }}>
                      ×
                    </span>
                  </span>
                ))}
              </div>
            )}
            {marcadorParaConfirmar && (
              <div style={{ background: "#FDF1EE", border: `1px solid ${COR.alerta}`, borderRadius: "10px", padding: "10px", marginBottom: "12px" }}>
                <div style={{ fontSize: "12px", color: COR.textoPrincipal, marginBottom: "8px" }}>
                  Remover "{marcadores.find((m) => m.id === marcadorParaConfirmar)?.nome}" da sua Estante. Não dá pra desfazer.
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" onClick={() => setMarcadorParaConfirmar(null)} style={{ flex: 1, fontSize: "12px", padding: "7px", borderRadius: "8px", border: `1px solid ${COR.linha}`, background: "#FFFFFF", color: COR.textoPrincipal, cursor: "pointer" }}>
                    Cancelar
                  </button>
                  <button type="button" onClick={() => removerMarcador(marcadorParaConfirmar)} style={{ flex: 1, fontSize: "12px", fontWeight: 600, padding: "7px", borderRadius: "8px", border: "none", background: COR.alerta, color: "#FFFFFF", cursor: "pointer" }}>
                    Sim, remover
                  </button>
                </div>
              </div>
            )}
            <form onSubmit={criarMarcador} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <input
                value={novoNomeMarcador}
                onChange={(e) => setNovoNomeMarcador(e.target.value)}
                placeholder="Nome do novo marcador (ex: Reler algum dia)"
                style={{ fontSize: "13px", padding: "8px 10px", borderRadius: "8px", border: `1px solid ${COR.linha}` }}
              />
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                {CORES_MARCADOR.map((c) => (
                  <div
                    key={c}
                    onClick={() => setNovaCorMarcador(c)}
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: c,
                      cursor: "pointer",
                      border: novaCorMarcador === c ? `2px solid ${COR.textoPrincipal}` : "2px solid transparent",
                      boxSizing: "border-box",
                    }}
                  />
                ))}
                <button type="submit" style={{ marginLeft: "auto", fontSize: "11.5px", fontWeight: 600, padding: "5px 12px", borderRadius: "20px", border: `1px solid ${COR.saugeEscuro}`, background: "transparent", color: COR.saugeEscuro, cursor: "pointer" }}>
                  Criar marcador
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
      {buscando && (
        <div style={{ margin: "-4px 16px 8px", fontSize: "12px", color: COR.textoSecundario, fontFamily: SANS }}>
          {livrosFiltrados.length === 1 ? "1 resultado" : `${livrosFiltrados.length} resultados`} para "{busca}", em todos os status
          {filtroFormato !== "todos" ? ` · só ${formatoDe(filtroFormato).label.toLowerCase()}` : ""}
        </div>
      )}

      {pendente && (
        <div
          style={{
            margin: "0 16px 10px",
            padding: "8px 12px",
            borderRadius: "10px",
            background: COR.saugeClaro,
            fontFamily: SANS,
            fontSize: "11.5px",
            color: COR.saugeEscuro,
          }}
        >
          Modo de teste: essa versão ainda não guarda os dados de forma permanente.
        </div>
      )}

      <div style={{ padding: "8px 16px 10px", borderTop: `1px solid ${COR.linha}`, marginTop: "4px" }}>
        <div style={{ fontFamily: SERIF, fontSize: "15px", fontWeight: 700, color: COR.textoPrincipal, marginBottom: "2px" }}>
          📖 Cardápio literário
        </div>
        {loaded && livrosFiltrados.length > 0 && (
          <div style={{ fontFamily: SANS, fontSize: "12px", color: COR.textoPrincipal }}>
            Clique no livro pra ver detalhes, mudar status ou fazer anotações 💡
          </div>
        )}
      </div>
      </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      {vista === "painel" ? (
        <PainelEstante livros={livros} />
      ) : (
      <div style={{ padding: "0 16px 16px", minHeight: "180px" }}>
        {!loaded ? (
          <div style={{ fontFamily: SANS, fontSize: "13px", color: COR.textoSecundario, padding: "30px 0", textAlign: "center" }}>
            Carregando sua estante…
          </div>
        ) : livrosFiltrados.length === 0 ? (
          <div style={{ fontFamily: SANS, fontSize: "13.5px", color: COR.textoSecundario, padding: "30px 10px", textAlign: "center", lineHeight: 1.6 }}>
            {livros.length === 0
              ? "Sua estante está vazia. Adicione o primeiro livro abaixo."
              : buscando
              ? `Nenhum livro encontrado para "${busca}".`
              : filtroFormato !== "todos"
              ? `Nenhum livro em "${formatoDe(filtroFormato).label}" com esse status.`
              : "Nenhum livro com esse status."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {livrosFiltrados.map((l) => {
              const fmt = formatoDe(l.formato);
              const selecionado = l.id === livroAberto;
              return (
                <div
                  key={l.id}
                  onClick={() => {
                    setLivroAberto(l.id);
                    setConfirmandoRemocaoLivro(false);
                    setMostrarMaisDetalhesLivro(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 12px",
                    background: selecionado ? COR.saugeClaro : COR.cartao,
                    border: selecionado ? `1.5px solid ${COR.saugeEscuro}` : `1px solid ${COR.linha}`,
                    borderRadius: "12px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ width: "34px", height: "46px", borderRadius: "5px", background: COR.saugeClaro, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
                    {fmt.icone}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14.5px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {l.titulo}
                    </div>
                    <div style={{ fontFamily: SANS, fontSize: "12px", color: COR.textoSecundario, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {l.autor ? l.autor : "Autor não informado"}
                    </div>
                    {filtroFormato === "fisico" && (
                      <div style={{ fontFamily: SANS, fontSize: "11.5px", color: COR.melEscuro, marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        📍 {l.localizacao ? l.localizacao : "Localização não informada"}
                      </div>
                    )}
                    {l.marcadorIds && l.marcadorIds.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                        {l.marcadorIds.map((mid) => {
                          const m = marcadores.find((mm) => mm.id === mid);
                          if (!m) return null;
                          return (
                            <span key={mid} style={{ fontFamily: SANS, fontSize: "9.5px", padding: "2px 7px", borderRadius: "20px", background: m.cor, color: "#FFFFFF" }}>
                              {m.nome}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                    <div style={{ fontFamily: SANS, fontSize: "11px", padding: "4px 9px", borderRadius: "20px", background: (CORES_STATUS[l.status] || CORES_STATUS.quero_ler).fundo, color: (CORES_STATUS[l.status] || CORES_STATUS.quero_ler).texto }}>
                      {STATUSES.find((s) => s.key === l.status)?.label || l.status}
                    </div>
                    {contagemResenhasPorLivro[l.id] > 0 && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onVerResenhas(l.titulo);
                        }}
                        style={{ fontFamily: SANS, fontSize: "10.5px", color: COR.melEscuro, display: "flex", alignItems: "center", gap: "3px", textDecoration: "underline", cursor: "pointer" }}
                      >
                        ✍️ {contagemResenhasPorLivro[l.id]} {contagemResenhasPorLivro[l.id] === 1 ? "resenha" : "resenhas"}
                      </div>
                    )}
                    {l.nota && l.nota.trim() && (
                      <div title="Você já escreveu uma anotação nesse livro" style={{ fontFamily: SANS, fontSize: "10.5px", color: COR.saugeEscuro, display: "flex", alignItems: "center", gap: "3px" }}>
                        📝 anotação
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}
      </div>



    {vista === "lista" && (
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${COR.linha}`, background: COR.fundo, flexShrink: 0 }}>
        <button
          onClick={abrirAdicionarLivro}
          style={{ width: "100%", fontFamily: SANS, fontSize: "14px", fontWeight: 600, padding: "12px", borderRadius: "10px", border: "none", background: COR.sauge, color: "#FFFFFF", cursor: "pointer" }}
        >
          + Adicionar livro
        </button>
      </div>
    )}
    </div>
  );
}

// ======================= ABA 2: RESENHAS (privado ou público) =======================


function TelaResenhas({ estado, livros, pendente, buscaPedida }) {
  const { dados: resenhas, dadosRef: resenhasRef, loaded, salvar } = estado;

  // modo controla o que aparece embaixo da lista e se o modal está aberto:
  // 'fechado' | 'criacao' (form inline pra nova resenha) |
  // 'leitura' (modal só de leitura) | 'edicao' (modal com o form editável)
  const [modo, setModo] = useState("fechado");
  const [resenhaSelecionadaId, setResenhaSelecionadaId] = useState(null);
  const [busca, setBusca] = useState("");

  const [livroId, setLivroId] = useState("");
  const [nota, setNota] = useState(4);
  const [texto, setTexto] = useState("");
  const [sobreAutor, setSobreAutor] = useState("");
  const [publica, setPublica] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [confirmandoRemocaoResenha, setConfirmandoRemocaoResenha] = useState(false);

  // quando a Estante pede pra ver as resenhas de um livro específico, a
  // busca é preenchida sozinha com o título dele
  useEffect(() => {
    if (buscaPedida) setBusca(buscaPedida.texto);
  }, [buscaPedida]);

  function limparCampos() {
    setLivroId("");
    setNota(4);
    setTexto("");
    setSobreAutor("");
    setPublica(false);
    setErroForm("");
  }

  function fecharTudo() {
    setModo("fechado");
    setResenhaSelecionadaId(null);
    setConfirmandoRemocaoResenha(false);
    limparCampos();
  }

  function abrirCriacao() {
    limparCampos();
    setResenhaSelecionadaId(null);
    setModo("criacao");
  }

  function abrirLeitura(r) {
    setResenhaSelecionadaId(r.id);
    setConfirmandoRemocaoResenha(false);
    setModo("leitura");
  }

  function abrirEdicao(r) {
    setResenhaSelecionadaId(r.id);
    setLivroId(r.livroId);
    setNota(r.nota);
    setTexto(r.texto);
    setSobreAutor(r.sobreAutor || "");
    setPublica(r.publica);
    setErroForm("");
    setConfirmandoRemocaoResenha(false);
    setModo("edicao");
  }

  function salvarResenha(e) {
    e.preventDefault();
    if (!livroId) {
      setErroForm("Escolha um livro da sua estante.");
      return;
    }
    if (!texto.trim()) {
      setErroForm("Escreva algo sobre o livro antes de salvar.");
      return;
    }
    const livro = livros.find((l) => l.id === livroId);
    const agora = new Date().toISOString();

    if (modo === "edicao" && resenhaSelecionadaId) {
      salvar(
        resenhasRef.current.map((r) =>
          r.id === resenhaSelecionadaId
            ? { ...r, livroId, livroTitulo: livro ? livro.titulo : r.livroTitulo, nota, texto: texto.trim(), sobreAutor: sobreAutor.trim(), publica, atualizadoEm: agora }
            : r
        )
      );
    } else {
      const nova = {
        id: uid(),
        livroId,
        livroTitulo: livro ? livro.titulo : "Livro removido",
        nota,
        texto: texto.trim(),
        sobreAutor: sobreAutor.trim(),
        publica,
        criadoEm: agora,
        atualizadoEm: agora,
      };
      salvar([nova, ...resenhasRef.current]);
    }
    fecharTudo();
  }

  function removerResenha(id) {
    salvar(resenhasRef.current.filter((r) => r.id !== id));
    fecharTudo();
  }

  const termoBusca = normalizar(busca);
  const buscando = termoBusca.length > 0;

  const resenhasOrdenadas = useMemo(() => {
    const lista = [...resenhas].sort((a, b) => new Date(b.atualizadoEm) - new Date(a.atualizadoEm));
    if (!buscando) return lista;
    return lista.filter(
      (r) => normalizar(r.livroTitulo).includes(termoBusca) || normalizar(r.texto).includes(termoBusca)
    );
  }, [resenhas, buscando, termoBusca]);

  const resenhaSelecionada = resenhas.find((r) => r.id === resenhaSelecionadaId) || null;
  const modalAberto = (modo === "leitura" || modo === "edicao") && resenhaSelecionada;

  const alturaCaixaTexto = "230px";
  const alturaCaixaAutor = "130px";

  // leitura e edição de uma resenha já existente — tela cheia própria (não
  // mais um modal com position:fixed), pra ocupar o mesmo espaço das outras
  // abas e nunca ficar atrás da barra de navegação
  if (modalAberto) {
    return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ flexShrink: 0, padding: "20px 20px 10px", fontFamily: SANS }}>
            <button
              onClick={fecharTudo}
              style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.melEscuro, background: "transparent", border: "none", padding: 0, marginBottom: "10px", cursor: "pointer" }}
            >
              ← Minhas resenhas
            </button>
            <div style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: COR.melEscuro, fontWeight: 700 }}>
              💭 {modo === "leitura" ? "Minha opinião" : "Editando minha opinião"}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ padding: "0 20px 20px", fontFamily: SANS }}>

            {modo === "leitura" ? (
              <>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "6px" }}>
                  <div style={{ fontFamily: SERIF, fontSize: "18px", fontWeight: 700, color: COR.textoPrincipal, minWidth: 0 }}>
                    {resenhaSelecionada.livroTitulo}
                  </div>
                  <span style={{ flexShrink: 0, fontSize: "10.5px", padding: "3px 9px", borderRadius: "20px", background: resenhaSelecionada.publica ? COR.melClaro : COR.saugeClaro, color: resenhaSelecionada.publica ? COR.melEscuro : COR.saugeEscuro }}>
                    {resenhaSelecionada.publica ? "Pública" : "Privada"}
                  </span>
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <Estrelas valor={resenhaSelecionada.nota} tamanho={16} />
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    color: COR.textoPrincipal,
                    lineHeight: 1.65,
                    whiteSpace: "pre-wrap",
                    height: alturaCaixaTexto,
                    overflowY: "auto",
                    padding: "2px 2px 2px 0",
                    borderLeft: `3px solid ${COR.melClaro}`,
                    paddingLeft: "12px",
                    marginBottom: "12px",
                    boxSizing: "border-box",
                    cursor: "default",
                  }}
                >
                  {resenhaSelecionada.texto}
                </div>

                {resenhaSelecionada.sobreAutor && (
                  <>
                    <div style={{ fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "4px" }}>Sobre o autor</div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: COR.textoPrincipal,
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                        padding: "10px 12px",
                        background: COR.melClaro,
                        borderRadius: "8px",
                        marginBottom: "12px",
                        height: alturaCaixaAutor,
                        overflowY: "auto",
                        boxSizing: "border-box",
                      }}
                    >
                      {resenhaSelecionada.sobreAutor}
                    </div>
                  </>
                )}

                <div style={{ fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "16px" }}>
                  Atualizada em {formatarData(resenhaSelecionada.atualizadoEm)}
                </div>
              </>
            ) : (
              <form onSubmit={salvarResenha} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: COR.textoSecundario, marginBottom: "6px" }}>Livro</div>
                  <select value={livroId} onChange={(e) => setLivroId(e.target.value)} style={{ width: "100%", boxSizing: "border-box", fontSize: "14px", padding: "9px 10px", borderRadius: "8px", border: `1.5px solid ${COR.melEscuro}40`, background: "#FFFFFF", color: COR.textoPrincipal }}>
                    <option value="">Selecione um livro da sua estante</option>
                    {livros.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.titulo}
                        {l.autor ? ` — ${l.autor}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: COR.textoSecundario, marginBottom: "6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Sua nota</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Estrelas valor={nota} tamanho={14} />
                      <span style={{ fontSize: "12px", color: COR.textoPrincipal }}>{nota.toFixed(2).replace(/\.?0+$/, "") || "0"}</span>
                    </span>
                  </div>
                  <input type="range" min="0" max="5" step="0.25" value={nota} onChange={(e) => setNota(parseFloat(e.target.value))} style={{ width: "100%" }} />
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: COR.textoSecundario, marginBottom: "6px" }}>Sua resenha</div>
                  <textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder="O que você achou desse livro?"
                    style={{ width: "100%", boxSizing: "border-box", height: alturaCaixaTexto, overflowY: "auto", resize: "none", fontSize: "13.5px", padding: "9px 10px", borderRadius: "8px", border: `1.5px solid ${COR.melEscuro}40`, fontFamily: "inherit", color: COR.textoPrincipal }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: COR.textoSecundario, marginBottom: "6px" }}>E sobre o autor, o que achou?</div>
                  <textarea
                    value={sobreAutor}
                    onChange={(e) => setSobreAutor(e.target.value)}
                    placeholder="Opcional — seu estilo, outras obras, o que quiser comentar"
                    style={{ width: "100%", boxSizing: "border-box", height: alturaCaixaAutor, overflowY: "auto", resize: "none", fontSize: "13.5px", padding: "9px 10px", borderRadius: "8px", border: `1.5px solid ${COR.melEscuro}40`, fontFamily: "inherit", color: COR.textoPrincipal }}
                  />
                </div>

                <div onClick={() => setPublica(!publica)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: "10px", background: publica ? COR.melClaro : COR.saugeClaro, cursor: "pointer" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: publica ? COR.melEscuro : COR.saugeEscuro }}>
                      {publica ? "Publicar essa resenha" : "Manter privada"}
                    </div>
                    <div style={{ fontSize: "11.5px", color: COR.textoSecundario, marginTop: "1px" }}>
                      {publica ? "Vai ficar visível pra outras pessoas verem" : "Só você vai poder ver essa resenha"}
                    </div>
                  </div>
                  <div style={{ width: "40px", height: "22px", borderRadius: "20px", background: publica ? COR.mel : COR.linha, position: "relative", flexShrink: 0 }}>
                    <div style={{ position: "absolute", top: "2px", left: publica ? "20px" : "2px", width: "18px", height: "18px", borderRadius: "50%", background: "#FFFFFF" }} />
                  </div>
                </div>

                {erroForm && <div style={{ fontSize: "12.5px", color: COR.alerta }}>{erroForm}</div>}

                <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
                  <button type="button" onClick={() => abrirLeitura(resenhaSelecionada)} style={{ flex: 1, fontSize: "13px", padding: "9px", borderRadius: "20px", border: `1px solid ${COR.linha}`, background: "#FFFFFF", color: COR.textoPrincipal, cursor: "pointer" }}>
                    Cancelar
                  </button>
                  <button type="submit" style={{ flex: 1, fontSize: "13px", fontWeight: 600, padding: "9px", borderRadius: "20px", border: `1.5px solid ${COR.melEscuro}`, background: COR.mel, color: "#FFFFFF", cursor: "pointer" }}>
                    Salvar
                  </button>
                </div>
              </form>
            )}
          </div>
          </div>

          {modo === "leitura" && (
            <div style={{ flexShrink: 0, padding: "12px 20px", borderTop: `1px solid ${COR.linha}`, background: COR.fundo, fontFamily: SANS }}>
              {!confirmandoRemocaoResenha ? (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setConfirmandoRemocaoResenha(true)}
                    style={{ fontSize: "12.5px", padding: "10px 12px", borderRadius: "20px", border: `1px solid ${COR.alerta}`, background: "transparent", color: COR.alerta, cursor: "pointer" }}
                  >
                    Excluir
                  </button>
                  <button onClick={() => abrirEdicao(resenhaSelecionada)} style={{ flex: 1, fontSize: "13px", fontWeight: 600, padding: "10px", borderRadius: "20px", border: `1.5px solid ${COR.melEscuro}`, background: COR.mel, color: "#FFFFFF", cursor: "pointer" }}>
                    Editar
                  </button>
                </div>
              ) : (
                <div style={{ background: "#FDF1EE", border: `1px solid ${COR.alerta}`, borderRadius: "10px", padding: "12px" }}>
                  <div style={{ fontSize: "12.5px", color: COR.textoPrincipal, marginBottom: "10px" }}>
                    Excluir essa resenha de "{resenhaSelecionada.livroTitulo}" não pode ser desfeito.
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => setConfirmandoRemocaoResenha(false)} style={{ flex: 1, fontSize: "12.5px", padding: "9px", borderRadius: "8px", border: `1px solid ${COR.linha}`, background: "#FFFFFF", color: COR.textoPrincipal, cursor: "pointer" }}>
                      Cancelar
                    </button>
                    <button onClick={() => removerResenha(resenhaSelecionadaId)} style={{ flex: 1, fontSize: "12.5px", fontWeight: 600, padding: "9px", borderRadius: "8px", border: "none", background: COR.alerta, color: "#FFFFFF", cursor: "pointer" }}>
                      Sim, excluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "22px 20px 14px", borderBottom: `1px solid ${COR.linha}`, flexShrink: 0 }}>
        <div style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: COR.textoSecundario, marginBottom: "4px" }}>
          Resenhas · privado ou público, você decide
        </div>
        <h1 style={{ fontSize: "23px", fontWeight: 600, margin: "0 0 14px" }}>Suas resenhas</h1>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: COR.textoSecundario, pointerEvents: "none" }}>
            ⌕
          </span>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por um livro já resenhado"
            style={{ width: "100%", boxSizing: "border-box", fontFamily: SANS, fontSize: "14px", padding: "10px 12px 10px 30px", borderRadius: "10px", border: `1px solid ${COR.linha}`, background: COR.cartao, outline: "none", color: COR.textoPrincipal }}
          />
          {busca && (
            <button
              onClick={() => setBusca("")}
              aria-label="Limpar busca"
              style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", color: COR.textoSecundario, fontSize: "14px", cursor: "pointer", padding: "4px" }}
            >
              ×
            </button>
          )}
        </div>
        <div style={{ fontFamily: SANS, fontSize: "10px", color: COR.textoSecundario, marginTop: "5px" }}>
          A busca encontra só livros que já têm resenha escrita
        </div>
      </div>

      <div style={{ padding: "12px 16px 4px", flexShrink: 0, fontFamily: SANS, fontSize: "12.5px", fontWeight: 600, color: COR.textoPrincipal, borderBottom: `1px solid ${COR.linha}` }}>
        {buscando
          ? resenhasOrdenadas.length === 1
            ? `1 resenha encontrada para "${busca}"`
            : `${resenhasOrdenadas.length} resenhas encontradas para "${busca}"`
          : resenhasOrdenadas.length === 1
          ? "1 resenha escrita"
          : `${resenhasOrdenadas.length} resenhas escritas`}
      </div>

    <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      {pendente && (
        <div style={{ margin: "12px 16px 0", padding: "8px 12px", borderRadius: "10px", background: COR.saugeClaro, fontFamily: SANS, fontSize: "11.5px", color: COR.saugeEscuro }}>
          Modo de teste: essa versão ainda não guarda os dados de forma permanente.
        </div>
      )}

      <div style={{ padding: "16px", minHeight: "180px" }}>
        {!loaded ? (
          <div style={{ fontFamily: SANS, fontSize: "13px", color: COR.textoSecundario, padding: "30px 0", textAlign: "center" }}>
            Carregando suas resenhas…
          </div>
        ) : resenhasOrdenadas.length === 0 ? (
          <div style={{ fontFamily: SANS, fontSize: "13.5px", color: COR.textoSecundario, padding: "30px 10px", textAlign: "center", lineHeight: 1.6 }}>
            {buscando
              ? `Nenhuma resenha encontrada para "${busca}".`
              : livros.length === 0
              ? "Cadastre um livro na aba Estante primeiro — a resenha parte de um livro que você já tem lá."
              : "Você ainda não escreveu nenhuma resenha."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {resenhasOrdenadas.map((r) => (
              <div key={r.id} onClick={() => abrirLeitura(r)} style={{ background: COR.cartao, border: `1px solid ${COR.linha}`, borderRadius: "12px", padding: "12px", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "4px" }}>
                  <div style={{ fontSize: "14.5px", fontWeight: 600, minWidth: 0 }}>{r.livroTitulo}</div>
                  <span style={{ flexShrink: 0, fontFamily: SANS, fontSize: "10.5px", padding: "3px 9px", borderRadius: "20px", background: r.publica ? COR.melClaro : COR.saugeClaro, color: r.publica ? COR.melEscuro : COR.saugeEscuro }}>
                    {r.publica ? "Pública" : "Privada"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                  <Estrelas valor={r.nota} tamanho={13} />
                  <div style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.textoSecundario, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>
                    {r.texto}
                  </div>
                </div>
                <div style={{ fontFamily: SANS, fontSize: "11px", color: COR.textoSecundario }}>{formatarData(r.atualizadoEm)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* criação de resenha nova: inline, mesmo padrão do "+ Adicionar livro" da Estante */}
      {modo === "criacao" && (
        <div
          onClick={fecharTudo}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(62,58,49,0.35)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            padding: "16px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            overflowY: "auto",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: COR.cartao,
              borderRadius: "18px",
              padding: "20px",
              width: "100%",
              maxWidth: "480px",
              boxSizing: "border-box",
              fontFamily: SANS,
              border: `2px solid ${COR.melEscuro}55`,
              boxShadow: `0 8px 28px rgba(62,58,49,0.28), 0 0 0 4px ${COR.melEscuro}0D`,
              margin: "20px auto",
            }}
          >
            <button
              type="button"
              onClick={fecharTudo}
              style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.melEscuro, background: "transparent", border: "none", padding: 0, marginBottom: "10px", cursor: "pointer" }}
            >
              ← Minhas resenhas
            </button>
            <div style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: COR.melEscuro, fontWeight: 700, marginBottom: "6px" }}>
              💭 Minha opinião
            </div>
            <div style={{ fontFamily: SANS, fontSize: "12px", color: COR.textoSecundario, marginBottom: "16px" }}>
              Solta o verbo sobre o que você acabou de ler.
            </div>

            <form onSubmit={salvarResenha} style={{ display: "flex", flexDirection: "column", gap: "10px", fontFamily: SANS }}>
            <div>
              <div style={{ fontSize: "12px", color: COR.textoSecundario, marginBottom: "6px" }}>Livro</div>
              <select value={livroId} onChange={(e) => setLivroId(e.target.value)} style={{ width: "100%", boxSizing: "border-box", fontSize: "14px", padding: "9px 10px", borderRadius: "8px", border: `1.5px solid ${COR.melEscuro}40`, background: "#FFFFFF", color: COR.textoPrincipal }}>
                <option value="">Selecione um livro da sua estante</option>
                {livros.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.titulo}
                    {l.autor ? ` — ${l.autor}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: "12px", color: COR.textoSecundario, marginBottom: "6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Sua nota</span>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Estrelas valor={nota} tamanho={14} />
                  <span style={{ fontSize: "12px", color: COR.textoPrincipal }}>{nota.toFixed(2).replace(/\.?0+$/, "") || "0"}</span>
                </span>
              </div>
              <input type="range" min="0" max="5" step="0.25" value={nota} onChange={(e) => setNota(parseFloat(e.target.value))} style={{ width: "100%" }} />
            </div>

            <div>
              <div style={{ fontSize: "12px", color: COR.textoSecundario, marginBottom: "6px" }}>Sua resenha</div>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="O que você achou desse livro?"
                style={{ width: "100%", boxSizing: "border-box", height: alturaCaixaTexto, overflowY: "auto", resize: "none", fontSize: "13.5px", padding: "9px 10px", borderRadius: "8px", border: `1.5px solid ${COR.melEscuro}40`, fontFamily: "inherit", color: COR.textoPrincipal }}
              />
            </div>

            <div>
              <div style={{ fontSize: "12px", color: COR.textoSecundario, marginBottom: "6px" }}>E sobre o autor, o que achou?</div>
              <textarea
                value={sobreAutor}
                onChange={(e) => setSobreAutor(e.target.value)}
                placeholder="Opcional — seu estilo, outras obras, o que quiser comentar"
                style={{ width: "100%", boxSizing: "border-box", height: alturaCaixaAutor, overflowY: "auto", resize: "none", fontSize: "13.5px", padding: "9px 10px", borderRadius: "8px", border: `1.5px solid ${COR.melEscuro}40`, fontFamily: "inherit", color: COR.textoPrincipal }}
              />
            </div>

            <div onClick={() => setPublica(!publica)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: "10px", background: publica ? COR.melClaro : COR.saugeClaro, cursor: "pointer" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: publica ? COR.melEscuro : COR.saugeEscuro }}>
                  {publica ? "Publicar essa resenha" : "Manter privada"}
                </div>
                <div style={{ fontSize: "11.5px", color: COR.textoSecundario, marginTop: "1px" }}>
                  {publica ? "Vai ficar visível pra outras pessoas verem" : "Só você vai poder ver essa resenha"}
                </div>
              </div>
              <div style={{ width: "40px", height: "22px", borderRadius: "20px", background: publica ? COR.mel : COR.linha, position: "relative", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: "2px", left: publica ? "20px" : "2px", width: "18px", height: "18px", borderRadius: "50%", background: "#FFFFFF" }} />
              </div>
            </div>

            {erroForm && <div style={{ fontSize: "12.5px", color: COR.alerta }}>{erroForm}</div>}

            <button type="submit" style={{ fontSize: "13px", fontWeight: 600, padding: "9px", borderRadius: "20px", border: `1.5px solid ${COR.melEscuro}`, background: COR.mel, color: "#FFFFFF", cursor: "pointer", marginTop: "2px" }}>
              Salvar resenha
            </button>
            </form>
          </div>
        </div>
      )}

    </div>

    {modo === "fechado" && (
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${COR.linha}`, background: COR.fundo, flexShrink: 0 }}>
        <button
          onClick={abrirCriacao}
          disabled={livros.length === 0}
          style={{ width: "100%", fontFamily: SANS, fontSize: "14px", fontWeight: 600, padding: "12px", borderRadius: "10px", border: "none", background: livros.length === 0 ? COR.linha : COR.sauge, color: livros.length === 0 ? COR.textoSecundario : "#FFFFFF", cursor: livros.length === 0 ? "not-allowed" : "pointer" }}
        >
          + Nova resenha
        </button>
      </div>
    )}
    </div>
  );
}

// ======================= ABA 3: ESCRITOS (público) =======================

function TelaEscritos({ estado, pendente, corPersonalizada, onMudarCor, marcadoresState }) {
  const { dados: obras, dadosRef: obrasRef, loaded, salvar } = estado;
  const { dados: marcadores, dadosRef: marcadoresRef, salvar: salvarMarcadores } = marcadoresState;

  const corBase = corPersonalizada || COR.ameixa;
  const corClara = clarear(corBase);
  const corEscura = escurecer(corBase);

  const [mostrarPersonalizacao, setMostrarPersonalizacao] = useState(false);
  const [gerenciandoMarcadores, setGerenciandoMarcadores] = useState(false);
  const [novoNomeMarcador, setNovoNomeMarcador] = useState("");
  const [novaCorMarcador, setNovaCorMarcador] = useState(CORES_MARCADOR[0]);
  const [marcadorParaConfirmar, setMarcadorParaConfirmar] = useState(null);
  const [verMarcadoresCriados, setVerMarcadoresCriados] = useState(false);
  const [obraOrigemMarcador, setObraOrigemMarcador] = useState(null);
  const [mostrarMenuMarcadoresObra, setMostrarMenuMarcadoresObra] = useState(false);
  const [mostrarChipsParaAplicar, setMostrarChipsParaAplicar] = useState(false);
  const [passoCriacao, setPassoCriacao] = useState("infoObra"); // 'infoObra' | 'escolherCapitulo' | 'escrevendo' | 'salvo'
  const [editandoInfoObra, setEditandoInfoObra] = useState(false);
  const [obraExpandidaLeitura, setObraExpandidaLeitura] = useState(null);
  const menuLerCapitulosRef = useRef(null);

  // fecha o menu "Ler capítulos" se a pessoa clicar em qualquer lugar fora dele
  useEffect(() => {
    if (!obraExpandidaLeitura) return;
    function aoClicarFora(e) {
      if (menuLerCapitulosRef.current && !menuLerCapitulosRef.current.contains(e.target)) {
        setObraExpandidaLeitura(null);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [obraExpandidaLeitura]);
  const [ultimoCapituloSalvoId, setUltimoCapituloSalvoId] = useState(null);
  const [mostrarMarcadorDiscreto, setMostrarMarcadorDiscreto] = useState(false);
  const menuMarcadoresObraRef = useRef(null);
  const marcadorDiscretoRef = useRef(null);

  // fecha os menus de marcador da obra (aplicar num capítulo, ou o discreto
  // da tela de escrita) se a pessoa clicar em qualquer lugar fora deles —
  // só fecha, nunca apaga escolha nem salva nada sozinho
  useEffect(() => {
    function aoClicarFora(e) {
      if (mostrarMenuMarcadoresObra && menuMarcadoresObraRef.current && !menuMarcadoresObraRef.current.contains(e.target)) {
        setMostrarMenuMarcadoresObra(false);
        setMostrarChipsParaAplicar(false);
      }
      if (mostrarMarcadorDiscreto && marcadorDiscretoRef.current && !marcadorDiscretoRef.current.contains(e.target)) {
        setMostrarMarcadorDiscreto(false);
      }
    }
    if (mostrarMenuMarcadoresObra || mostrarMarcadorDiscreto) {
      document.addEventListener("mousedown", aoClicarFora);
      return () => document.removeEventListener("mousedown", aoClicarFora);
    }
  }, [mostrarMenuMarcadoresObra, mostrarMarcadorDiscreto]);

  // vista controla a navegação dentro do módulo:
  // 'lista' (todas as obras) | 'obra' (sumário/leitura de uma obra) |
  // 'criacao' (espaço dedicado de escrita) | 'leituraCapitulo'
  const [vista, setVista] = useState("lista");
  const [obraSelecionadaId, setObraSelecionadaId] = useState(null);
  const [capituloSelecionadoId, setCapituloSelecionadoId] = useState(null);

  const [tituloObra, setTituloObra] = useState("");
  const [novaObraMarcadorIds, setNovaObraMarcadorIds] = useState([]);
  const [mostrarMarcadoresInfoObra, setMostrarMarcadoresInfoObra] = useState(false);
  const [mostrarEdicaoObra, setMostrarEdicaoObra] = useState(false);
  const [sinopseObra, setSinopseObra] = useState("");
  const [generoObra, setGeneroObra] = useState("");
  const [erroObra, setErroObra] = useState("");

  const [tituloCap, setTituloCap] = useState("");
  const [textoCap, setTextoCap] = useState("");
  const [capMarcadorIds, setCapMarcadorIds] = useState([]);
  const [publicadoCap, setPublicadoCap] = useState(false);
  const [erroCap, setErroCap] = useState("");
  const [confirmandoExclusaoObra, setConfirmandoExclusaoObra] = useState(false);
  const [confirmandoExclusaoCapitulo, setConfirmandoExclusaoCapitulo] = useState(false);

  const alturaCaixaTexto = "220px";

  function criarMarcador(e) {
    e.preventDefault();
    const nome = novoNomeMarcador.trim();
    if (!nome) return;
    const marcador = { id: uid(), nome, cor: novaCorMarcador };
    salvarMarcadores([...marcadoresRef.current, marcador]);
    setNovoNomeMarcador("");
    setNovaCorMarcador(CORES_MARCADOR[0]);
  }

  function removerMarcador(id) {
    salvarMarcadores(marcadoresRef.current.filter((m) => m.id !== id));
    salvar(obrasRef.current.map((o) => ({ ...o, marcadorIds: (o.marcadorIds || []).filter((mid) => mid !== id) })));
    setMarcadorParaConfirmar(null);
  }

  function alternarMarcadorNaObra(obraId, marcadorId) {
    salvar(
      obrasRef.current.map((o) => {
        if (o.id !== obraId) return o;
        const atuais = o.marcadorIds || [];
        const tem = atuais.includes(marcadorId);
        return { ...o, marcadorIds: tem ? atuais.filter((id) => id !== marcadorId) : [...atuais, marcadorId] };
      })
    );
  }

  function limparCamposObra() {
    setTituloObra("");
    setSinopseObra("");
    setGeneroObra("");
    setNovaObraMarcadorIds([]);
    setMostrarMarcadoresInfoObra(false);
    setErroObra("");
  }

  function limparCamposCap() {
    setTituloCap("");
    setTextoCap("");
    setPublicadoCap(false);
    setErroCap("");
    setCapMarcadorIds([]);
  }

  function irParaLista() {
    setVista("lista");
    setObraSelecionadaId(null);
    setCapituloSelecionadoId(null);
    setConfirmandoExclusaoObra(false);
    setConfirmandoExclusaoCapitulo(false);
    setMostrarMenuMarcadoresObra(false);
    setMostrarChipsParaAplicar(false);
    setMostrarMarcadorDiscreto(false);
    setEditandoInfoObra(false);
    setUltimoCapituloSalvoId(null);
    setObraOrigemMarcador(null);
    limparCamposObra();
    limparCamposCap();
  }

  function abrirObra(obraId) {
    setObraSelecionadaId(obraId);
    setCapituloSelecionadoId(null);
    setConfirmandoExclusaoObra(false);
    setMostrarMenuMarcadoresObra(false);
    setMostrarChipsParaAplicar(false);
    setMostrarPersonalizacao(false);
    limparCamposCap();
    setVista("obra");
  }

  // "Ler" na lista de Suas Obras não navega mais direto — abre um menu ali
  // mesmo com os capítulos, pra escolher qual ler antes de ir pra leitura
  function alternarObraExpandidaLeitura(obraId) {
    setObraExpandidaLeitura(obraExpandidaLeitura === obraId ? null : obraId);
  }

  function abrirLeituraDireta(obraId, capituloId) {
    setObraSelecionadaId(obraId);
    setCapituloSelecionadoId(capituloId);
    setObraExpandidaLeitura(null);
    setVista("leituraCapitulo");
  }

  // ---------- fluxo do espaço de criação (dedicado, sem a lista de obras) ----------

  function abrirCriacaoNova() {
    limparCamposObra();
    setObraSelecionadaId(null);
    setEditandoInfoObra(false);
    setMostrarPersonalizacao(false);
    setPassoCriacao("infoObra");
    setVista("criacao");
  }

  function salvarInfoObraEComecarEscrita(e) {
    e.preventDefault();
    const tituloLimpo = tituloObra.trim();
    if (!tituloLimpo) {
      setErroObra("Digite pelo menos o título da obra.");
      return;
    }
    const nova = {
      id: uid(),
      titulo: tituloLimpo,
      sinopse: sinopseObra.trim(),
      genero: generoObra.trim(),
      marcadorIds: novaObraMarcadorIds,
      publica: false,
      criadoEm: new Date().toISOString(),
      capitulos: [],
    };
    salvar([nova, ...obrasRef.current]);
    setObraSelecionadaId(nova.id);
    limparCamposObra();
    limparCamposCap();
    setCapituloSelecionadoId(null);
    setPassoCriacao("escrevendo");
  }

  // decide sozinho pra onde levar: obra nova ou com só 1 capítulo entra
  // direto escrevendo; com vários capítulos, mostra uma escolha rápida
  function iniciarEscritaObra(obraId) {
    const obra = obrasRef.current.find((o) => o.id === obraId);
    setObraSelecionadaId(obraId);
    setMostrarMarcadorDiscreto(false);
    setEditandoInfoObra(false);
    setMostrarPersonalizacao(false);
    setConfirmandoExclusaoObra(false);
    setMostrarMarcadoresInfoObra(false);
    setMostrarEdicaoObra(false);
    limparCamposCap();
    setCapituloSelecionadoId(null);
    if (obra) {
      setTituloObra(obra.titulo);
      setGeneroObra(obra.genero || "");
      setSinopseObra(obra.sinopse || "");
    }
    setErroObra("");
    // "Editar" é edição, não criação — sempre abre o menu geral da obra
    // (informações, marcadores, capítulos), mesmo se ainda não tiver nenhum
    // capítulo escrito. Criar um capítulo novo fica como ação separada, ali dentro.
    setPassoCriacao("escolherCapitulo");
    setVista("criacao");
  }

  function escolherCapituloParaEditar(cap) {
    setCapituloSelecionadoId(cap.id);
    setTituloCap(cap.titulo);
    setTextoCap(cap.texto);
    setPublicadoCap(cap.publicado);
    setCapMarcadorIds(cap.marcadorIds || []);
    setErroCap("");
    setConfirmandoExclusaoCapitulo(false);
    setPassoCriacao("escrevendo");
    setVista("criacao");
  }

  function comecarNovoCapituloNaCriacao() {
    setCapituloSelecionadoId(null);
    limparCamposCap();
    setPassoCriacao("escrevendo");
  }

  // clique no card inteiro (fora dos botões Ler/Editar): vai direto pra
  // escrever um capítulo novo, sem passar pela lista de escolher capítulo
  function abrirEscreverCapituloNovo(obraId) {
    setObraSelecionadaId(obraId);
    setMostrarMarcadorDiscreto(false);
    setEditandoInfoObra(false);
    setMostrarPersonalizacao(false);
    setConfirmandoExclusaoObra(false);
    setCapituloSelecionadoId(null);
    limparCamposCap();
    setPassoCriacao("escrevendo");
    setVista("criacao");
  }

  function abrirEdicaoInfoObra() {
    if (!obraSelecionada) return;
    setTituloObra(obraSelecionada.titulo);
    setGeneroObra(obraSelecionada.genero || "");
    setSinopseObra(obraSelecionada.sinopse || "");
    setErroObra("");
    setEditandoInfoObra(true);
  }

  function reverterCamposInfoObra() {
    if (!obraSelecionada) return;
    setTituloObra(obraSelecionada.titulo);
    setGeneroObra(obraSelecionada.genero || "");
    setSinopseObra(obraSelecionada.sinopse || "");
    setErroObra("");
    setMostrarMarcadoresInfoObra(false);
    setMostrarEdicaoObra(false);
  }

  function salvarEdicaoInfoObra(e) {
    e.preventDefault();
    const tituloLimpo = tituloObra.trim();
    if (!tituloLimpo) {
      setErroObra("O título não pode ficar vazio.");
      return;
    }
    salvar(
      obrasRef.current.map((o) =>
        o.id === obraSelecionada.id ? { ...o, titulo: tituloLimpo, genero: generoObra.trim(), sinopse: sinopseObra.trim() } : o
      )
    );
    setErroObra("");
    setMostrarMarcadoresInfoObra(false);
    setMostrarEdicaoObra(false);
  }

  // liga/desliga TODOS os capítulos de uma vez — a obra some ou aparece inteira
  function alternarObraPublicaEmBloco() {
    if (!obraSelecionada) return;
    const novoValor = !obraSelecionada.publica;
    salvar(
      obrasRef.current.map((o) =>
        o.id === obraSelecionada.id
          ? { ...o, publica: novoValor, capitulos: o.capitulos.map((c) => ({ ...c, publicado: novoValor })) }
          : o
      )
    );
  }

  function removerObra(obraId) {
    salvar(obrasRef.current.filter((o) => o.id !== obraId));
    irParaLista();
  }

  function abrirLeituraCapitulo(capId) {
    setCapituloSelecionadoId(capId);
    setConfirmandoExclusaoCapitulo(false);
    setVista("leituraCapitulo");
  }

  function salvarCapitulo(e) {
    e.preventDefault();
    const tituloLimpo = tituloCap.trim();
    if (!tituloLimpo) {
      setErroCap("Dê um título ao capítulo.");
      return;
    }
    if (!textoCap.trim()) {
      setErroCap("Escreva algo antes de salvar.");
      return;
    }
    const agora = new Date().toISOString();
    const obraAtual = obrasRef.current.find((o) => o.id === obraSelecionadaId);
    const estaEditandoExistente = Boolean(capituloSelecionadoId) && obraAtual && obraAtual.capitulos.some((c) => c.id === capituloSelecionadoId);
    const idCapituloSalvo = estaEditandoExistente ? capituloSelecionadoId : uid();

    if (estaEditandoExistente) {
      salvar(
        obrasRef.current.map((o) =>
          o.id !== obraSelecionadaId
            ? o
            : {
                ...o,
                capitulos: o.capitulos.map((c) =>
                  c.id === capituloSelecionadoId
                    ? { ...c, titulo: tituloLimpo, texto: textoCap.trim(), publicado: publicadoCap, marcadorIds: capMarcadorIds, atualizadoEm: agora }
                    : c
                ),
              }
        )
      );
    } else {
      const novoCap = {
        id: idCapituloSalvo,
        titulo: tituloLimpo,
        texto: textoCap.trim(),
        publicado: publicadoCap,
        marcadorIds: capMarcadorIds,
        criadoEm: agora,
        atualizadoEm: agora,
      };
      salvar(
        obrasRef.current.map((o) => (o.id === obraSelecionadaId ? { ...o, capitulos: [novoCap, ...o.capitulos] } : o))
      );
    }
    limparCamposCap();
    setCapituloSelecionadoId(null);
    // depois de salvar (criando ou editando), volta pra lista de obras —
    // lá a pessoa escolhe se quer ler, editar, escrever outro capítulo, etc.
    irParaLista();
  }

  function voltarAoCapituloSalvo() {
    if (!obraSelecionada || !ultimoCapituloSalvoId) return;
    const cap = obraSelecionada.capitulos.find((c) => c.id === ultimoCapituloSalvoId);
    if (cap) escolherCapituloParaEditar(cap);
  }

  function removerCapitulo(capId) {
    salvar(
      obrasRef.current.map((o) =>
        o.id !== obraSelecionadaId ? o : { ...o, capitulos: o.capitulos.filter((c) => c.id !== capId) }
      )
    );
    setVista("obra");
    setCapituloSelecionadoId(null);
  }

  const obrasOrdenadas = useMemo(
    () => [...obras].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)),
    [obras]
  );

  const obraSelecionada = obras.find((o) => o.id === obraSelecionadaId) || null;
  // ordem fixa por criação — editar um capítulo nunca muda a posição dele na lista
  const capitulosOrdenados = useMemo(
    () =>
      obraSelecionada
        ? [...obraSelecionada.capitulos]
            .sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm))
            .map((c, i) => ({ ...c, numero: i + 1 }))
        : [],
    [obraSelecionada]
  );
  const capituloSelecionado = obraSelecionada ? obraSelecionada.capitulos.find((c) => c.id === capituloSelecionadoId) || null : null;
  const numeroDoCapituloSelecionado = capituloSelecionado ? capitulosOrdenados.findIndex((c) => c.id === capituloSelecionado.id) + 1 : null;

  const contagemPublicados = obraSelecionada ? obraSelecionada.capitulos.filter((c) => c.publicado).length : 0;

  // ---------- VISTA: LISTA DE OBRAS ----------
  if (vista === "lista") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flexShrink: 0 }}>
        <div style={{ padding: "22px 20px 16px", borderBottom: `1px solid ${COR.linha}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            <div style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: COR.textoSecundario }}>
              Escritos · público, no seu ritmo
            </div>
            <button
              onClick={() => {
                if (mostrarPersonalizacao && obraOrigemMarcador) {
                  setObraOrigemMarcador(null);
                  setVista("criacao");
                }
                setMostrarPersonalizacao(!mostrarPersonalizacao);
              }}
              style={{
                fontFamily: SANS,
                fontSize: "11px",
                fontWeight: 600,
                padding: "5px 12px",
                borderRadius: "20px",
                border: mostrarPersonalizacao ? "none" : `1px solid ${corBase}55`,
                background: mostrarPersonalizacao ? corBase : corClara,
                color: mostrarPersonalizacao ? "#FFFFFF" : corEscura,
                cursor: "pointer",
              }}
            >
              {mostrarPersonalizacao ? "🎨 Meu cantinho ▲" : "🎨 Meu cantinho"}
            </button>
          </div>
          <h1 style={{ fontSize: "23px", fontWeight: 600, margin: 0 }}>Suas obras</h1>
        </div>

        {obraOrigemMarcador && (
          <div style={{ margin: "12px 16px 0" }}>
            <button
              onClick={() => {
                setObraOrigemMarcador(null);
                setMostrarPersonalizacao(false);
                setVista("criacao");
              }}
              style={{ width: "100%", fontFamily: SANS, fontSize: "13px", fontWeight: 600, padding: "10px", borderRadius: "10px", border: "none", background: corBase, color: "#FFFFFF", cursor: "pointer" }}
            >
              ← Retomar de onde parei
            </button>
          </div>
        )}

        {mostrarPersonalizacao && (
          <div style={{ margin: "12px 16px 0", padding: "12px", borderRadius: "12px", background: COR.cartao, border: `1.5px solid ${corBase}40`, boxShadow: `0 0 0 3px ${corBase}12`, fontFamily: SANS }}>
            <div style={{ fontSize: "12.5px", color: COR.textoPrincipal, marginBottom: "10px", fontWeight: 600 }}>
              🎨 Sua cor
            </div>
            <div style={{ fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "10px" }}>
              Ela muda os botões, ícones e destaques aqui na aba Escritos.
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {PALETA_PERSONALIZACAO.map((c) => (
                <div
                  key={c}
                  onClick={() => onMudarCor(c)}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: c,
                    cursor: "pointer",
                    border: corBase === c ? `2px solid ${COR.textoPrincipal}` : "2px solid transparent",
                    boxSizing: "border-box",
                  }}
                />
              ))}
            </div>

            <div style={{ height: "1px", background: COR.linha, margin: "20px 0 16px" }} />

            <div style={{ fontSize: "12.5px", color: COR.textoPrincipal, marginBottom: "8px", fontWeight: 600 }}>
              🏷️ Seus marcadores
            </div>
            <div style={{ fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "10px" }}>
              Só valem aqui em Escritos — pra marcar suas obras do jeito que fizer sentido pra você.
            </div>
            {marcadores.length > 0 && (
              <button
                type="button"
                onClick={() => setVerMarcadoresCriados(!verMarcadoresCriados)}
                style={{ fontFamily: SANS, fontSize: "11.5px", color: corEscura, background: "transparent", border: "none", padding: 0, marginBottom: "10px", cursor: "pointer", display: "block" }}
              >
                👁️ {verMarcadoresCriados ? "Esconder" : "Ver"} marcadores criados ({marcadores.length}) {verMarcadoresCriados ? "▲" : "▼"}
              </button>
            )}
            {marcadores.length > 0 && verMarcadoresCriados && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                {marcadores.map((m) => (
                  <span
                    key={m.id}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "4px 10px", borderRadius: "20px", background: m.cor, color: "#FFFFFF" }}
                  >
                    {m.nome}
                    <span onClick={() => setMarcadorParaConfirmar(m.id)} style={{ cursor: "pointer", fontWeight: 700, padding: "4px 6px", marginRight: "-4px", marginLeft: "2px" }}>
                      ×
                    </span>
                  </span>
                ))}
              </div>
            )}
            {marcadorParaConfirmar && (
              <div style={{ background: "#FDF1EE", border: `1px solid ${COR.alerta}`, borderRadius: "10px", padding: "10px", marginBottom: "12px" }}>
                <div style={{ fontSize: "12px", color: COR.textoPrincipal, marginBottom: "8px" }}>
                  Remover "{marcadores.find((m) => m.id === marcadorParaConfirmar)?.nome}" do seu Meu Cantinho. Não dá pra desfazer.
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" onClick={() => setMarcadorParaConfirmar(null)} style={{ flex: 1, fontSize: "12px", padding: "7px", borderRadius: "8px", border: `1px solid ${COR.linha}`, background: "#FFFFFF", color: COR.textoPrincipal, cursor: "pointer" }}>
                    Cancelar
                  </button>
                  <button type="button" onClick={() => removerMarcador(marcadorParaConfirmar)} style={{ flex: 1, fontSize: "12px", fontWeight: 600, padding: "7px", borderRadius: "8px", border: "none", background: COR.alerta, color: "#FFFFFF", cursor: "pointer" }}>
                    Sim, remover
                  </button>
                </div>
              </div>
            )}
            <form onSubmit={criarMarcador} style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
              <input
                value={novoNomeMarcador}
                onChange={(e) => setNovoNomeMarcador(e.target.value)}
                placeholder="Nome do novo marcador"
                style={{ fontSize: "13px", padding: "8px 10px", borderRadius: "8px", border: `1px solid ${COR.linha}` }}
              />
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                {CORES_MARCADOR.map((c) => (
                  <div
                    key={c}
                    onClick={() => setNovaCorMarcador(c)}
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: c,
                      cursor: "pointer",
                      border: novaCorMarcador === c ? `2px solid ${COR.textoPrincipal}` : "2px solid transparent",
                      boxSizing: "border-box",
                    }}
                  />
                ))}
                <button type="submit" style={{ marginLeft: "auto", fontSize: "12px", fontWeight: 600, padding: "5px 14px", borderRadius: "20px", border: `1px solid ${corBase}`, background: "transparent", color: corEscura, cursor: "pointer" }}>
                  Criar marcador
                </button>
              </div>
            </form>

            <button
              onClick={() => {
                if (obraOrigemMarcador) {
                  setObraOrigemMarcador(null);
                  setVista("criacao");
                }
                setMostrarPersonalizacao(false);
              }}
              style={{ width: "100%", fontSize: "12.5px", fontWeight: 600, padding: "9px", borderRadius: "8px", border: `1.5px solid ${corBase}`, background: "#FFFFFF", color: corEscura, cursor: "pointer" }}
            >
              Fechar cantinho
            </button>
          </div>
        )}

        {pendente && (
          <div style={{ margin: "12px 16px 0", padding: "8px 12px", borderRadius: "10px", background: corClara, fontFamily: SANS, fontSize: "11.5px", color: corEscura }}>
            Modo de teste: essa versão ainda não guarda os dados de forma permanente.
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <div
          style={{
            padding: "16px",
            minHeight: "180px",
            filter: mostrarPersonalizacao ? "blur(3px)" : "none",
            opacity: mostrarPersonalizacao ? 0.5 : 1,
            pointerEvents: mostrarPersonalizacao ? "none" : "auto",
            transition: "filter 0.2s ease, opacity 0.2s ease",
          }}
        >
          {!loaded ? (
            <div style={{ fontFamily: SANS, fontSize: "13px", color: COR.textoSecundario, padding: "30px 0", textAlign: "center" }}>
              Carregando suas obras…
            </div>
          ) : obrasOrdenadas.length === 0 ? (
            <div style={{ fontFamily: SANS, fontSize: "13.5px", color: COR.textoSecundario, padding: "30px 10px", textAlign: "center", lineHeight: 1.6 }}>
              Você ainda não começou nenhuma obra. Crie a primeira abaixo.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {obrasOrdenadas.map((o) => {
                const publicados = o.capitulos.filter((c) => c.publicado).length;
                const rascunhos = o.capitulos.length - publicados;
                const temPublicado = publicados > 0;
                return (
                  <div
                    key={o.id}
                    onClick={() => abrirEscreverCapituloNovo(o.id)}
                    style={{ background: COR.cartao, border: `1px solid ${COR.linha}`, borderRadius: "12px", padding: "12px", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "4px" }}>
                      <div style={{ fontSize: "15px", fontWeight: 600, minWidth: 0 }}>{o.titulo}</div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                        {o.genero && (
                          <span style={{ fontFamily: SANS, fontSize: "10.5px", padding: "3px 9px", borderRadius: "20px", background: corClara, color: corEscura }}>
                            {o.genero}
                          </span>
                        )}
                        <span
                          style={{
                            fontFamily: SANS,
                            fontSize: "10px",
                            padding: "3px 9px",
                            borderRadius: "20px",
                            background: o.publica ? COR.melClaro : COR.saugeClaro,
                            color: o.publica ? COR.melEscuro : COR.saugeEscuro,
                          }}
                        >
                          {o.publica ? "🌍 Pública" : "🔒 Privada"}
                        </span>
                      </div>
                    </div>
                    {o.sinopse && (
                      <div style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.textoSecundario, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "4px" }}>
                        {o.sinopse}
                      </div>
                    )}
                    <div style={{ fontFamily: SANS, fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "8px" }}>
                      {publicados > 0 ? `${publicados} ${publicados === 1 ? "capítulo publicado" : "capítulos publicados"}` : "ainda sem capítulo publicado"}
                      {rascunhos > 0 ? ` · ${rascunhos} ${rascunhos === 1 ? "rascunho" : "rascunhos"}` : ""}
                    </div>

                    <div ref={obraExpandidaLeitura === o.id ? menuLerCapitulosRef : null}>
                    <div style={{ display: "flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                      <span
                        onClick={() => alternarObraExpandidaLeitura(o.id)}
                        style={{ fontFamily: SANS, fontSize: "11.5px", fontWeight: 600, padding: "5px 12px", borderRadius: "20px", background: obraExpandidaLeitura === o.id ? corBase : corClara, color: obraExpandidaLeitura === o.id ? "#FFFFFF" : corEscura, cursor: "pointer" }}
                      >
                        📖 Ler capítulos {obraExpandidaLeitura === o.id ? "▲" : "▼"}
                      </span>
                      <span
                        onClick={() => iniciarEscritaObra(o.id)}
                        style={{ fontFamily: SANS, fontSize: "11.5px", fontWeight: 600, padding: "5px 12px", borderRadius: "20px", border: `1px solid ${COR.linha}`, color: COR.textoSecundario, cursor: "pointer" }}
                      >
                        ✏️ Editar obra
                      </span>
                    </div>

                    {obraExpandidaLeitura === o.id && (
                      <div onClick={(e) => e.stopPropagation()} style={{ marginTop: "10px", padding: "10px", borderRadius: "10px", background: corClara, border: `1px solid ${corBase}30` }}>
                        {o.capitulos.length === 0 ? (
                          <div style={{ textAlign: "center", padding: "6px 0" }}>
                            <div style={{ fontFamily: SANS, fontSize: "12px", color: COR.textoSecundario, marginBottom: "10px" }}>
                              Essa obra ainda não tem nenhum capítulo escrito.
                            </div>
                            <button
                              onClick={() => abrirEscreverCapituloNovo(o.id)}
                              style={{ fontFamily: SANS, fontSize: "12px", fontWeight: 600, padding: "7px 14px", borderRadius: "20px", border: "none", background: corBase, color: "#FFFFFF", cursor: "pointer" }}
                            >
                              + Escrever capítulo
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {[...o.capitulos]
                              .sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm))
                              .map((c, i) => (
                                <div
                                  key={c.id}
                                  onClick={() => abrirLeituraDireta(o.id, c.id)}
                                  style={{ display: "flex", alignItems: "center", gap: "10px", background: "#FFFFFF", borderRadius: "8px", padding: "9px 11px", cursor: "pointer", fontFamily: SANS }}
                                >
                                  <div style={{ flexShrink: 0, width: "22px", height: "22px", borderRadius: "50%", background: corBase, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700 }}>
                                    {i + 1}
                                  </div>
                                  <div style={{ fontSize: "13px", fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {c.titulo}
                                  </div>
                                  <span
                                    style={{
                                      flexShrink: 0,
                                      fontSize: "10px",
                                      padding: "2px 8px",
                                      borderRadius: "20px",
                                      background: c.publicado ? COR.melClaro : COR.saugeClaro,
                                      color: c.publicado ? COR.melEscuro : COR.saugeEscuro,
                                    }}
                                  >
                                    {c.publicado ? "Público" : "Privado"}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                    </div>

                    {o.marcadorIds && o.marcadorIds.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
                        {o.marcadorIds.map((mid) => {
                          const m = marcadores.find((mm) => mm.id === mid);
                          if (!m) return null;
                          return (
                            <span key={mid} style={{ fontFamily: SANS, fontSize: "9.5px", padding: "2px 7px", borderRadius: "20px", background: m.cor, color: "#FFFFFF" }}>
                              {m.nome}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          padding: "12px 16px",
          borderTop: `1px solid ${COR.linha}`,
          background: COR.fundo,
          flexShrink: 0,
          filter: mostrarPersonalizacao ? "blur(3px)" : "none",
          opacity: mostrarPersonalizacao ? 0.5 : 1,
          pointerEvents: mostrarPersonalizacao ? "none" : "auto",
          transition: "filter 0.2s ease, opacity 0.2s ease",
        }}
      >
        <button
          onClick={abrirCriacaoNova}
          style={{ width: "100%", fontFamily: SANS, fontSize: "14px", fontWeight: 600, padding: "12px", borderRadius: "10px", border: "none", background: corBase, color: "#FFFFFF", cursor: "pointer" }}
        >
          + Nova obra
        </button>
      </div>
      </div>
    );
  }

  // ---------- VISTA: DENTRO DE UMA OBRA (lista de capítulos) ----------
  if (vista === "obra" && !obraSelecionada) return null;

  if (vista === "obra") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ padding: "18px 20px 14px" }}>
          <button
            onClick={irParaLista}
            style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.textoSecundario, background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
          >
            ← todas as obras
          </button>
        </div>

        {/* "capa" do livro — só leitura, nada clicável pra editar aqui */}
        <div
          style={{
            margin: "0 20px 20px",
            padding: "24px 20px",
            borderRadius: "18px",
            background: `linear-gradient(160deg, ${corClara}, ${COR.cartao} 65%)`,
            border: `1px solid ${corBase}30`,
            boxShadow: `0 6px 20px rgba(62,58,49,0.10), 0 0 0 1px ${corBase}0D`,
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "5px", background: corBase }} />
          <div style={{ fontFamily: SANS, fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: corEscura, marginBottom: "10px", opacity: 0.85, fontWeight: 600 }}>
            📖 Leitura
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 10px", fontFamily: SERIF, color: COR.textoPrincipal, lineHeight: 1.3 }}>
            {obraSelecionada.titulo}
          </h1>
          {obraSelecionada.genero && (
            <span style={{ display: "inline-block", fontFamily: SANS, fontSize: "10px", fontWeight: 600, padding: "3px 12px", borderRadius: "20px", background: "transparent", border: `1px solid ${corBase}`, color: corEscura, marginBottom: obraSelecionada.sinopse ? "12px" : 0 }}>
              {obraSelecionada.genero}
            </span>
          )}
          {obraSelecionada.sinopse && (
            <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "12.5px", color: COR.textoSecundario, lineHeight: 1.55, padding: "0 6px" }}>
              {obraSelecionada.sinopse}
            </div>
          )}

          {(obraSelecionada.marcadorIds || []).length > 0 && (
            <>
              <div style={{ fontFamily: SANS, fontSize: "10px", color: corEscura, opacity: 0.5, margin: "14px 0 10px" }}>· · ·</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
                {(obraSelecionada.marcadorIds || []).map((mid) => {
                  const m = marcadores.find((mm) => mm.id === mid);
                  if (!m) return null;
                  return (
                    <span key={mid} style={{ fontFamily: SANS, fontSize: "10px", padding: "2px 10px", borderRadius: "20px", background: m.cor, color: "#FFFFFF" }}>
                      {m.nome}
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {pendente && (
          <div style={{ margin: "0 20px 16px", padding: "8px 12px", borderRadius: "10px", background: corClara, fontFamily: SANS, fontSize: "11.5px", color: corEscura }}>
            Modo de teste: essa versão ainda não guarda os dados de forma permanente.
          </div>
        )}

        <div style={{ padding: "0 20px 8px" }}>
          <div style={{ fontFamily: SERIF, fontSize: "14px", fontWeight: 700, color: COR.textoPrincipal, borderBottom: `1px solid ${COR.linha}`, paddingBottom: "8px" }}>
            📚 Sumário
          </div>
        </div>

        <div style={{ padding: "8px 16px 16px", minHeight: "160px" }}>
          {capitulosOrdenados.length === 0 ? (
            <div style={{ fontFamily: SANS, fontSize: "13.5px", color: COR.textoSecundario, padding: "20px 10px", textAlign: "center", lineHeight: 1.6 }}>
              Essa obra ainda não tem nenhum capítulo pra ler.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {capitulosOrdenados.map((c, i) => (
                <div
                  key={c.id}
                  onClick={() => abrirLeituraCapitulo(c.id)}
                  style={{ display: "flex", alignItems: "center", gap: "12px", background: COR.cartao, border: `1px solid ${COR.linha}`, borderRadius: "12px", padding: "12px", cursor: "pointer" }}
                >
                  <div style={{ flexShrink: 0, width: "26px", height: "26px", borderRadius: "50%", background: corClara, color: corEscura, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: "12px", fontWeight: 700 }}>
                    {c.numero}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.titulo}
                    </div>
                    <div style={{ fontFamily: SANS, fontSize: "11.5px", color: COR.textoSecundario }}>{formatarData(c.atualizadoEm)}</div>
                    {c.marcadorIds && c.marcadorIds.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", marginTop: "4px" }}>
                        {c.marcadorIds.map((mid) => {
                          const m = marcadores.find((mm) => mm.id === mid);
                          if (!m) return null;
                          return (
                            <span key={mid} style={{ fontFamily: SANS, fontSize: "9px", padding: "1px 7px", borderRadius: "20px", background: m.cor, color: "#FFFFFF" }}>
                              {m.nome}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      flexShrink: 0,
                      fontFamily: SANS,
                      fontSize: "10.5px",
                      padding: "3px 9px",
                      borderRadius: "20px",
                      background: c.publicado ? COR.melClaro : COR.saugeClaro,
                      color: c.publicado ? COR.melEscuro : COR.saugeEscuro,
                    }}
                  >
                    {c.publicado ? "Público" : "Privado"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    );
  }

  // ---------- VISTA: LEITURA / EDIÇÃO DE UM CAPÍTULO ----------
  if (vista === "leituraCapitulo" && capituloSelecionado) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ flexShrink: 0, padding: "16px 20px", borderBottom: `1px solid ${COR.linha}` }}>
          <button
            onClick={() => setVista("lista")}
            style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.textoSecundario, background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
          >
            ← {obraSelecionada.titulo}
          </button>
        </div>

        {/* área de leitura — ocupa todo o espaço disponível, como a página de um livro */}
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", background: `linear-gradient(180deg, ${corClara}55, ${COR.fundo} 140px)` }}>
          <div style={{ maxWidth: "560px", margin: "0 auto", padding: "20px 20px 40px" }}>
            <div
              style={{
                padding: "22px 20px",
                borderRadius: "18px",
                background: `linear-gradient(160deg, ${corClara}, ${COR.cartao} 65%)`,
                border: `1px solid ${corBase}30`,
                boxShadow: `0 6px 20px rgba(62,58,49,0.10), 0 0 0 1px ${corBase}0D`,
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
                marginBottom: "24px",
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "5px", background: corBase }} />
              <div style={{ fontFamily: SANS, fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: corEscura, marginBottom: "8px", opacity: 0.85, fontWeight: 600 }}>
                📖 Leitura
              </div>
              <div style={{ fontSize: "17px", fontWeight: 700, margin: "0 0 8px", fontFamily: SERIF, color: COR.textoPrincipal, lineHeight: 1.3 }}>
                {obraSelecionada.titulo}
              </div>
              {obraSelecionada.genero && (
                <span style={{ display: "inline-block", fontFamily: SANS, fontSize: "10px", fontWeight: 600, padding: "3px 12px", borderRadius: "20px", border: `1px solid ${corBase}`, color: corEscura, marginBottom: obraSelecionada.sinopse ? "10px" : 0 }}>
                  {obraSelecionada.genero}
                </span>
              )}
              {obraSelecionada.sinopse && (
                <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "12px", color: COR.textoSecundario, lineHeight: 1.5, padding: "0 4px" }}>
                  {obraSelecionada.sinopse}
                </div>
              )}
              {(obraSelecionada.marcadorIds || []).length > 0 && (
                <>
                  <div style={{ fontFamily: SANS, fontSize: "10px", color: corEscura, opacity: 0.5, margin: "12px 0 8px" }}>· · ·</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
                    {(obraSelecionada.marcadorIds || []).map((mid) => {
                      const m = marcadores.find((mm) => mm.id === mid);
                      if (!m) return null;
                      return (
                        <span key={mid} style={{ fontFamily: SANS, fontSize: "10px", padding: "2px 10px", borderRadius: "20px", background: m.cor, color: "#FFFFFF" }}>
                          {m.nome}
                        </span>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {numeroDoCapituloSelecionado && (
              <div style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: corEscura, textAlign: "center", marginBottom: "8px" }}>
                Capítulo {numeroDoCapituloSelecionado}
              </div>
            )}
            <div style={{ fontFamily: SERIF, fontSize: "23px", fontWeight: 700, color: COR.textoPrincipal, textAlign: "center", lineHeight: 1.3, marginBottom: "10px" }}>
              {capituloSelecionado.titulo}
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
              <span
                style={{
                  fontFamily: SANS,
                  fontSize: "10px",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  background: capituloSelecionado.publicado ? COR.melClaro : COR.saugeClaro,
                  color: capituloSelecionado.publicado ? COR.melEscuro : COR.saugeEscuro,
                }}
              >
                {capituloSelecionado.publicado ? "Público" : "Privado"}
              </span>
            </div>

            <div
              style={{
                fontFamily: SERIF,
                fontSize: "16px",
                color: COR.textoPrincipal,
                lineHeight: 1.9,
                whiteSpace: "pre-wrap",
                cursor: "default",
              }}
            >
              {capituloSelecionado.texto}
            </div>

            <div style={{ fontFamily: SANS, fontSize: "11px", color: COR.textoSecundario, textAlign: "center", marginTop: "36px" }}>
              · · ·
              <div style={{ marginTop: "8px" }}>Atualizado em {formatarData(capituloSelecionado.atualizadoEm)}</div>
            </div>
          </div>
        </div>

        <div style={{ flexShrink: 0, padding: "12px 20px", borderTop: `1px solid ${COR.linha}`, background: COR.fundo, display: "flex", gap: "8px" }}>
          <button onClick={() => setVista("lista")} style={{ flex: 1, fontFamily: SANS, fontSize: "13.5px", padding: "10px", borderRadius: "10px", border: `1px solid ${COR.linha}`, background: "#FFFFFF", color: COR.textoPrincipal, cursor: "pointer" }}>
            Voltar
          </button>
          <button onClick={() => escolherCapituloParaEditar(capituloSelecionado)} style={{ flex: 1, fontFamily: SANS, fontSize: "13.5px", fontWeight: 600, padding: "10px", borderRadius: "10px", border: "none", background: corBase, color: "#FFFFFF", cursor: "pointer" }}>
            Editar
          </button>
        </div>
      </div>
    );
  }

  // ---------- VISTA: ESPAÇO DE CRIAÇÃO (dedicado, sem lista de outras obras) ----------
  if (vista === "criacao") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ flexShrink: 0, padding: "20px 20px 14px", borderBottom: `1px solid ${COR.linha}` }}>
          <div style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 700, color: COR.textoPrincipal, marginBottom: "12px" }}>
            {passoCriacao === "escolherCapitulo" ? "✏️ Editando obra" : "✍️ Momento de criação"}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              onClick={irParaLista}
              style={{ fontFamily: SANS, fontSize: "11.5px", color: COR.textoSecundario, background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
            >
              ← todas as obras
            </button>
            <button
              onClick={() => {
                setObraOrigemMarcador(obraSelecionadaId || "rascunho-nova-obra");
                setVista("lista");
                setMostrarPersonalizacao(true);
              }}
              style={{
                fontFamily: SANS,
                fontSize: "11px",
                fontWeight: 600,
                padding: "5px 12px",
                borderRadius: "20px",
                border: `1px solid ${corBase}55`,
                background: corClara,
                color: corEscura,
                cursor: "pointer",
              }}
            >
              🎨 Meu cantinho
            </button>
          </div>
        </div>

        {passoCriacao === "infoObra" && (
          <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ padding: "0 20px 20px" }}>
              <h1 style={{ fontSize: "22px", fontWeight: 600, margin: "0 0 4px", fontFamily: SERIF }}>Comece uma obra nova</h1>
              <div style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.textoSecundario, marginBottom: "18px" }}>
                Só o essencial pra começar — o resto você ajusta com calma depois.
              </div>
              <form onSubmit={salvarInfoObraEComecarEscrita} style={{ display: "flex", flexDirection: "column", gap: "10px", fontFamily: SANS }}>
                <input
                  value={tituloObra}
                  onChange={(e) => setTituloObra(e.target.value)}
                  placeholder="Título da obra"
                  autoFocus
                  style={{ fontSize: "15px", padding: "11px 12px", borderRadius: "10px", border: `1.5px solid ${corBase}40` }}
                />
                <input
                  value={generoObra}
                  onChange={(e) => setGeneroObra(e.target.value)}
                  placeholder="Gênero (opcional)"
                  style={{ fontSize: "14px", padding: "10px 12px", borderRadius: "10px", border: `1.5px solid ${corBase}40` }}
                />
                <textarea
                  value={sinopseObra}
                  onChange={(e) => setSinopseObra(e.target.value)}
                  placeholder="Uma sinopse curta (opcional)"
                  rows={3}
                  style={{ fontSize: "13.5px", padding: "10px 12px", borderRadius: "10px", border: `1.5px solid ${corBase}40`, fontFamily: "inherit", resize: "vertical" }}
                />

                <div>
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => setMostrarMarcadoresInfoObra(!mostrarMarcadoresInfoObra)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontFamily: SANS,
                        fontSize: "12.5px",
                        fontWeight: 600,
                        padding: "6px 12px",
                        borderRadius: "20px",
                        border: `1px solid ${corBase}55`,
                        background: mostrarMarcadoresInfoObra ? corBase : corClara,
                        color: mostrarMarcadoresInfoObra ? "#FFFFFF" : corEscura,
                        cursor: "pointer",
                      }}
                    >
                      🏷️ Marcadores da obra {mostrarMarcadoresInfoObra ? "▲" : "▼"}
                    </button>
                    {novaObraMarcadorIds.length > 0 &&
                      novaObraMarcadorIds.map((mid) => {
                        const m = marcadores.find((mm) => mm.id === mid);
                        if (!m) return null;
                        return (
                          <span key={mid} style={{ fontFamily: SANS, fontSize: "11px", padding: "3px 9px", borderRadius: "20px", background: m.cor, color: "#FFFFFF" }}>
                            {m.nome}
                          </span>
                        );
                      })}
                  </div>
                  {!mostrarMarcadoresInfoObra && (
                    <div style={{ fontFamily: SANS, fontSize: "10.5px", color: COR.textoSecundario, marginTop: "5px" }}>
                      Marcam a obra inteira — dá pra marcar um capítulo específico depois, na hora de escrever.
                    </div>
                  )}

                  {mostrarMarcadoresInfoObra && (
                    <div style={{ marginTop: "8px", padding: "10px", borderRadius: "10px", border: `1px solid ${COR.linha}`, background: COR.cartao }}>
                      {marcadores.length === 0 ? (
                        <div style={{ fontFamily: SANS, fontSize: "11.5px", color: COR.textoSecundario }}>
                          Nenhum marcador criado ainda — crie um no "🎨 Meu cantinho".
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {marcadores.map((m) => {
                            const ativo = novaObraMarcadorIds.includes(m.id);
                            return (
                              <span
                                key={m.id}
                                onClick={() => {
                                  setNovaObraMarcadorIds(ativo ? novaObraMarcadorIds.filter((id) => id !== m.id) : [...novaObraMarcadorIds, m.id]);
                                  setMostrarMarcadoresInfoObra(false);
                                }}
                                style={{
                                  fontFamily: SANS,
                                  fontSize: "12px",
                                  padding: "5px 12px",
                                  borderRadius: "20px",
                                  cursor: "pointer",
                                  background: ativo ? m.cor : "#FFFFFF",
                                  color: ativo ? "#FFFFFF" : COR.textoSecundario,
                                  border: ativo ? `1px solid ${m.cor}` : `1px solid ${COR.linha}`,
                                }}
                              >
                                {m.nome}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {erroObra && <div style={{ fontSize: "12.5px", color: COR.alerta }}>{erroObra}</div>}
                <button type="submit" style={{ fontSize: "14px", fontWeight: 600, padding: "12px", borderRadius: "10px", border: "none", background: corBase, color: "#FFFFFF", cursor: "pointer", marginTop: "6px" }}>
                  Começar a escrever →
                </button>
              </form>
            </div>
          </div>
        )}

        {passoCriacao === "escolherCapitulo" && obraSelecionada && (
          <>
            <div style={{ padding: "18px 20px 20px", flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setMostrarEdicaoObra(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      textAlign: "left",
                      fontFamily: SANS,
                      fontSize: "12.5px",
                      fontWeight: 700,
                      color: corEscura,
                      background: corClara,
                      border: `1.5px solid ${corBase}70`,
                      borderRadius: "12px",
                      padding: "12px 14px",
                      marginBottom: "18px",
                      cursor: "pointer",
                    }}
                  >
                    <span>✏️ Editar capa da obra</span>
                    <span style={{ fontSize: "15px" }}>›</span>
                  </button>

                  <div style={{ fontFamily: SERIF, fontSize: "14px", fontWeight: 700, color: COR.textoPrincipal, marginTop: "18px", paddingTop: "16px", borderTop: `1px solid ${COR.linha}` }}>
                    Editar capítulos
                  </div>
            </div>

            {mostrarEdicaoObra && (
              <div
                onClick={reverterCamposInfoObra}
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(62,58,49,0.35)",
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                  padding: "10px",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  overflowY: "auto",
                  zIndex: 1000,
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: COR.cartao,
                    borderRadius: "18px",
                    padding: "20px",
                    width: "100%",
                    maxWidth: "480px",
                    boxSizing: "border-box",
                    fontFamily: SANS,
                    border: `2px solid ${corBase}55`,
                    boxShadow: `0 8px 28px rgba(62,58,49,0.28), 0 0 0 4px ${corBase}0D`,
                    margin: "20px auto",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "16px" }}>
                    <div style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: corEscura, fontWeight: 700 }}>
                      ✏️ Editar capa da obra
                    </div>
                    <button
                      type="button"
                      onClick={() => setMostrarMarcadoresInfoObra(!mostrarMarcadoresInfoObra)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontFamily: SANS,
                        fontSize: "11.5px",
                        fontWeight: 600,
                        padding: "5px 11px",
                        borderRadius: "20px",
                        border: `1px solid ${corBase}55`,
                        background: mostrarMarcadoresInfoObra ? corBase : corClara,
                        color: mostrarMarcadoresInfoObra ? "#FFFFFF" : corEscura,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      🏷️ Marcadores {(obraSelecionada.marcadorIds || []).length > 0 ? `(${(obraSelecionada.marcadorIds || []).length})` : ""} {mostrarMarcadoresInfoObra ? "▲" : "▼"}
                    </button>
                  </div>

                  {mostrarMarcadoresInfoObra && (
                    <div style={{ marginBottom: "16px", padding: "10px", borderRadius: "10px", border: `1px solid ${COR.linha}`, background: "#FFFFFF" }}>
                      {marcadores.length === 0 ? (
                        <div style={{ fontFamily: SANS, fontSize: "11.5px", color: COR.textoSecundario }}>
                          Nenhum marcador criado ainda — crie um no "🎨 Meu cantinho".
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {marcadores.map((m) => {
                            const ativo = (obraSelecionada.marcadorIds || []).includes(m.id);
                            return (
                              <span
                                key={m.id}
                                onClick={() => {
                                  alternarMarcadorNaObra(obraSelecionada.id, m.id);
                                  setMostrarMarcadoresInfoObra(false);
                                }}
                                style={{
                                  fontFamily: SANS,
                                  fontSize: "12px",
                                  padding: "5px 12px",
                                  borderRadius: "20px",
                                  cursor: "pointer",
                                  background: ativo ? m.cor : "#FFFFFF",
                                  color: ativo ? "#FFFFFF" : COR.textoSecundario,
                                  border: ativo ? `1px solid ${m.cor}` : `1px solid ${COR.linha}`,
                                }}
                              >
                                {m.nome}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <form onSubmit={salvarEdicaoInfoObra} style={{ display: "flex", flexDirection: "column", gap: "10px", fontFamily: SANS }}>
                    <div>
                      <div style={{ fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "4px" }}>Título</div>
                      <input
                        value={tituloObra}
                        onChange={(e) => setTituloObra(e.target.value)}
                        placeholder="Título da obra"
                        style={{ width: "100%", boxSizing: "border-box", fontSize: "18px", fontFamily: SERIF, fontWeight: 700, padding: "9px 10px", borderRadius: "8px", border: `1.5px solid ${corBase}40` }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "4px" }}>Gênero</div>
                      <input
                        value={generoObra}
                        onChange={(e) => setGeneroObra(e.target.value)}
                        placeholder="Gênero (opcional)"
                        style={{ width: "100%", boxSizing: "border-box", fontSize: "14px", padding: "9px 10px", borderRadius: "8px", border: `1.5px solid ${corBase}40` }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: "11.5px", color: COR.textoSecundario, marginBottom: "4px" }}>Sinopse</div>
                      <textarea
                        value={sinopseObra}
                        onChange={(e) => setSinopseObra(e.target.value)}
                        placeholder="Uma sinopse curta (opcional)"
                        rows={5}
                        style={{ width: "100%", boxSizing: "border-box", fontSize: "13.5px", padding: "9px 10px", borderRadius: "8px", border: `1.5px solid ${corBase}40`, fontFamily: "inherit", resize: "vertical" }}
                      />
                    </div>

                    <div
                      onClick={alternarObraPublicaEmBloco}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: "10px", background: corClara, cursor: "pointer" }}
                    >
                      <div>
                        <div style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, color: corEscura }}>
                          {obraSelecionada.publica ? "🌍 Obra inteira pública" : "🔒 Obra inteira privada"}
                        </div>
                        <div style={{ fontFamily: SANS, fontSize: "11px", color: COR.textoSecundario, marginTop: "1px" }}>
                          {obraSelecionada.publica ? "Todos os capítulos ficam visíveis de uma vez" : "Publique só um capítulo específico abaixo, se preferir"}
                        </div>
                      </div>
                      <div style={{ width: "40px", height: "22px", borderRadius: "20px", background: obraSelecionada.publica ? corBase : COR.linha, position: "relative", flexShrink: 0 }}>
                        <div style={{ position: "absolute", top: "2px", left: obraSelecionada.publica ? "20px" : "2px", width: "18px", height: "18px", borderRadius: "50%", background: "#FFFFFF" }} />
                      </div>
                    </div>

                    {erroObra && <div style={{ fontSize: "12.5px", color: COR.alerta }}>{erroObra}</div>}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button type="button" onClick={reverterCamposInfoObra} style={{ flex: 1, fontSize: "12.5px", padding: "8px", borderRadius: "20px", border: `1px solid ${COR.linha}`, background: "#FFFFFF", color: COR.textoPrincipal, cursor: "pointer" }}>
                        Cancelar
                      </button>
                      <button type="submit" style={{ flex: 1, fontSize: "12.5px", fontWeight: 600, padding: "8px", borderRadius: "20px", border: `1px solid ${corBase}`, background: "transparent", color: corEscura, cursor: "pointer" }}>
                        Salvar alterações
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
              <div style={{ padding: "0 20px 20px" }}>
              {capitulosOrdenados.length === 0 ? (
                <div style={{ fontFamily: SANS, fontSize: "12.5px", color: COR.textoSecundario, textAlign: "center", padding: "16px 8px", lineHeight: 1.6 }}>
                  Nenhum capítulo escrito ainda. Toque no título dessa obra em "todas as obras" pra começar a escrever.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {capitulosOrdenados.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => escolherCapituloParaEditar(c)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", background: COR.cartao, border: `1px solid ${COR.linha}`, borderRadius: "10px", padding: "12px", cursor: "pointer", fontFamily: SANS }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: "13.5px", fontWeight: 600 }}>
                          Capítulo {c.numero} · {c.titulo}
                        </span>
                        {c.marcadorIds && c.marcadorIds.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", marginTop: "4px" }}>
                            {c.marcadorIds.map((mid) => {
                              const m = marcadores.find((mm) => mm.id === mid);
                              if (!m) return null;
                              return (
                                <span key={mid} style={{ fontSize: "9px", padding: "1px 7px", borderRadius: "20px", background: m.cor, color: "#FFFFFF" }}>
                                  {m.nome}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: "10.5px",
                          padding: "3px 9px",
                          borderRadius: "20px",
                          background: c.publicado ? COR.melClaro : COR.saugeClaro,
                          color: c.publicado ? COR.melEscuro : COR.saugeEscuro,
                        }}
                      >
                        {c.publicado ? "Público" : "Privado"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>

            <div style={{ flexShrink: 0, padding: "12px 20px", borderTop: `1px solid ${COR.linha}`, background: COR.fundo }}>
              {!confirmandoExclusaoObra ? (
                <button
                  onClick={() => setConfirmandoExclusaoObra(true)}
                  style={{ width: "100%", fontFamily: SANS, fontSize: "12.5px", padding: "8px", borderRadius: "8px", border: `1px solid ${COR.linha}`, background: "transparent", color: COR.textoSecundario, cursor: "pointer" }}
                >
                  Excluir essa obra inteira
                </button>
              ) : (
                <div style={{ background: COR.cartao, border: `1px solid ${COR.alerta}`, borderRadius: "10px", padding: "12px", fontFamily: SANS }}>
                  <div style={{ fontSize: "12.5px", color: COR.textoPrincipal, marginBottom: "10px" }}>
                    Excluir "{obraSelecionada.titulo}" apaga {obraSelecionada.capitulos.length === 1 ? "o único capítulo" : `todos os ${obraSelecionada.capitulos.length} capítulos`} junto. Não dá pra desfazer.
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setConfirmandoExclusaoObra(false)}
                      style={{ flex: 1, fontSize: "12.5px", padding: "8px", borderRadius: "8px", border: `1px solid ${COR.linha}`, background: "#FFFFFF", color: COR.textoPrincipal, cursor: "pointer" }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => removerObra(obraSelecionada.id)}
                      style={{ flex: 1, fontSize: "12.5px", fontWeight: 600, padding: "8px", borderRadius: "8px", border: "none", background: COR.alerta, color: "#FFFFFF", cursor: "pointer" }}
                    >
                      Sim, excluir tudo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {passoCriacao === "escrevendo" && (
          <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ padding: "18px 20px 20px" }}>
              <div style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: COR.textoSecundario, fontWeight: 700, marginBottom: "8px" }}>
                Escrevendo capítulo
              </div>
              {obraSelecionada && (
                <div
                  style={{
                    display: "inline-block",
                    fontFamily: SANS,
                    fontSize: "10.5px",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    color: corEscura,
                    background: corClara,
                    padding: "4px 11px",
                    borderRadius: "20px",
                    marginBottom: "16px",
                  }}
                >
                  {obraSelecionada.titulo}
                </div>
              )}
              <form onSubmit={salvarCapitulo} style={{ display: "flex", flexDirection: "column", gap: "10px", fontFamily: SANS }}>
                <input
                  value={tituloCap}
                  onChange={(e) => setTituloCap(e.target.value)}
                  placeholder="Título do capítulo"
                  style={{ fontSize: "15px", padding: "10px 12px", borderRadius: "10px", border: `1.5px solid ${corBase}40` }}
                />

                <div ref={marcadorDiscretoRef}>
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => setMostrarMarcadorDiscreto(!mostrarMarcadorDiscreto)}
                      title="Marcadores desse capítulo"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontFamily: SANS,
                        fontSize: "11.5px",
                        fontWeight: 600,
                        padding: "4px 9px",
                        borderRadius: "20px",
                        border: `1px solid ${corBase}55`,
                        background: corClara,
                        color: corEscura,
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: "12.5px" }}>🏷️</span> Marcador do capítulo
                    </button>
                    {capMarcadorIds.length > 0 &&
                      capMarcadorIds.map((mid) => {
                        const m = marcadores.find((mm) => mm.id === mid);
                        if (!m) return null;
                        return (
                          <span key={mid} style={{ fontFamily: SANS, fontSize: "11px", padding: "3px 9px", borderRadius: "20px", background: m.cor, color: "#FFFFFF" }}>
                            {m.nome}
                          </span>
                        );
                      })}
                  </div>
                  {mostrarMarcadorDiscreto && (
                    <div style={{ marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {marcadores.length === 0 ? (
                        <span style={{ fontSize: "11.5px", color: COR.textoSecundario }}>Nenhum marcador criado ainda (em "Meu cantinho").</span>
                      ) : (
                        marcadores.map((m) => {
                          const ativo = capMarcadorIds.includes(m.id);
                          return (
                            <span
                              key={m.id}
                              onClick={() => {
                                setCapMarcadorIds(ativo ? capMarcadorIds.filter((id) => id !== m.id) : [...capMarcadorIds, m.id]);
                              }}
                              style={{
                                fontSize: "11.5px",
                                padding: "4px 10px",
                                borderRadius: "20px",
                                cursor: "pointer",
                                background: ativo ? m.cor : "#FFFFFF",
                                color: ativo ? "#FFFFFF" : COR.textoSecundario,
                                border: ativo ? `1px solid ${m.cor}` : `1px solid ${COR.linha}`,
                              }}
                            >
                              {m.nome}
                            </span>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                <textarea
                  value={textoCap}
                  onChange={(e) => setTextoCap(e.target.value)}
                  placeholder="Escreva aqui — sem pressa…"
                  style={{ width: "100%", boxSizing: "border-box", height: "320px", overflowY: "auto", resize: "none", fontSize: "14.5px", lineHeight: 1.7, padding: "12px", borderRadius: "10px", border: `1.5px solid ${corBase}40`, fontFamily: "inherit", color: COR.textoPrincipal }}
                />

                <div onClick={() => setPublicadoCap(!publicadoCap)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: "10px", background: corClara, cursor: "pointer" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: corEscura }}>
                      {publicadoCap ? "🌍 Capítulo público" : "🔒 Capítulo privado"}
                    </div>
                    <div style={{ fontSize: "11.5px", color: COR.textoSecundario, marginTop: "1px" }}>
                      {publicadoCap ? "Vai ficar visível pra outras pessoas lerem" : "Só você vai poder ver por enquanto"}
                    </div>
                  </div>
                  <div style={{ width: "40px", height: "22px", borderRadius: "20px", background: publicadoCap ? corBase : COR.linha, position: "relative", flexShrink: 0 }}>
                    <div style={{ position: "absolute", top: "2px", left: publicadoCap ? "20px" : "2px", width: "18px", height: "18px", borderRadius: "50%", background: "#FFFFFF" }} />
                  </div>
                </div>

                {erroCap && <div style={{ fontSize: "12.5px", color: COR.alerta }}>{erroCap}</div>}

                {confirmandoExclusaoCapitulo && (
                  <div style={{ fontSize: "12px", color: COR.alerta, background: "#FDF1EE", padding: "8px 10px", borderRadius: "8px" }}>
                    Excluir esse capítulo não pode ser desfeito. Clique em "Confirmar remoção" pra prosseguir.
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
                  {capituloSelecionadoId && (
                    <>
                      {confirmandoExclusaoCapitulo && (
                        <button
                          type="button"
                          onClick={() => setConfirmandoExclusaoCapitulo(false)}
                          style={{ fontSize: "13px", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${COR.linha}`, background: "#FFFFFF", color: COR.textoPrincipal, cursor: "pointer" }}
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirmandoExclusaoCapitulo) removerCapitulo(capituloSelecionadoId);
                          else setConfirmandoExclusaoCapitulo(true);
                        }}
                        style={{
                          fontSize: "13px",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          border: `1px solid ${COR.alerta}`,
                          background: confirmandoExclusaoCapitulo ? COR.alerta : "#FFFFFF",
                          color: confirmandoExclusaoCapitulo ? "#FFFFFF" : COR.alerta,
                          cursor: "pointer",
                          fontWeight: confirmandoExclusaoCapitulo ? 600 : 400,
                        }}
                      >
                        {confirmandoExclusaoCapitulo ? "Confirmar remoção" : "Remover"}
                      </button>
                    </>
                  )}
                  <button type="submit" style={{ flex: 1, fontSize: "14px", fontWeight: 600, padding: "10px", borderRadius: "8px", border: "none", background: corBase, color: "#FFFFFF", cursor: "pointer" }}>
                    Salvar
                  </button>
                </div>
                {!capituloSelecionadoId && (
                  <button
                    type="button"
                    onClick={irParaLista}
                    style={{ width: "100%", fontFamily: SANS, fontSize: "12.5px", color: COR.textoSecundario, background: "transparent", border: "none", padding: "10px 0 0", cursor: "pointer", textAlign: "center" }}
                  >
                    Escrever capítulo depois
                  </button>
                )}
              </form>
            </div>
          </div>
          )}
      </div>
    );
  }

  return null;
}

export default AppLeitura;
