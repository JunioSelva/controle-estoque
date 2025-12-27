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
  console.error("Firebase erro:", e);
}
const db = firebase.database();

// Variáveis Globais
let listaGlobal = [];
let timeoutBusca = null;

// Funções Auxiliares
function normalizarTexto(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function gerarId(nome) {
  return nome.replace(/[^a-zA-Z0-9]/g, '_');
}

// --- INICIALIZAÇÃO ---
window.onload = function() {
  // 1. Configura os elementos da tela
  const inputBusca = document.getElementById('busca');
  const selectCategoria = document.getElementById('filtro-categoria');
  const checkFalta = document.getElementById('filtro-falta');

  // 2. Garante que os eventos funcionem (Aqui estava o possível erro)
  if (inputBusca) {
    inputBusca.onkeyup = function() {
      clearTimeout(timeoutBusca);
      timeoutBusca = setTimeout(aplicarFiltros, 300);
    };
  }
  if (selectCategoria) selectCategoria.onchange = aplicarFiltros;
  if (checkFalta) checkFalta.onchange = aplicarFiltros;

  // 3. Carrega dados locais
  if (window.produtos) {
    listaGlobal = window.produtos.map(p => ({
      ...p,
      falta: false, data: "", qtdAtual: "", qtdRepor: ""
    }));
    renderizar(listaGlobal);
  } else {
    document.getElementById('lista-produtos').innerHTML = "Erro: window.produtos não encontrado.";
  }

  // 4. Conecta na Nuvem
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
      
      // Só atualiza se o usuário não estiver digitando
      if (document.activeElement !== document.getElementById('busca')) {
        aplicarFiltros(); 
      }
    }
  });
}

// --- RENDERIZAÇÃO ---
function renderizar(lista) {
  const container = document.getElementById('lista-produtos');
  container.innerHTML = '';

  if (!lista || lista.length === 0) {
    container.innerHTML = '<div style="padding:20px; text-align:center; color:#666;">Nenhum produto encontrado nesta categoria.</div>';
    return;
  }

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

// --- FILTRO (A Lógica Corrigida) ---
window.aplicarFiltros = function() {
  const inputBusca = document.getElementById('busca');
  const selectCategoria = document.getElementById('filtro-categoria');
  const checkFalta = document.getElementById('filtro-falta');

  const termo = normalizarTexto(inputBusca.value);
  const categoriaSelecionada = selectCategoria.value.trim(); // Remove espaços extras
  const soFalta = checkFalta.checked;

  const filtrados = listaGlobal.filter(p => {
    const nomeNormalizado = normalizarTexto(p.nome);
    
    // Compara a categoria do arquivo com a selecionada (Ignora espaços)
    const categoriaProduto = p.categoria.trim();
    
    const matchNome = nomeNormalizado.includes(termo);
    const matchCat = categoriaSelecionada === "" || categoriaProduto === categoriaSelecionada;
    const matchFalta = !soFalta || (soFalta && p.falta);
    
    return matchNome && matchCat && matchFalta;
  });

  renderizar(filtrados);
};
