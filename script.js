let doacoes = JSON.parse(localStorage.getItem("doacoes") || "[]");

const form = document.getElementById("formDoacao");
const tabela = document.getElementById("tabelaDoacoes");
const anonimoCheck = document.getElementById("anonimo");

anonimoCheck.addEventListener("change", () => {
    document.getElementById("campos-nome").style.display = anonimoCheck.checked? "none" : "block";
    document.getElementById("nome").required =!anonimoCheck.checked;
    document.getElementById("email").required =!anonimoCheck.checked;
});

form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nova = {
        id: Date.now(),
        data: new Date().toLocaleString("pt-BR"),
        nome: anonimoCheck.checked? "Anônimo" : document.getElementById("nome").value,
        email: anonimoCheck.checked? "-" : document.getElementById("email").value,
        tipo: document.getElementById("tipo").value,
        valor: document.getElementById("valor").value,
        pagamento: document.getElementById("pagamento").value,
        mensagem: document.getElementById("mensagem").value
    };
    doacoes.unshift(nova);
    localStorage.setItem("doacoes", JSON.stringify(doacoes));

    alert(`Obrigado, ${nova.nome}! Doação registrada com sucesso.`);

    if(nova.pagamento === "PIX") document.getElementById("pix-area").classList.remove("hidden");

    form.reset();
    document.getElementById("campos-nome").style.display = "block";
});

function renderTabela() {
    const filtro = document.getElementById("filtro")?.value.toLowerCase() || "";
    const filtradas = doacoes.filter(d =>
        d.nome.toLowerCase().includes(filtro) || d.tipo.toLowerCase().includes(filtro)
    );

    let totalDinheiro = 0;
    filtradas.forEach(d => {
        const v = parseFloat(d.valor.replace("R$","").replace(",",".").trim());
        if(!isNaN(v) && d.tipo === "Dinheiro") totalDinheiro += v;
    });

    document.getElementById("total-geral").textContent = totalDinheiro.toLocaleString("pt-BR", {style:"currency", currency:"BRL"});
    document.getElementById("total-itens").textContent = filtradas.length;

    tabela.innerHTML = filtradas.map(d => `
        <tr>
          <td>${d.data}</td>
          <td>${d.nome}</td>
          <td>${d.tipo}</td>
          <td>${d.valor}</td>
          <td>${d.pagamento}</td>
          <td><button onclick="gerarRecibo(${d.id})">PDF</button></td>
        </tr>
    `).join("") || `<tr><td colspan="6" style="text-align:center">Nenhuma doação ainda</td></tr>`;
}

function mostrarAba(aba) {
    document.getElementById("aba-doar").classList.toggle("hidden", aba!== "doar");
    document.getElementById("aba-gestor").classList.toggle("hidden", aba!== "gestor");
    document.getElementById("btn-doar").classList.toggle("active", aba === "doar");
    document.getElementById("btn-gestor").classList.toggle("active", aba === "gestor");
    if(aba === "gestor") renderTabela();
}

function gerarRecibo(id) {
    const d = doacoes.find(x => x.id === id);
    const conteudo = `RECIBO DE DOAÇÃO - DoaFácil\n\nDoador: ${d.nome}\nData: ${d.data}\nTipo: ${d.tipo}\nValor: ${d.valor}\nForma: ${d.pagamento}\n\nAgradecemos sua generosidade!`;
    const blob = new Blob([conteudo], {type: "text/plain"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `recibo-${d.nome}-${d.id}.txt`; a.click();
}

function exportarCSV() {
    if(doacoes.length === 0) return alert("Sem dados para exportar");
    let csv = "Data,Nome,Email,Tipo,Valor,Pagamento,Mensagem\n";
    doacoes.forEach(d => {
        csv += `"${d.data}","${d.nome}","${d.email}","${d.tipo}","${d.valor}","${d.pagamento}","${d.mensagem}"\n`;
    });
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "relatorio_doacoes.csv"; a.click();
}

function limparTudo() {
    if(confirm("Apagar todas as doações?")) {
        doacoes = [];
        localStorage.removeItem("doacoes");
        renderTabela();
    }
}

document.getElementById("filtro")?.addEventListener("input", renderTabela);
renderTabela();