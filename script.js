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
  console.error("Firebase já inicializado ou erro:", e);
}
const db = firebase.database();

// Elementos da Tela
const container = document.getElementById('lista-produtos');
const inputBusca = document.getElementById('busca');
const selectCategoria = document.getElementById('filtro-categoria');
const checkFalta = document.getElementById('filtro-falta');

let listaGlobal = [];
let timeoutBusca = null; // Para controlar a lentidão

// --- FUNÇÕES AUXILIARES ---

// Remove acentos para facilitar a busca (Ex: "Limão" vira "Limao")
function normalizarTexto(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function gerarId(nome) {
  return nome.replace(/[^a-zA-Z0-9]/g, '_');
}

// --- INICIALIZAÇÃO ---
window.onload = function() {
  // 1. Carrega dados locais imediatamente
  if (window.produtos) {
    listaGlobal = window.produtos.map(p => ({
      ...p,
      falta: false, data: "", qtdAtual: "", qtdRepor: ""
    }));
    renderizar(listaGlobal); // Desenha a primeira vez
  } else {
    container.innerHTML = "<div style='padding:20px; text-align:center'>Erro: Lista de produtos não encontrada.</div>";
  }

  // 2. Conecta no Firebase
  iniciarConexaoNuvem();
};

function iniciarConexaoNuvem() {
  db.ref('estoque').on('value', (snapshot) => {
    const dadosNuvem = snapshot.val() || {};
    
    if (window.produtos) {
      listaGlobal = window.produtos.map(pArquivo => {
        const id = gerarId(pArquivo.nome);
        const pSalvo = dadosNuvem[id] || {};

        return {
          ...pArquivo,
          falta: pSalvo.falta || false,
          data: pSalvo.data || "",
          qtdAtual: pSalvo.qtdAtual || "",
          qtdRepor: pSalvo.qtdRepor || ""
        };
      });
      
      // Só atualiza a tela se o usuário NÃO estiver digitando na busca no momento
      if (document.activeElement !== inputBusca) {
        aplicarFiltros(); 
      }
    }
  });
}

// --- RENDERIZAÇÃO OTIMIZADA ---
function renderizar(lista) {
  container.innerHTML = '';

  if (!lista || lista.length === 0) {
    container.innerHTML = '<div style="padding:20px; color:#666; text-align:center;">Nenhum produto encontrado.</div>';
    return;
  }

  // Fragmento para evitar redesenhar a tela item por item (Mais rápido)
  const fragmento = document.createDocumentFragment();

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
    fragmento.appendChild(div);
  });

  container.appendChild(fragmento);
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

// --- FILTROS INTELIGENTES ---
window.aplicarFiltros = function() {
  const termo = normalizarTexto(inputBusca.value); // Usa a busca sem acentos
  const categoria = selectCategoria.value;
  const soFalta = checkFalta.checked;

  const filtrados = listaGlobal.filter(p => {
    const nomeNormalizado = normalizarTexto(p.nome);
    
    const matchNome = nomeNormalizado.includes(termo);
    const matchCat = categoria === "" || p.categoria === categoria;
    const matchFalta = !soFalta || (soFalta && p.falta);
    
    return matchNome && matchCat && matchFalta;
  });

  renderizar(filtrados);
};

// --- EVENTOS ---

// Busca com "Debounce" (Espera parar de digitar para filtrar)
inputBusca.onkeyup = function() {
  clearTimeout(timeoutBusca);
  timeoutBusca = setTimeout(window.aplicarFiltros, 300); // Espera 300ms
};
