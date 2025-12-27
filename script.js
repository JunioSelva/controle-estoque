const firebaseConfig = {
  apiKey: "AIzaSyBgBx-f_4FN7_nxbG4MGiBqEsZJwF8nJco",
  authDomain: "estoquebardonino.firebaseapp.com",
  databaseURL: "https://estoquebardonino-default-rtdb.firebaseio.com",
  projectId: "estoquebardonino",
  storageBucket: "estoquebardonino.firebasestorage.app",
  messagingSenderId: "1021843271734",
  appId: "1:1021843271734:web:1b4f20fb52af89eb95e897",
  measurementId: "G-6RPN2ML4FB"
};

// Inicializa Firebase
try {
  firebase.initializeApp(firebaseConfig);
} catch (e) {
  console.error("Erro ao iniciar Firebase:", e);
}
const db = firebase.database();

// Elementos da Tela
const container = document.getElementById('lista-produtos');
const inputBusca = document.getElementById('busca');
const selectCategoria = document.getElementById('filtro-categoria');
const checkFalta = document.getElementById('filtro-falta');

// Variáveis Globais
let listaGlobal = [];
let dadosNuvemCache = {}; // Guarda o que veio do Google

// Função auxiliar ID
function gerarId(nome) {
  return nome.replace(/[^a-zA-Z0-9]/g, '_');
}

// --- 1. CARREGAMENTO INICIAL (IMEDIATO) ---
window.onload = function() {
  if (!window.produtos) {
    container.innerHTML = '<div style="color:red; padding:20px; text-align:center;"><b>ERRO:</b> Lista de produtos não encontrada.<br>Verifique se a primeira linha do <i>produtos.js</i> é exatamente:<br><code>window.produtos = [ ...</code></div>';
    return;
  }

  // Carrega a lista "crua" imediatamente para não ficar tela branca
  listaGlobal = window.produtos.map(p => ({
    ...p,
    falta: false,
    data: "",
    qtdAtual: "",
    qtdRepor: ""
  }));

  // Desenha na tela (ainda sem os dados da nuvem)
  aplicarFiltros();
  
  // Inicia conexão com a nuvem
  iniciarConexaoNuvem();
};

// --- 2. CONEXÃO COM A NUVEM ---
function iniciarConexaoNuvem() {
  const statusDiv = document.createElement('div');
  
  db.ref('estoque').on('value', (snapshot) => {
    dadosNuvemCache = snapshot.val() || {};
    
    // Atualiza a lista global cruzando os dados
    listaGlobal = window.produtos.map(pArquivo => {
      const id = gerarId(pArquivo.nome);
      const pSalvo = dadosNuvemCache[id] || {};

      return {
        ...pArquivo,
        falta: pSalvo.falta || false,
        data: pSalvo.data || "",
        qtdAtual: pSalvo.qtdAtual || "",
        qtdRepor: pSalvo.qtdRepor || ""
      };
    });

    // Re-renderiza a tela com os dados novos
    aplicarFiltros();

  }, (error) => {
    console.error("Erro de conexão:", error);
    alert("Erro ao conectar no banco de dados. Verifique sua internet.");
  });
}

// --- RENDERIZAÇÃO ---
function renderizar(lista) {
  container.innerHTML = '';

  if (!lista || lista.length === 0) {
    container.innerHTML = '<div style="padding:10px; color:#666;">Nenhum produto encontrado.</div>';
    return;
  }

  lista.forEach((produto) => {
    const div = document.createElement('div');
    div.className = 'produto';
    
    if (produto.falta) {
      div.style.borderLeftColor = "red";
      div.style.backgroundColor = "#fff5f5";
    } else {
      div.style.borderLeftColor = "transparent";
      div.style.backgroundColor = "#fff";
    }

    div.innerHTML = `
      <div class="info-principal">
        <span class="nome">${produto.nome}</span>
        <span class="categoria">${produto.categoria}</span>
      </div>

      <div class="controles-estoque">
        <div class="input-group">
          <label>Data</label>
          <input type="text" class="input-pequeno" placeholder="dd/mm" 
            value="${produto.data}" 
            onchange="salvarDado('${produto.nome}', 'data', this.value)">
        </div>

        <div class="input-group">
          <label>Qtd Atual</label>
          <input type="number" class="input-pequeno" placeholder="0" 
            value="${produto.qtdAtual}" 
            onchange="salvarDado('${produto.nome}', 'qtdAtual', this.value)">
        </div>

        <div class="input-group">
          <label>Repor</label>
          <input type="number" class="input-pequeno" placeholder="0" 
            value="${produto.qtdRepor}" 
            onchange="salvarDado('${produto.nome}', 'qtdRepor', this.value)">
        </div>
      </div>

      <label class="falta-label">
        <input type="checkbox" 
          ${produto.falta ? 'checked' : ''} 
          onchange="salvarFalta('${produto.nome}', this.checked)">
        Falta
      </label>
    `;
    container.appendChild(div);
  });
}

// --- SALVAMENTO ---
window.salvarDado = function(nomeProduto, campo, valor) {
  const id = gerarId(nomeProduto);
  db.ref('estoque/' + id + '/' + campo).set(valor);
};

window.salvarFalta = function(nomeProduto, isChecked) {
  const id = gerarId(nomeProduto);
  db.ref('estoque/' + id + '/falta').set(isChecked);
};

// --- FILTROS ---
window.aplicarFiltros = function() {
  const termo = inputBusca.value.toLowerCase();
  const categoria = selectCategoria.value;
  const soFalta = checkFalta.checked;

  const filtrados = listaGlobal.filter(p => {
    const matchNome = p.nome.toLowerCase().includes(termo);
    const matchCat = categoria === "" || p.categoria === categoria;
    const matchFalta = !soFalta || (soFalta && p.falta);
    return matchNome && matchCat && matchFalta;
  });

  renderizar(filtrados);
};