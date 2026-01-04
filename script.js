window.onerror = function(message, source, lineno, colno, error) {
  const container = document.getElementById('lista-produtos');
  if (container) {
    container.innerHTML = `
      <div style="background:red; color:white; padding:15px; border-radius:5px; margin: 20px;">
        <h3>Ocorreu um erro!</h3>
        <p><b>Mensagem:</b> ${message}</p>
        <p><b>Linha:</b> ${lineno}</p>
        <p>Tire um print e mande para corrigir.</p>
      </div>
    `;
  }
  return false;
};

// --- CONFIGURAÇÃO FIREBASE ---
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
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    window.db = firebase.database();
  } else {
    console.warn("Firebase não carregado ainda.");
  }
} catch (e) {
  console.error(e);
}

// Variáveis Globais
let listaGlobal = [];
let timeoutBusca = null;

// --- FUNÇÕES DE AJUDA ---
function normalizarTexto(texto) {
  if (!texto) return "";
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function gerarId(nome) {
  return nome.replace(/[^a-zA-Z0-9]/g, '_');
}

window.aplicarMascaraData = function(input) {
  let valor = input.value.replace(/\D/g, "");
  if (valor.length > 2) {
    valor = valor.replace(/^(\d{2})(\d)/, "$1/$2");
  }
  if (valor.length > 5) {
    valor = valor.substring(0, 5);
  }
  input.value = valor;
};

// --- FUNÇÕES PRINCIPAIS (AGORA DEFINIDAS ANTES DO USO) ---

// 1. Renderizar
function renderizar(lista) {
  const container = document.getElementById('lista-produtos');
  if(!container) return;
  
  container.innerHTML = '';

  if (!lista || lista.length === 0) {
    container.innerHTML = '<div style="padding:20px; text-align:center; color:#666;">Nenhum produto encontrado.</div>';
    return;
  }

  const fragmento = document.createDocumentFragment();

  lista.forEach((produto) => {
    const div = document.createElement('div');
    div.className = 'produto';
    
    // ID Seguro
    const idSeguro = gerarId(produto.nome);

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
          <input type="tel" class="input-pequeno" placeholder="dd/mm" maxlength="5"
            value="${produto.data}" 
            data-id="${idSeguro}"
            oninput="aplicarMascaraData(this)"
            onchange="salvarDado(this.dataset.id, 'data', this.value)">
        </div>

        <div class="input-group">
          <label>Qtd Atual</label>
          <input type="tel" class="input-pequeno" placeholder="0" 
            value="${produto.qtdAtual}" 
            data-id="${idSeguro}"
            onchange="salvarDado(this.dataset.id, 'qtdAtual', this.value)">
        </div>

        <div class="input-group">
          <label>Repor</label>
          <input type="tel" class="input-pequeno" placeholder="0" 
            value="${produto.qtdRepor}" 
            data-id="${idSeguro}"
            onchange="salvarDado(this.dataset.id, 'qtdRepor', this.value)">
        </div>
      </div>

      <label class="falta-label">
        <input type="checkbox" 
          ${produto.falta ? 'checked' : ''} 
          data-id="${idSeguro}"
          onchange="salvarFalta(this.dataset.id, this.checked)">
        Falta
      </label>
    `;
    fragmento.appendChild(div);
  });

  container.appendChild(fragmento);
}

// 2. Salvar
window.salvarDado = function(idProduto, campo, valor) {
  if(window.db && idProduto) {
    window.db.ref('estoque/' + idProduto + '/' + campo).set(valor);
  }
};

window.salvarFalta = function(idProduto, isChecked) {
  if(window.db && idProduto) {
    window.db.ref('estoque/' + idProduto + '/falta').set(isChecked);
  }
};

// 3. Filtrar
window.aplicarFiltros = function() {
  const inputBusca = document.getElementById('busca');
  const selectCategoria = document.getElementById('filtro-categoria');
  const checkFalta = document.getElementById('filtro-falta');

  if(!inputBusca || !selectCategoria || !checkFalta) return;

  const termo = normalizarTexto(inputBusca.value);
  const categoriaSelecionada = selectCategoria.value.trim();
  const soFalta = checkFalta.checked;

  const filtrados = listaGlobal.filter(p => {
    const nomeNormalizado = normalizarTexto(p.nome);
    const categoriaProduto = p.categoria.trim();
    
    const matchNome = nomeNormalizado.includes(termo);
    const matchCat = categoriaSelecionada === "" || categoriaProduto === categoriaSelecionada;
    const matchFalta = !soFalta || (soFalta && p.falta);
    
    return matchNome && matchCat && matchFalta;
  });

  renderizar(filtrados);
};

function iniciarConexaoNuvem() {
  if (!window.db) return;

  window.db.ref('estoque').on('value', (snapshot) => {
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
      
      const buscaElem = document.getElementById('busca');
      if (document.activeElement !== buscaElem) {
        aplicarFiltros(); 
      }
    }
  });
}

// --- INICIALIZAÇÃO (MOVIDO PARA O FINAL) ---
window.onload = function() {
  console.log("SISTEMA CARREGADO - V6 ORDENADA");
  
  const inputBusca = document.getElementById('busca');
  const selectCategoria = document.getElementById('filtro-categoria');
  const checkFalta = document.getElementById('filtro-falta');
  const container = document.getElementById('lista-produtos');

  // Agora as funções JÁ EXISTEM, então podemos usá-las
  if (inputBusca) {
    inputBusca.onkeyup = function() {
      clearTimeout(timeoutBusca);
      timeoutBusca = setTimeout(aplicarFiltros, 300);
    };
  }
  if (selectCategoria) selectCategoria.onchange = aplicarFiltros;
  if (checkFalta) checkFalta.onchange = aplicarFiltros;

  if (window.produtos && window.produtos.length > 0) {
    listaGlobal = window.produtos.map(p => ({
      ...p,
      falta: false, data: "", qtdAtual: "", qtdRepor: ""
    }));
    // Renderiza a primeira vez
    renderizar(listaGlobal);
  } else {
    if(container) container.innerHTML = "<div style='padding:20px; text-align:center'>Erro: Lista vazia.</div>";
  }

  iniciarConexaoNuvem();
};
