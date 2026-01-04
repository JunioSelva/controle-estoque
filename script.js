window.onload = function() {
  console.log("CARREGOU A VERSÃO NOVA BLINDADA"); // Abra o console (F12) e veja se essa mensagem aparece
  
  // ... resto do código de inicialização igual ...
  const inputBusca = document.getElementById('busca');
  const selectCategoria = document.getElementById('filtro-categoria');
  const checkFalta = document.getElementById('filtro-falta');
  const container = document.getElementById('lista-produtos');

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
    renderizar(listaGlobal);
  } else {
    if(container) container.innerHTML = "<div style='padding:20px; text-align:center'>Erro: Lista vazia.</div>";
  }

  iniciarConexaoNuvem();
};

// ... Mantenha as funções firebaseConfig, iniciarConexaoNuvem, gerarId, normalizarTexto, etc ...

// A FUNÇÃO RENDERIZAR É A CHAVE. VERIFIQUE SE A SUA ESTÁ ASSIM:
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
    
    // ID SEGURO (Sem aspas, sem espaços)
    const idSeguro = gerarId(produto.nome);

    if (produto.falta) {
      div.style.borderLeftColor = "red";
      div.style.backgroundColor = "#fff5f5";
    } else {
      div.style.borderLeftColor = "transparent";
      div.style.backgroundColor = "#fff";
    }

    // NOTE O USO DE this.dataset.id ABAIXO.
    // SE O SEU CÓDIGO TIVER aspas simples aqui dentro dos parenteses, ESTÁ ERRADO.
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
