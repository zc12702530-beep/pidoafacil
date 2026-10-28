let doacoes = JSON.parse(localStorage.getItem("doacoes") || "[]");

const form = document.getElementById("formDoacao");
const tabela = document.getElementById("tabelaDoacoes");
const anonimoCheck = document.getElementById("anonimo");

anonimoCheck.addEventListener("change", () => {
    document.getElementById("campos-nome").style.display = anonimoCheck.checked? "none" : "block";
    document.getElementById("nome").required =!anonimoCheck.checked;
    document.getElementById("email").required =!anonimoCheck.checked;
});

//--- API correios ---
async function buscarCEP() {
    let cep = document.getElementById("cep").value.replace(/\D/g, '');
    const status = document.getElementById("cep-status");

    if (cep.length !== 8) {
        status.textContent = "CEP deve ter 8 dígitos";
        status.style.color = "red";
        return;
    }
    status.textContent = "Buscando CEP...";
    status.style.color = "#665";

    try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();

        if (data.erro) {
            status.textContent = "CEP não encontrado";
            status.style.color = "red";
            return;
        }

        //--- preenchimento automático ---
        document.getElementById("logradouro").value = data.logradouro;
        document.getElementById("bairro").value = data.bairro;
        document.getElementById("cidade").value = data.localidade;
        document.getElementById("estado").value = data.uf;

        status.textContent = `${data.localidade}/${data.uf} encontrado`;
        status.style.color = "green";

        document.getElementById("numero").focus();

    }   catch (e) {
        status.textContent = "Erro ao buscar CEP";
        status.style.color = "red";
    }
}

//--- máscara cep ---
document.getElementById("cep")?.addEventListener("input", (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0,8);
    if(v.length >5) v = v.slice(0,5) + "-" + v.slice(5);
    e.target.value = v;
});

form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nova = {
        id: Date.now(),
        data: new Date().toLocaleString("pt-BR"),
        nome: anonimoCheck.checked? "Anônimo" : document.getElementById("nome").value,
        email: anonimoCheck.checked? "-" : document.getElementById("email").value,
        cep: document.getElementById("cep").value,
        logradouro: document.getElementById("logradouro").value,
        numero: document.getElementById("numero").value,
        bairro: document.getElementById("bairro").value,
        complemento: document.getElementById("complemento").value,
        cidade: document.getElementById("cidade").value,
        estado: document.getElementById("estado").value,
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
        d.nome.toLowerCase().includes(filtro) || 
        d.tipo.toLowerCase().includes(filtro) ||
        (d.cidade && d.cidade.toLowerCase().includes(filtro))
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
          <td>${d.cidade || "-"} ${d.estado || "-"}</td>
          <td>${d.logradouro || "-"}  ${d.numero || ""} ${d.bairro || ""}</td>
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
    const conteudo = `RECIBO DE DOAÇÃO - DoaFácil\n\nDoador: ${d.nome}\nData: ${d.data}\nTipo: ${d.tipo}\nValor: ${d.valor}\nForma: ${d.pagamento}\nEndereço: ${d.logradouro} ${d.numero} ${d.bairro}\nCidade: ${d.cidade} ${d.estado}\n\nAgradecemos sua generosidade!`;
    const blob = new Blob([conteudo], {type: "text/plain"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `recibo-${d.nome}-${d.id}.txt`; a.click();
}

function exportarCSV() {
    if(doacoes.length === 0) return alert("Sem dados para exportar");
    let csv = "Data,Nome,Email,Logradouro,Numero,Bairro,Cidade,Estado,CEP,Tipo,Valor,Pagamento,Mensagem\n";
    doacoes.forEach(d => {
        csv += `"${d.data}","${d.nome}","${d.email}",${d.logradouro},${d.numero},${d.bairro},${d.cidade},${d.estado},${d.cep},"${d.tipo}","${d.valor}","${d.pagamento}","${d.mensagem}"\n`;
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

function toggleContraste(){
    const ativado = document.body.classList.toggle("alto-contraste");
    const btn = document.getElementById("btn-acessibilidade");

    localStorage.setItem("alto-contraste", ativado ? "sim" : "nao");

    if(ativado){
        btn.textContent = "Normal";
        btn.setAttribute("aria-label", "Desativar alto contraste");
    }   else{
        btn.textContent = "Alto Contraste";
        btn.setAttribute("aria-label", "Ativar alto contraste");
    }
}

(function(){
    if(localStorage.getItem("altoContraste") === "sim"){
        document.body.classList.add("alto-contraste");
        const btn = document.getElementById("btn-acessibilidade");
        if(btn) btn.textContent = "Normal";
    }
})();

document.addEventListener("keydown", (e)=>{
    if(e.altKey && e.key.toLowerCase() === "c"){
        e.preventDefault();
        toggleContraste();
    }
});