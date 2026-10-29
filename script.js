// BANCO DE DADOS
let db;
function abrirBanco(){
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open("DoaFacilDB", 1);
    req.onupgradeneeded = e=>{
      const banco = e.target.result;
      const store = banco.createObjectStore("doacoes", {keyPath: "id"});
      store.createIndex("cidade", "cidade", {unique:false});
      store.createIndex("tipo", "tipo", {unique:false});
    };
    req.onsuccess = ()=>{ db = req.result; resolve(db); };
    req.onerror = ()=> reject(req.error);
  });
}
async function salvarBD(doacao){
  await abrirBanco();
  return new Promise((res,rej)=>{
    const tx = db.transaction("doacoes","readwrite");
    tx.objectStore("doacoes").add(doacao);
    tx.oncomplete = ()=> res(); tx.onerror = ()=> rej(tx.error);
  });
}
async function listarBD(){
  await abrirBanco();
  return new Promise(res=>{
    const tx = db.transaction("doacoes","readonly");
    const req = tx.objectStore("doacoes").getAll();
    req.onsuccess = ()=> res(req.result.reverse());
  });
}
async function limparBD(){
  await abrirBanco();
  const tx = db.transaction("doacoes","readwrite");
  tx.objectStore("doacoes").clear();
}

const anonimoCheck = document.getElementById("anonimo");

anonimoCheck.addEventListener("change", () => {
  document.getElementById("campos-nome").style.display = anonimoCheck.checked ? "none" : "block";
  document.getElementById("nome").required = !anonimoCheck.checked;
  document.getElementById("email").required = !anonimoCheck.checked;
});

// CEP - API CORREIOS
async function buscarCEP(){
  let cep = document.getElementById("cep").value.replace(/\D/g,'');
  const status = document.getElementById("cep-status");
  if(cep.length !== 8){ status.textContent = "CEP precisa 8 dígitos"; return; }
  status.textContent = "Buscando CEP...";
  try{
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();
    if(data.erro) throw 0;
    document.getElementById("logradouro").value = data.logradouro;
    document.getElementById("bairro").value = data.bairro;
    document.getElementById("cidade").value = data.localidade;
    document.getElementById("estado").value = data.uf;
    status.textContent = "✓ " + data.localidade + "/" + data.uf;
    status.style.color = "green";
    document.getElementById("numero").focus();
  }catch{ status.textContent = "CEP não encontrado"; status.style.color="red"; }
}
document.getElementById("cep")?.addEventListener("input", e=>{
  let v = e.target.value.replace(/\D/g,'').slice(0,8);
  if(v.length > 5) v = v.slice(0,5) + "-" + v.slice(5);
  e.target.value = v;
});

// FORMULÁRIO
const form = document.getElementById("formDoacao");
form.addEventListener("submit", async e=>{
  e.preventDefault();
  const nova = {
    id: Date.now(),
    data: new Date().toLocaleString("pt-BR"),
    nome: document.getElementById("anonimo").checked ? "Anônimo" : document.getElementById("nome").value,
    email: document.getElementById("email").value,
    cep: document.getElementById("cep").value,
    logradouro: document.getElementById("logradouro").value,
    numero: document.getElementById("numero").value,
    bairro: document.getElementById("bairro").value,
    cidade: document.getElementById("cidade").value,
    estado: document.getElementById("estado").value,
    complemento: document.getElementById("complemento").value,
    tipo: document.getElementById("tipo").value,
    valor: document.getElementById("valor").value,
    pagamento: document.getElementById("pagamento").value,
    mensagem: document.getElementById("mensagem").value
  };
  await salvarBD(nova);
  alert("Doação cadastrada!");
  if(nova.pagamento === "PIX") document.getElementById("pix-area").classList.remove("hidden");
  form.reset();
  document.getElementById("cep-status").textContent = "";
  renderTabela();
});

async function renderTabela(){
  const doacoes = await listarBD();
  const filtro = document.getElementById("filtro")?.value.toLowerCase() || "";
  const filtradas = doacoes.filter(d=> 
    d.nome.toLowerCase().includes(filtro) || (d.cidade||"").toLowerCase().includes(filtro) || d.tipo.toLowerCase().includes(filtro)
  );
  let total = 0;
  filtradas.forEach(d=>{
    const v = parseFloat(d.valor.replace("R$","").replace(",",".").trim());
    if(!isNaN(v) && d.tipo === "Dinheiro") total += v;
  });
  document.getElementById("total-geral").textContent = total.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  document.getElementById("total-itens").textContent = filtradas.length;
  document.getElementById("tabelaDoacoes").innerHTML = filtradas.map(d=>`
    <tr>
      <td>${d.data}</td><td>${d.nome}</td><td>${d.tipo}</td>
      <td>${d.valor}</td><td>${d.cidade}/${d.estado}</td>
      <td>${d.logradouro} ${d.numero}, ${d.bairro}</td>
      <td><button onclick="gerarRecibo(${d.id})">PDF</button></td>
    </tr>
  `).join("") || `<tr><td colspan="7" style="text-align:center">Nenhuma doação no banco</td></tr>`;
}

function mostrarAba(aba){
  document.getElementById("aba-doar").classList.toggle("hidden", aba!=="doar");
  document.getElementById("aba-gestor").classList.toggle("hidden", aba!=="gestor");
  document.getElementById("btn-doar").classList.toggle("active", aba==="doar");
  document.getElementById("btn-gestor").classList.toggle("active", aba==="gestor");
  if(aba==="gestor") renderTabela();
}

async function gerarRecibo(id){
  const lista = await listarBD();
  const d = lista.find(x=> x.id === id);
  const endereco = `${d.logradouro}, ${d.numero} - ${d.bairro}, ${d.cidade}/${d.estado} CEP:${d.cep}`;
  const conteudo = `RECIBO - DoaFácil\nDoador: ${d.nome}\nData: ${d.data}\nTipo: ${d.tipo}\nValor: ${d.valor}\nEndereço: ${endereco}\nObrigado!`;
  const blob = new Blob([conteudo],{type:"text/plain"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `recibo-${d.id}.txt`; a.click();
}

async function exportarCSV(){
  const lista = await listarBD();
  if(lista.length===0) return alert("Banco vazio");
  let csv = "Data,Nome,Email,CEP,Logradouro,Numero,Bairro,Cidade,Estado,Tipo,Valor,Pagamento\n";
  lista.forEach(d=> csv += `"${d.data}","${d.nome}","${d.email}","${d.cep}","${d.logradouro}","${d.numero}","${d.bairro}","${d.cidade}","${d.estado}","${d.tipo}","${d.valor}","${d.pagamento}"\n`);
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="relatorio_banco.csv"; a.click();
}

async function limparTudo(){
  if(confirm("Limpar todas as doações?")){
    await limparBD(); renderTabela();
  }
}

function toggleContraste(){
  const ativo = document.body.classList.toggle("alto-contraste");
  localStorage.setItem("altoContraste", ativo?"sim":"nao");
  document.getElementById("btn-acessibilidade").textContent = ativo ? "Normal" : "Alto Contraste";
}
if(localStorage.getItem("altoContraste")==="sim"){
  document.body.classList.add("alto-contraste");
  document.addEventListener("DOMContentLoaded", ()=> {
    const b = document.getElementById("btn-acessibilidade");
    if(b) b.textContent = "☀️ Normal";
  });
}

document.getElementById("filtro")?.addEventListener("input", renderTabela);
abrirBanco().then(renderTabela);